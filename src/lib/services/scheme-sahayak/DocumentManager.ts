/**
 * Smart Document Manager Service
 * Handles document upload, processing, verification, and management
 * 
 * Features:
 * - Secure file upload with encryption
 * - Google Cloud Storage integration
 * - File type validation and size limits
 * - OCR and document processing
 * - Document verification with government databases
 * - Missing document analysis
 */

import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import crypto from 'crypto';
import { IDocumentManager } from './interfaces';
import {
  DocumentInfo,
  DocumentIssue,
  DocumentStatus,
  ArtisanProfile,
  GovernmentScheme,
  DocumentUploadResult,
  DocumentVerificationResult,
  DocumentStatusSummary,
  MissingDocumentReport,
  SCHEME_SAHAYAK_COLLECTIONS
} from '../../types/scheme-sahayak';
import { adminDb } from '@/lib/firebase-admin';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const DOCUMENT_TYPES = {
  AADHAAR: 'aadhaar',
  PAN: 'pan',
  BUSINESS_REGISTRATION: 'business_registration',
  INCOME_CERTIFICATE: 'income_certificate',
  CASTE_CERTIFICATE: 'caste_certificate',
  BANK_STATEMENT: 'bank_statement',
  ADDRESS_PROOF: 'address_proof',
  PHOTO: 'photo',
  OTHER: 'other'
} as const;

export class DocumentManager implements IDocumentManager {
  private storage: Storage;
  private visionClient: ImageAnnotatorClient;
  private bucketName: string;
  private encryptionKey: Buffer;

  constructor() {
    // Initialize Google Cloud Storage
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Initialize Google Cloud Vision API
    this.visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.bucketName = process.env.GCS_BUCKET_NAME || 'scheme-sahayak-documents';
    
    // Initialize encryption key from environment or generate one
    const keyString = process.env.DOCUMENT_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyString, 'hex');
  }

  /**
   * Upload and process a document
   * Requirements: 2.1, 9.1, 9.2
   */
  async uploadDocument(
    file: File,
    artisanId: string,
    documentType?: string
  ): Promise<DocumentUploadResult> {
    const startTime = Date.now();

    try {
      // Validate file
      this.validateFile(file);

      // Generate unique document ID
      const documentId = this.generateDocumentId(artisanId);

      // Convert File to Buffer for processing
      let buffer: Buffer;
      if (typeof file.arrayBuffer === 'function') {
        buffer = Buffer.from(await file.arrayBuffer());
      } else {
        // Fallback for environments where arrayBuffer is not available
        buffer = Buffer.from(await file.text());
      }

      // Encrypt file content
      const encryptedBuffer = this.encryptFile(buffer);

      // Upload to Google Cloud Storage
      const storagePath = `${artisanId}/${documentId}`;
      await this.uploadToGCS(storagePath, encryptedBuffer, file.type);

      // Perform OCR if image or PDF
      let extractedText = '';
      let detectedType = documentType || 'other';
      let confidence = 0;
      let ocrConfidence = 0;
      let extractedData: Record<string, any> = {};
      let expiryDate: Date | undefined;

      if (this.isImageOrPDF(file.type)) {
        const ocrResult = await this.performOCR(buffer);
        extractedText = ocrResult.text;
        ocrConfidence = ocrResult.confidence;
        
        // Auto-detect document type if not provided
        if (!documentType) {
          const typeDetection = this.detectDocumentType(extractedText);
          detectedType = typeDetection.type;
          confidence = typeDetection.confidence;
          extractedData = typeDetection.extractedData || {};
        } else {
          confidence = 0.95; // High confidence when user specifies type
          const typeDetection = this.detectDocumentType(extractedText);
          extractedData = typeDetection.extractedData || {};
        }
        
        // Extract expiry date
        expiryDate = this.extractExpiryDate(extractedText, detectedType);
      }

      // Assess document quality with enhanced checks
      const qualityAssessment = await this.assessDocumentQuality(
        buffer, 
        file.type, 
        extractedText,
        ocrConfidence
      );

      // Store document metadata in Firestore
      const documentInfo: DocumentInfo = {
        id: documentId,
        type: detectedType,
        filename: file.name,
        uploadDate: new Date(),
        status: qualityAssessment.score >= 70 ? 'uploaded' : 'needs_review',
        qualityScore: qualityAssessment.score,
        expiryDate,
        extractedData: {
          text: extractedText,
          fileSize: file.size,
          mimeType: file.type,
          storagePath,
          ocrConfidence,
          ...extractedData
        }
      };

      await this.saveDocumentMetadata(artisanId, documentInfo);

      const processingTime = Date.now() - startTime;

      return {
        documentId,
        extractedText,
        detectedType,
        confidence,
        qualityScore: qualityAssessment.score,
        issues: qualityAssessment.issues,
        processingTime,
        suggestions: qualityAssessment.suggestions,
        expiryDate,
        extractedData
      };
    } catch (error) {
      throw this.handleError(error, 'uploadDocument');
    }
  }

  /**
   * Verify document authenticity and validity
   * Requirements: 2.2, 2.3 - Document verification and expiry detection
   */
  async verifyDocument(
    documentId: string,
    verificationType: 'auto' | 'manual'
  ): Promise<DocumentVerificationResult> {
    try {
      // Find the document across all artisan profiles
      const documentData = await this.findDocumentById(documentId);
      
      if (!documentData) {
        throw new Error('Document not found');
      }

      const { artisanId, document } = documentData;
      
      // Check if document has already been verified
      if (document.status === 'verified' && document.verificationResult) {
        return document.verificationResult;
      }

      let verificationResult: DocumentVerificationResult;

      if (verificationType === 'auto') {
        // Perform automatic verification
        verificationResult = await this.performAutomaticVerification(document, artisanId);
      } else {
        // Manual verification - mark as pending manual review
        verificationResult = {
          isValid: false,
          verificationMethod: 'manual_review',
          confidence: 0,
          verificationDetails: {
            issuer: 'Pending Manual Review',
            issueDate: new Date(),
            documentNumber: document.extractedData?.documentNumber || 'Unknown'
          },
          status: 'pending',
          recommendations: ['Document queued for manual review by verification team']
        };
      }

      // Update document with verification result
      await this.updateDocumentVerificationStatus(
        artisanId,
        documentId,
        verificationResult
      );

      // If document is verified and has expiry date, schedule reminder
      if (verificationResult.isValid && document.expiryDate) {
        await this.scheduleExpiryReminder(artisanId, documentId, document.expiryDate);
      }

      return verificationResult;
    } catch (error) {
      throw this.handleError(error, 'verifyDocument');
    }
  }

  /**
   * Get comprehensive document status for an artisan
   */
  async getDocumentStatus(artisanId: string): Promise<DocumentStatusSummary> {
    try {
      const profile = await this.getArtisanProfile(artisanId);
      
      if (!profile) {
        throw new Error('Artisan profile not found');
      }

      const documents = profile.documents || {};
      const documentEntries = Object.values(documents);

      const totalDocuments = documentEntries.length;
      const verified = documentEntries.filter(d => d.status === 'verified').length;
      const pending = documentEntries.filter(d => d.status === 'processing' || d.status === 'uploaded').length;
      const expired = documentEntries.filter(d => d.status === 'expired').length;

      // Calculate missing documents based on common requirements
      const requiredDocTypes = Object.values(DOCUMENT_TYPES);
      const existingTypes = documentEntries.map(d => d.type);
      const missing = requiredDocTypes.filter(type => !existingTypes.includes(type)).length;

      // Calculate overall completeness
      const overallCompleteness = Math.round(
        ((verified + pending) / (totalDocuments + missing)) * 100
      );

      // Build document status by type
      const documentsByType: Record<string, DocumentStatus> = {};
      
      for (const docType of requiredDocTypes) {
        const doc = documentEntries.find(d => d.type === docType);
        documentsByType[docType] = {
          type: docType,
          required: true,
          status: doc ? (doc.status as any) : 'missing',
          lastUpdated: doc?.uploadDate,
          expiryDate: doc?.expiryDate
        };
      }

      // Generate next actions
      const nextActions: string[] = [];
      if (missing > 0) {
        nextActions.push(`Upload ${missing} missing document(s)`);
      }
      if (pending > 0) {
        nextActions.push(`${pending} document(s) pending verification`);
      }
      if (expired > 0) {
        nextActions.push(`Renew ${expired} expired document(s)`);
      }

      return {
        totalDocuments,
        verified,
        pending,
        expired,
        missing,
        overallCompleteness,
        documentsByType,
        nextActions
      };
    } catch (error) {
      throw this.handleError(error, 'getDocumentStatus');
    }
  }

  /**
   * Generate report of missing documents for specific schemes
   * Requirement: 2.4 - Identify missing documents with 95% accuracy
   */
  async generateMissingDocumentReport(
    artisanId: string,
    schemeIds: string[]
  ): Promise<MissingDocumentReport> {
    try {
      // Get artisan profile with current documents
      const profile = await this.getArtisanProfile(artisanId);
      
      if (!profile) {
        throw new Error('Artisan profile not found');
      }

      // Get all schemes
      const schemes = await this.getSchemesByIds(schemeIds);
      
      if (schemes.length === 0) {
        throw new Error('No schemes found for the provided IDs');
      }

      // Build document requirement mapping
      const documentRequirements = this.buildDocumentRequirementMapping(schemes, profile);
      
      // Identify missing documents
      const missingDocuments = this.identifyMissingDocuments(
        profile.documents || {},
        documentRequirements
      );
      
      // Calculate completion percentage
      const totalRequired = Object.keys(documentRequirements).length;
      const totalMissing = missingDocuments.length;
      const completionPercentage = totalRequired > 0 
        ? Math.round(((totalRequired - totalMissing) / totalRequired) * 100)
        : 100;
      
      // Estimate time to complete
      const estimatedTimeToComplete = this.estimateCompletionTime(missingDocuments);
      
      return {
        artisanId,
        schemes: schemeIds,
        missingDocuments,
        completionPercentage,
        estimatedTimeToComplete
      };
    } catch (error) {
      throw this.handleError(error, 'generateMissingDocumentReport');
    }
  }

  /**
   * Schedule expiry reminders for documents
   * Requirement: 2.3 - Send renewal reminders 30 days before expiration
   */
  async scheduleExpiryReminders(artisanId: string): Promise<void> {
    try {
      const profile = await this.getArtisanProfile(artisanId);
      
      if (!profile || !profile.documents) {
        return;
      }

      const documents = Object.values(profile.documents);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const document of documents) {
        if (document.expiryDate) {
          const expiryDate = new Date(document.expiryDate);
          
          // Schedule reminder if document expires within 30 days
          if (expiryDate > now && expiryDate <= thirtyDaysFromNow) {
            await this.scheduleExpiryReminder(artisanId, document.id, expiryDate);
          }
          
          // Check if document is already expired
          if (expiryDate <= now && document.status !== 'expired') {
            await this.markDocumentAsExpired(artisanId, document.id);
          }
        }
      }
    } catch (error) {
      throw this.handleError(error, 'scheduleExpiryReminders');
    }
  }

  /**
   * Delete a document and its associated data
   */
  async deleteDocument(documentId: string, artisanId: string): Promise<void> {
    try {
      // Delete from Google Cloud Storage
      const storagePath = `${artisanId}/${documentId}`;
      await this.deleteFromGCS(storagePath);

      // Remove from Firestore
      const profile = await this.getArtisanProfile(artisanId);
      if (profile && profile.documents) {
        delete profile.documents[documentId];
        await this.updateArtisanProfile(artisanId, { documents: profile.documents });
      }
    } catch (error) {
      throw this.handleError(error, 'deleteDocument');
    }
  }

  /**
   * Get document download URL
   */
  async getDocumentUrl(documentId: string, artisanId: string): Promise<string> {
    try {
      const storagePath = `${artisanId}/${documentId}`;
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storagePath);

      // Generate signed URL valid for 1 hour
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });

      return url;
    } catch (error) {
      throw this.handleError(error, 'getDocumentUrl');
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // This will be implemented when we have the artisanId context
      // For now, we'll need to search for the document
      throw new Error('Not fully implemented - requires artisanId context');
    } catch (error) {
      throw this.handleError(error, 'updateDocumentMetadata');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - MISSING DOCUMENT ANALYSIS
  // ============================================================================

  /**
   * Build comprehensive document requirement mapping for schemes
   * Maps document types to schemes that require them
   */
  private buildDocumentRequirementMapping(
    schemes: GovernmentScheme[],
    profile: ArtisanProfile
  ): Record<string, {
    requiredFor: string[];
    priority: 'high' | 'medium' | 'low';
    description: string;
    whereToObtain: string;
    alternativeDocuments?: string[];
  }> {
    const requirementMap: Record<string, {
      requiredFor: string[];
      priority: 'high' | 'medium' | 'low';
      description: string;
      whereToObtain: string;
      alternativeDocuments?: string[];
    }> = {};

    // Standard document requirements based on scheme categories
    const standardRequirements = this.getStandardDocumentRequirements();
    
    for (const scheme of schemes) {
      // Get required documents from scheme application
      const requiredDocs = scheme.application?.requiredDocuments || [];
      
      // Add scheme-specific requirements
      for (const docType of requiredDocs) {
        const normalizedType = this.normalizeDocumentType(docType);
        
        if (!requirementMap[normalizedType]) {
          const docInfo = this.getDocumentInfo(normalizedType, scheme.category);
          requirementMap[normalizedType] = {
            requiredFor: [scheme.title],
            priority: this.calculateDocumentPriority(normalizedType, scheme),
            description: docInfo.description,
            whereToObtain: docInfo.whereToObtain,
            alternativeDocuments: docInfo.alternatives
          };
        } else {
          requirementMap[normalizedType].requiredFor.push(scheme.title);
          // Update priority if this scheme has higher priority
          const newPriority = this.calculateDocumentPriority(normalizedType, scheme);
          if (this.isPriorityHigher(newPriority, requirementMap[normalizedType].priority)) {
            requirementMap[normalizedType].priority = newPriority;
          }
        }
      }
      
      // Add category-based standard requirements
      const categoryRequirements = standardRequirements[scheme.category] || [];
      for (const docType of categoryRequirements) {
        const normalizedType = this.normalizeDocumentType(docType);
        
        if (!requirementMap[normalizedType]) {
          const docInfo = this.getDocumentInfo(normalizedType, scheme.category);
          requirementMap[normalizedType] = {
            requiredFor: [scheme.title],
            priority: 'medium',
            description: docInfo.description,
            whereToObtain: docInfo.whereToObtain,
            alternativeDocuments: docInfo.alternatives
          };
        } else if (!requirementMap[normalizedType].requiredFor.includes(scheme.title)) {
          requirementMap[normalizedType].requiredFor.push(scheme.title);
        }
      }
      
      // Add eligibility-based requirements
      const eligibilityDocs = this.getEligibilityBasedDocuments(scheme, profile);
      for (const docType of eligibilityDocs) {
        const normalizedType = this.normalizeDocumentType(docType);
        
        if (!requirementMap[normalizedType]) {
          const docInfo = this.getDocumentInfo(normalizedType, scheme.category);
          requirementMap[normalizedType] = {
            requiredFor: [scheme.title],
            priority: 'high',
            description: docInfo.description,
            whereToObtain: docInfo.whereToObtain,
            alternativeDocuments: docInfo.alternatives
          };
        } else if (!requirementMap[normalizedType].requiredFor.includes(scheme.title)) {
          requirementMap[normalizedType].requiredFor.push(scheme.title);
        }
      }
    }

    return requirementMap;
  }

  /**
   * Get standard document requirements by scheme category
   */
  private getStandardDocumentRequirements(): Record<string, string[]> {
    return {
      loan: [
        DOCUMENT_TYPES.AADHAAR,
        DOCUMENT_TYPES.PAN,
        DOCUMENT_TYPES.BUSINESS_REGISTRATION,
        DOCUMENT_TYPES.BANK_STATEMENT,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.INCOME_CERTIFICATE,
        DOCUMENT_TYPES.PHOTO
      ],
      grant: [
        DOCUMENT_TYPES.AADHAAR,
        DOCUMENT_TYPES.PAN,
        DOCUMENT_TYPES.BUSINESS_REGISTRATION,
        DOCUMENT_TYPES.BANK_STATEMENT,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.PHOTO
      ],
      subsidy: [
        DOCUMENT_TYPES.AADHAAR,
        DOCUMENT_TYPES.PAN,
        DOCUMENT_TYPES.BUSINESS_REGISTRATION,
        DOCUMENT_TYPES.BANK_STATEMENT,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.PHOTO
      ],
      training: [
        DOCUMENT_TYPES.AADHAAR,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.PHOTO
      ],
      insurance: [
        DOCUMENT_TYPES.AADHAAR,
        DOCUMENT_TYPES.PAN,
        DOCUMENT_TYPES.BUSINESS_REGISTRATION,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.PHOTO
      ]
    };
  }

  /**
   * Get eligibility-based document requirements
   */
  private getEligibilityBasedDocuments(
    scheme: GovernmentScheme,
    profile: ArtisanProfile
  ): string[] {
    const docs: string[] = [];
    
    // Check if income verification is needed
    if (scheme.eligibility?.income?.max || scheme.eligibility?.income?.min) {
      docs.push(DOCUMENT_TYPES.INCOME_CERTIFICATE);
    }
    
    // Check if caste certificate might be needed (based on scheme benefits or criteria)
    const eligibilityCriteria = scheme.eligibility?.otherCriteria || [];
    const hasCasteRequirement = eligibilityCriteria.some(criteria => 
      criteria.toLowerCase().includes('sc') ||
      criteria.toLowerCase().includes('st') ||
      criteria.toLowerCase().includes('obc') ||
      criteria.toLowerCase().includes('caste')
    );
    
    if (hasCasteRequirement) {
      docs.push(DOCUMENT_TYPES.CASTE_CERTIFICATE);
    }
    
    return docs;
  }

  /**
   * Normalize document type names to standard types
   */
  private normalizeDocumentType(docType: string): string {
    const lowerType = docType.toLowerCase().trim();
    
    // Map various document name variations to standard types
    const typeMapping: Record<string, string> = {
      'aadhaar': DOCUMENT_TYPES.AADHAAR,
      'aadhar': DOCUMENT_TYPES.AADHAAR,
      'uid': DOCUMENT_TYPES.AADHAAR,
      'aadhaar card': DOCUMENT_TYPES.AADHAAR,
      
      'pan': DOCUMENT_TYPES.PAN,
      'pan card': DOCUMENT_TYPES.PAN,
      'permanent account number': DOCUMENT_TYPES.PAN,
      
      'business registration': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'business_registration': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'gst': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'gstin': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'udyam': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'msme': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'shop act': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      'trade license': DOCUMENT_TYPES.BUSINESS_REGISTRATION,
      
      'income certificate': DOCUMENT_TYPES.INCOME_CERTIFICATE,
      'income_certificate': DOCUMENT_TYPES.INCOME_CERTIFICATE,
      'income proof': DOCUMENT_TYPES.INCOME_CERTIFICATE,
      
      'caste certificate': DOCUMENT_TYPES.CASTE_CERTIFICATE,
      'caste_certificate': DOCUMENT_TYPES.CASTE_CERTIFICATE,
      'sc certificate': DOCUMENT_TYPES.CASTE_CERTIFICATE,
      'st certificate': DOCUMENT_TYPES.CASTE_CERTIFICATE,
      'obc certificate': DOCUMENT_TYPES.CASTE_CERTIFICATE,
      
      'bank statement': DOCUMENT_TYPES.BANK_STATEMENT,
      'bank_statement': DOCUMENT_TYPES.BANK_STATEMENT,
      'bank passbook': DOCUMENT_TYPES.BANK_STATEMENT,
      'cancelled cheque': DOCUMENT_TYPES.BANK_STATEMENT,
      
      'address proof': DOCUMENT_TYPES.ADDRESS_PROOF,
      'address_proof': DOCUMENT_TYPES.ADDRESS_PROOF,
      'residence proof': DOCUMENT_TYPES.ADDRESS_PROOF,
      'domicile': DOCUMENT_TYPES.ADDRESS_PROOF,
      'utility bill': DOCUMENT_TYPES.ADDRESS_PROOF,
      
      'photo': DOCUMENT_TYPES.PHOTO,
      'photograph': DOCUMENT_TYPES.PHOTO,
      'passport photo': DOCUMENT_TYPES.PHOTO,
      'passport size photo': DOCUMENT_TYPES.PHOTO
    };
    
    return typeMapping[lowerType] || DOCUMENT_TYPES.OTHER;
  }

  /**
   * Get detailed information about a document type
   */
  private getDocumentInfo(
    documentType: string,
    schemeCategory: string
  ): {
    description: string;
    whereToObtain: string;
    alternatives: string[];
  } {
    const documentInfoMap: Record<string, {
      description: string;
      whereToObtain: string;
      alternatives: string[];
    }> = {
      [DOCUMENT_TYPES.AADHAAR]: {
        description: 'Aadhaar Card - Government-issued unique identification number',
        whereToObtain: 'UIDAI Enrollment Center or download from uidai.gov.in',
        alternatives: []
      },
      [DOCUMENT_TYPES.PAN]: {
        description: 'PAN Card - Permanent Account Number issued by Income Tax Department',
        whereToObtain: 'Apply online at incometax.gov.in or NSDL/UTIITSL centers',
        alternatives: []
      },
      [DOCUMENT_TYPES.BUSINESS_REGISTRATION]: {
        description: 'Business Registration Certificate (GST/Udyam/MSME/Trade License)',
        whereToObtain: 'Register at udyamregistration.gov.in or gst.gov.in',
        alternatives: ['GST Certificate', 'Udyam Registration', 'MSME Certificate', 'Shop Act License']
      },
      [DOCUMENT_TYPES.INCOME_CERTIFICATE]: {
        description: 'Income Certificate issued by competent authority',
        whereToObtain: 'Apply at Tehsildar/Revenue Office or online state portal',
        alternatives: ['ITR (Income Tax Return)', 'Form 16']
      },
      [DOCUMENT_TYPES.CASTE_CERTIFICATE]: {
        description: 'Caste Certificate (SC/ST/OBC) issued by competent authority',
        whereToObtain: 'Apply at Tehsildar/SDM Office or online state portal',
        alternatives: []
      },
      [DOCUMENT_TYPES.BANK_STATEMENT]: {
        description: 'Bank Statement or Passbook showing last 6 months transactions',
        whereToObtain: 'Download from net banking or request from bank branch',
        alternatives: ['Bank Passbook', 'Cancelled Cheque']
      },
      [DOCUMENT_TYPES.ADDRESS_PROOF]: {
        description: 'Address Proof document (Aadhaar/Voter ID/Utility Bill/Ration Card)',
        whereToObtain: 'Use existing Aadhaar or apply for Voter ID/get utility bill',
        alternatives: ['Aadhaar Card', 'Voter ID', 'Utility Bill', 'Ration Card', 'Driving License']
      },
      [DOCUMENT_TYPES.PHOTO]: {
        description: 'Recent passport-size photograph',
        whereToObtain: 'Get clicked at photo studio or use smartphone camera',
        alternatives: []
      }
    };
    
    return documentInfoMap[documentType] || {
      description: `${documentType} document required for scheme application`,
      whereToObtain: 'Contact scheme office or visit official website for details',
      alternatives: []
    };
  }

  /**
   * Calculate document priority based on scheme and document type
   */
  private calculateDocumentPriority(
    documentType: string,
    scheme: GovernmentScheme
  ): 'high' | 'medium' | 'low' {
    // High priority for identity and business documents
    const highPriorityDocs = [
      DOCUMENT_TYPES.AADHAAR,
      DOCUMENT_TYPES.PAN,
      DOCUMENT_TYPES.BUSINESS_REGISTRATION
    ];
    
    if (highPriorityDocs.includes(documentType)) {
      return 'high';
    }
    
    // High priority if scheme has upcoming deadline
    if (scheme.application?.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(scheme.application.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 30) {
        return 'high';
      } else if (daysUntilDeadline <= 60) {
        return 'medium';
      }
    }
    
    // Medium priority for financial documents
    const mediumPriorityDocs = [
      DOCUMENT_TYPES.BANK_STATEMENT,
      DOCUMENT_TYPES.INCOME_CERTIFICATE
    ];
    
    if (mediumPriorityDocs.includes(documentType)) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Compare priority levels
   */
  private isPriorityHigher(
    priority1: 'high' | 'medium' | 'low',
    priority2: 'high' | 'medium' | 'low'
  ): boolean {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[priority1] > priorityOrder[priority2];
  }

  /**
   * Identify missing documents with 95% accuracy
   * Uses fuzzy matching and alternative document detection
   */
  private identifyMissingDocuments(
    existingDocuments: Record<string, DocumentInfo>,
    requirements: Record<string, {
      requiredFor: string[];
      priority: 'high' | 'medium' | 'low';
      description: string;
      whereToObtain: string;
      alternativeDocuments?: string[];
    }>
  ): MissingDocumentReport['missingDocuments'] {
    const missingDocs: MissingDocumentReport['missingDocuments'] = [];
    
    for (const [requiredType, requirement] of Object.entries(requirements)) {
      // Find the existing document of this type
      const existingDoc = Object.values(existingDocuments).find(
        doc => this.normalizeDocumentType(doc.type) === requiredType
      );
      
      // Check if document is expired
      const isExpired = existingDoc && (
        existingDoc.status === 'expired' || 
        (existingDoc.expiryDate && new Date(existingDoc.expiryDate) <= new Date())
      );
      
      // Check if valid document exists (not expired)
      const hasValidDocument = existingDoc && !isExpired && 
        (existingDoc.status === 'verified' || existingDoc.status === 'uploaded');
      
      // Check if alternative document exists
      let hasValidAlternative = false;
      if (requirement.alternativeDocuments && requirement.alternativeDocuments.length > 0) {
        hasValidAlternative = requirement.alternativeDocuments.some(altDoc => {
          const normalizedAlt = this.normalizeDocumentType(altDoc);
          const altExistingDoc = Object.values(existingDocuments).find(
            doc => this.normalizeDocumentType(doc.type) === normalizedAlt
          );
          
          // Check if alternative is not expired
          const altIsExpired = altExistingDoc && (
            altExistingDoc.status === 'expired' || 
            (altExistingDoc.expiryDate && new Date(altExistingDoc.expiryDate) <= new Date())
          );
          
          return altExistingDoc && !altIsExpired && 
            (altExistingDoc.status === 'verified' || altExistingDoc.status === 'uploaded');
        });
      }
      
      // Special case: Aadhaar can serve as address proof (if not expired)
      if (requiredType === DOCUMENT_TYPES.ADDRESS_PROOF) {
        const aadhaarDoc = Object.values(existingDocuments).find(
          doc => this.normalizeDocumentType(doc.type) === DOCUMENT_TYPES.AADHAAR
        );
        
        if (aadhaarDoc) {
          const aadhaarExpired = aadhaarDoc.status === 'expired' || 
            (aadhaarDoc.expiryDate && new Date(aadhaarDoc.expiryDate) <= new Date());
          
          if (!aadhaarExpired && 
              (aadhaarDoc.status === 'verified' || aadhaarDoc.status === 'uploaded')) {
            hasValidAlternative = true;
          }
        }
      }
      
      // Add to missing list if not found, expired, or no valid alternative
      if (!hasValidDocument && !hasValidAlternative) {
        missingDocs.push({
          documentType: requiredType,
          requiredFor: requirement.requiredFor,
          priority: requirement.priority,
          description: isExpired 
            ? `${requirement.description} (Expired - needs renewal)`
            : requirement.description,
          whereToObtain: requirement.whereToObtain
        });
      }
    }
    
    // Sort by priority (high -> medium -> low)
    return missingDocs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Estimate time to complete missing documents
   */
  private estimateCompletionTime(
    missingDocuments: MissingDocumentReport['missingDocuments']
  ): number {
    // Estimated days to obtain each document type
    const documentTimeEstimates: Record<string, number> = {
      [DOCUMENT_TYPES.AADHAAR]: 30, // 30 days for new Aadhaar
      [DOCUMENT_TYPES.PAN]: 15, // 15 days for PAN
      [DOCUMENT_TYPES.BUSINESS_REGISTRATION]: 7, // 7 days for online registration
      [DOCUMENT_TYPES.INCOME_CERTIFICATE]: 14, // 14 days from revenue office
      [DOCUMENT_TYPES.CASTE_CERTIFICATE]: 21, // 21 days from SDM office
      [DOCUMENT_TYPES.BANK_STATEMENT]: 1, // 1 day (can download immediately)
      [DOCUMENT_TYPES.ADDRESS_PROOF]: 7, // 7 days average
      [DOCUMENT_TYPES.PHOTO]: 1, // 1 day (immediate)
      [DOCUMENT_TYPES.OTHER]: 10 // 10 days default
    };
    
    if (missingDocuments.length === 0) {
      return 0;
    }
    
    // Calculate maximum time (assuming documents can be obtained in parallel)
    // But add some buffer for sequential dependencies
    const maxTime = Math.max(
      ...missingDocuments.map(doc => documentTimeEstimates[doc.documentType] || 10)
    );
    
    // Add buffer time based on number of documents (some may need to be sequential)
    const bufferTime = Math.min(missingDocuments.length * 2, 14); // Max 2 weeks buffer
    
    return maxTime + bufferTime;
  }

  /**
   * Get schemes by IDs from Firestore
   */
  private async getSchemesByIds(schemeIds: string[]): Promise<GovernmentScheme[]> {
    try {
      const schemes: GovernmentScheme[] = [];
      
      for (const schemeId of schemeIds) {
        const docRef = adminDb.collection(SCHEME_SAHAYAK_COLLECTIONS.SCHEMES).doc(schemeId);
        const doc = await docRef.get();
        
        if (doc.exists) {
          schemes.push({ id: doc.id, ...doc.data() } as GovernmentScheme);
        }
      }
      
      return schemes;
    } catch (error) {
      console.error('Error fetching schemes:', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - VERIFICATION
  // ============================================================================

  /**
   * Find document by ID across all artisan profiles
   */
  private async findDocumentById(documentId: string): Promise<{
    artisanId: string;
    document: DocumentInfo;
  } | null> {
    try {
      // Extract artisan ID from document ID pattern: doc_{artisanId}_{timestamp}_{random}
      const parts = documentId.split('_');
      if (parts.length >= 2 && parts[0] === 'doc') {
        const artisanId = parts[1];
        const profile = await this.getArtisanProfile(artisanId);
        
        if (profile && profile.documents && profile.documents[documentId]) {
          return {
            artisanId,
            document: profile.documents[documentId]
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding document:', error);
      return null;
    }
  }

  /**
   * Perform automatic document verification
   * Uses multiple verification methods based on document type
   */
  private async performAutomaticVerification(
    document: DocumentInfo,
    artisanId: string
  ): Promise<DocumentVerificationResult> {
    const verificationMethods: DocumentVerificationResult[] = [];
    
    // 1. OCR-based validation
    const ocrValidation = this.performOCRValidation(document);
    verificationMethods.push(ocrValidation);
    
    // 2. Government API verification (if applicable)
    if (this.supportsGovernmentVerification(document.type)) {
      try {
        const govVerification = await this.performGovernmentAPIVerification(document);
        verificationMethods.push(govVerification);
      } catch (error) {
        console.error('Government API verification failed:', error);
        // Continue with other verification methods
      }
    }
    
    // 3. Pattern and format validation
    const formatValidation = this.performFormatValidation(document);
    verificationMethods.push(formatValidation);
    
    // Combine verification results
    return this.combineVerificationResults(verificationMethods, document);
  }

  /**
   * Perform OCR-based validation
   */
  private performOCRValidation(document: DocumentInfo): DocumentVerificationResult {
    const extractedText = document.extractedData?.text || '';
    const ocrConfidence = document.extractedData?.ocrConfidence || 0;
    
    // Check OCR quality
    if (ocrConfidence < 0.5) {
      return {
        isValid: false,
        verificationMethod: 'ocr_validation',
        confidence: ocrConfidence,
        verificationDetails: {
          issuer: 'Unknown',
          issueDate: new Date(),
          documentNumber: 'Unknown'
        },
        status: 'invalid',
        recommendations: [
          'OCR confidence too low for automatic verification',
          'Please upload a clearer image or request manual verification'
        ]
      };
    }
    
    // Extract key information based on document type
    const extractedData = document.extractedData || {};
    let documentNumber = 'Unknown';
    let issuer = 'Unknown';
    
    // Extract document-specific information
    switch (document.type) {
      case DOCUMENT_TYPES.AADHAAR:
        documentNumber = extractedData.aadhaarNumber || 'Unknown';
        issuer = 'UIDAI';
        break;
      case DOCUMENT_TYPES.PAN:
        documentNumber = extractedData.panNumber || 'Unknown';
        issuer = 'Income Tax Department';
        break;
      case DOCUMENT_TYPES.BUSINESS_REGISTRATION:
        documentNumber = extractedData.gstNumber || extractedData.cinNumber || 'Unknown';
        issuer = 'Ministry of Corporate Affairs';
        break;
      default:
        documentNumber = extractedData.documentNumber || 'Unknown';
        issuer = 'Government Authority';
    }
    
    const isValid = ocrConfidence >= 0.7 && documentNumber !== 'Unknown';
    
    return {
      isValid,
      verificationMethod: 'ocr_validation',
      confidence: ocrConfidence,
      verificationDetails: {
        issuer,
        issueDate: document.uploadDate,
        expiryDate: document.expiryDate,
        documentNumber
      },
      status: isValid ? 'valid' : 'pending',
      recommendations: isValid 
        ? ['Document passed OCR validation']
        : ['Document requires additional verification', 'Consider manual review']
    };
  }

  /**
   * Check if document type supports government API verification
   */
  private supportsGovernmentVerification(documentType: string): boolean {
    const supportedTypes: string[] = [
      DOCUMENT_TYPES.AADHAAR,
      DOCUMENT_TYPES.PAN,
      DOCUMENT_TYPES.BUSINESS_REGISTRATION
    ];
    return supportedTypes.includes(documentType);
  }

  /**
   * Perform government API verification
   * Requirement: 2.2 - Verify document authenticity against government databases within 2 minutes
   */
  private async performGovernmentAPIVerification(
    document: DocumentInfo
  ): Promise<DocumentVerificationResult> {
    // Import GovernmentAPIConnector dynamically to avoid circular dependencies
    const { GovernmentAPIConnector } = await import('./GovernmentAPIConnector');
    const apiConnector = new GovernmentAPIConnector();
    
    const extractedData = document.extractedData || {};
    let documentNumber = '';
    
    // Get document number based on type
    switch (document.type) {
      case DOCUMENT_TYPES.AADHAAR:
        documentNumber = extractedData.aadhaarNumber || '';
        break;
      case DOCUMENT_TYPES.PAN:
        documentNumber = extractedData.panNumber || '';
        break;
      case DOCUMENT_TYPES.BUSINESS_REGISTRATION:
        documentNumber = extractedData.gstNumber || extractedData.cinNumber || '';
        break;
    }
    
    if (!documentNumber) {
      return {
        isValid: false,
        verificationMethod: 'government_api',
        confidence: 0,
        verificationDetails: {
          issuer: 'Unknown',
          issueDate: new Date(),
          documentNumber: 'Not found'
        },
        status: 'invalid',
        recommendations: ['Document number could not be extracted']
      };
    }
    
    try {
      const result = await apiConnector.verifyDocumentWithGovernment(
        document.type,
        documentNumber,
        extractedData
      );
      
      if (result.isValid && result.details) {
        return {
          isValid: true,
          verificationMethod: 'government_api',
          confidence: 0.95,
          verificationDetails: {
            issuer: result.details.issuer || 'Government Authority',
            issueDate: result.details.issueDate ? new Date(result.details.issueDate) : document.uploadDate,
            expiryDate: result.details.expiryDate ? new Date(result.details.expiryDate) : document.expiryDate,
            documentNumber
          },
          status: 'valid',
          recommendations: ['Document verified with government database']
        };
      } else {
        return {
          isValid: false,
          verificationMethod: 'government_api',
          confidence: 0.3,
          verificationDetails: {
            issuer: 'Unknown',
            issueDate: document.uploadDate,
            documentNumber
          },
          status: 'invalid',
          recommendations: [
            result.error || 'Document could not be verified with government database',
            'Consider manual verification'
          ]
        };
      }
    } catch (error) {
      console.error('Government API verification error:', error);
      return {
        isValid: false,
        verificationMethod: 'government_api',
        confidence: 0,
        verificationDetails: {
          issuer: 'Unknown',
          issueDate: document.uploadDate,
          documentNumber
        },
        status: 'pending',
        recommendations: [
          'Government API verification temporarily unavailable',
          'Document will be verified when service is restored'
        ]
      };
    }
  }

  /**
   * Perform format and pattern validation
   */
  private performFormatValidation(document: DocumentInfo): DocumentVerificationResult {
    const extractedData = document.extractedData || {};
    let isValid = false;
    let confidence = 0.5;
    const recommendations: string[] = [];
    
    // Validate based on document type
    switch (document.type) {
      case DOCUMENT_TYPES.AADHAAR:
        const aadhaarNumber = extractedData.aadhaarNumber || '';
        isValid = /^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''));
        confidence = isValid ? 0.8 : 0.3;
        if (!isValid) {
          recommendations.push('Aadhaar number format is invalid (should be 12 digits)');
        }
        break;
        
      case DOCUMENT_TYPES.PAN:
        const panNumber = extractedData.panNumber || '';
        isValid = /^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber);
        confidence = isValid ? 0.8 : 0.3;
        if (!isValid) {
          recommendations.push('PAN format is invalid (should be AAAAA9999A)');
        }
        break;
        
      case DOCUMENT_TYPES.BUSINESS_REGISTRATION:
        const gstNumber = extractedData.gstNumber || '';
        const cinNumber = extractedData.cinNumber || '';
        const gstValid = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstNumber);
        const cinValid = /^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cinNumber);
        isValid = gstValid || cinValid;
        confidence = isValid ? 0.8 : 0.3;
        if (!isValid) {
          recommendations.push('Business registration number format is invalid');
        }
        break;
        
      default:
        // For other document types, check if we have basic information
        const qualityScore = document.qualityScore || 0;
        isValid = qualityScore >= 70;
        confidence = qualityScore / 100;
        if (!isValid) {
          recommendations.push('Document quality is below acceptable threshold');
        }
    }
    
    return {
      isValid,
      verificationMethod: 'ocr_validation',
      confidence,
      verificationDetails: {
        issuer: 'Format Validator',
        issueDate: document.uploadDate,
        expiryDate: document.expiryDate,
        documentNumber: extractedData.documentNumber || 'Unknown'
      },
      status: isValid ? 'valid' : 'invalid',
      recommendations: recommendations.length > 0 ? recommendations : ['Document format is valid']
    };
  }

  /**
   * Combine multiple verification results into final result
   */
  private combineVerificationResults(
    results: DocumentVerificationResult[],
    document: DocumentInfo
  ): DocumentVerificationResult {
    // Calculate weighted confidence
    let totalConfidence = 0;
    let totalWeight = 0;
    let hasGovernmentVerification = false;
    let governmentResult: DocumentVerificationResult | null = null;
    
    for (const result of results) {
      const weight = result.verificationMethod === 'government_api' ? 3 : 1;
      totalConfidence += result.confidence * weight;
      totalWeight += weight;
      
      if (result.verificationMethod === 'government_api' && result.isValid) {
        hasGovernmentVerification = true;
        governmentResult = result;
      }
    }
    
    const averageConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    
    // If government verification succeeded, use that as primary result
    if (hasGovernmentVerification && governmentResult) {
      return governmentResult;
    }
    
    // Otherwise, combine results
    const validResults = results.filter(r => r.isValid).length;
    const isValid = validResults >= Math.ceil(results.length / 2) && averageConfidence >= 0.6;
    
    // Collect all recommendations
    const allRecommendations = results.flatMap(r => r.recommendations);
    const uniqueRecommendations = Array.from(new Set(allRecommendations));
    
    // Use the best verification details available
    const bestResult = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    // Check expiry status
    let status: 'valid' | 'invalid' | 'expired' | 'pending' = isValid ? 'valid' : 'invalid';
    if (document.expiryDate && new Date(document.expiryDate) <= new Date()) {
      status = 'expired';
      uniqueRecommendations.push('Document has expired and needs renewal');
    }
    
    return {
      isValid: isValid && status !== 'expired',
      verificationMethod: bestResult.verificationMethod,
      confidence: averageConfidence,
      verificationDetails: bestResult.verificationDetails,
      status,
      recommendations: uniqueRecommendations
    };
  }

  /**
   * Update document verification status in Firestore
   */
  private async updateDocumentVerificationStatus(
    artisanId: string,
    documentId: string,
    verificationResult: DocumentVerificationResult
  ): Promise<void> {
    const profile = await this.getArtisanProfile(artisanId);
    
    if (!profile || !profile.documents || !profile.documents[documentId]) {
      throw new Error('Document not found');
    }
    
    const document = profile.documents[documentId];
    
    // Update document status based on verification result
    let newStatus: DocumentInfo['status'] = 'uploaded';
    if (verificationResult.status === 'valid') {
      newStatus = 'verified';
    } else if (verificationResult.status === 'expired') {
      newStatus = 'expired';
    } else if (verificationResult.status === 'invalid') {
      newStatus = 'rejected';
    } else {
      newStatus = 'processing';
    }
    
    // Update document with verification result
    document.status = newStatus;
    document.verificationResult = verificationResult;
    
    // Update expiry date if found in verification
    if (verificationResult.verificationDetails.expiryDate) {
      document.expiryDate = verificationResult.verificationDetails.expiryDate;
    }
    
    profile.documents[documentId] = document;
    
    await this.updateArtisanProfile(artisanId, { documents: profile.documents });
  }

  /**
   * Schedule expiry reminder for a specific document
   */
  private async scheduleExpiryReminder(
    artisanId: string,
    documentId: string,
    expiryDate: Date
  ): Promise<void> {
    try {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Create reminder record in Firestore
      const reminderData = {
        artisanId,
        documentId,
        expiryDate,
        reminderDate: new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        status: 'scheduled',
        createdAt: new Date(),
        notificationSent: false
      };
      
      // Store in reminders collection
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS)
        .add({
          type: 'document_expiry_reminder',
          userId: artisanId,
          priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
          scheduledFor: reminderData.reminderDate,
          data: reminderData,
          status: 'scheduled',
          createdAt: new Date()
        });
      
      console.log(`Scheduled expiry reminder for document ${documentId}, expires in ${daysUntilExpiry} days`);
    } catch (error) {
      console.error('Error scheduling expiry reminder:', error);
      // Don't throw - reminder scheduling failure shouldn't block verification
    }
  }

  /**
   * Mark document as expired
   */
  private async markDocumentAsExpired(
    artisanId: string,
    documentId: string
  ): Promise<void> {
    try {
      const profile = await this.getArtisanProfile(artisanId);
      
      if (!profile || !profile.documents || !profile.documents[documentId]) {
        return;
      }
      
      const document = profile.documents[documentId];
      document.status = 'expired';
      
      profile.documents[documentId] = document;
      await this.updateArtisanProfile(artisanId, { documents: profile.documents });
      
      // Create notification for expired document
      await adminDb
        .collection(SCHEME_SAHAYAK_COLLECTIONS.NOTIFICATIONS)
        .add({
          type: 'document_expired',
          userId: artisanId,
          priority: 'high',
          scheduledFor: new Date(),
          data: {
            documentId,
            documentType: document.type,
            expiryDate: document.expiryDate
          },
          status: 'pending',
          createdAt: new Date()
        });
      
      console.log(`Marked document ${documentId} as expired`);
    } catch (error) {
      console.error('Error marking document as expired:', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate file size and type
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
      );
    }

    // Check file name
    if (!file.name || file.name.length === 0) {
      throw new Error('File name is required');
    }
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(artisanId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `doc_${artisanId}_${timestamp}_${random}`;
  }

  /**
   * Encrypt file content using AES-256-GCM
   * Requirement: 9.1 - AES-256 encryption for sensitive data
   */
  private encryptFile(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt file content
   */
  private decryptFile(encryptedBuffer: Buffer): Buffer {
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(16, 32);
    const encrypted = encryptedBuffer.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Upload file to Google Cloud Storage
   * Requirement: 9.2 - TLS 1.3 for data transmission (handled by GCS)
   */
  private async uploadToGCS(
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    await file.save(buffer, {
      contentType,
      metadata: {
        uploadedAt: new Date().toISOString(),
        encrypted: 'true'
      },
      resumable: false
    });
  }

  /**
   * Delete file from Google Cloud Storage
   */
  private async deleteFromGCS(path: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);
    await file.delete();
  }

  /**
   * Check if file type is image or PDF
   */
  private isImageOrPDF(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  }

  /**
   * Perform OCR on document using Google Cloud Vision API
   * Requirement: 2.1 - OCR within 30 seconds
   * Enhanced with additional Vision API features for better document processing
   */
  private async performOCR(buffer: Buffer): Promise<{ 
    text: string; 
    confidence: number;
    detectedLanguages: string[];
    documentProperties?: any;
  }> {
    try {
      // Use document text detection for better accuracy on documents
      const [result] = await this.visionClient.documentTextDetection(buffer);
      
      const fullTextAnnotation = result.fullTextAnnotation;
      const text = fullTextAnnotation?.text || '';
      
      // Calculate average confidence from pages
      let totalConfidence = 0;
      let wordCount = 0;
      
      if (fullTextAnnotation?.pages) {
        for (const page of fullTextAnnotation.pages) {
          for (const block of page.blocks || []) {
            for (const paragraph of block.paragraphs || []) {
              for (const word of paragraph.words || []) {
                if (word.confidence) {
                  totalConfidence += word.confidence;
                  wordCount++;
                }
              }
            }
          }
        }
      }
      
      const confidence = wordCount > 0 ? totalConfidence / wordCount : 0;
      
      // Detect languages
      const detectedLanguages: string[] = [];
      if (fullTextAnnotation?.pages) {
        for (const page of fullTextAnnotation.pages) {
          if (page.property?.detectedLanguages) {
            for (const lang of page.property.detectedLanguages) {
              if (lang.languageCode && !detectedLanguages.includes(lang.languageCode)) {
                detectedLanguages.push(lang.languageCode);
              }
            }
          }
        }
      }
      
      return { 
        text, 
        confidence,
        detectedLanguages,
        documentProperties: fullTextAnnotation?.pages?.[0]?.property
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return { 
        text: '', 
        confidence: 0,
        detectedLanguages: []
      };
    }
  }

  /**
   * Enhanced document type classification system
   * Uses multiple signals: keywords, patterns, structure, and metadata
   * Requirement: 2.5 - Document type classification
   */
  private detectDocumentType(text: string): { 
    type: string; 
    confidence: number;
    extractedData?: Record<string, any>;
  } {
    const lowerText = text.toLowerCase();
    const extractedData: Record<string, any> = {};
    
    // Aadhaar detection with data extraction
    const aadhaarPattern = /\d{4}\s?\d{4}\s?\d{4}/;
    const aadhaarMatch = text.match(aadhaarPattern);
    if (
      lowerText.includes('aadhaar') || 
      lowerText.includes('आधार') || 
      lowerText.includes('unique identification') ||
      aadhaarMatch
    ) {
      let confidence = 0.7;
      if (aadhaarMatch) {
        extractedData.aadhaarNumber = aadhaarMatch[0].replace(/\s/g, '');
        confidence = 0.95;
      }
      if (lowerText.includes('government of india')) confidence += 0.05;
      if (lowerText.includes('uidai')) confidence += 0.05;
      
      return { type: DOCUMENT_TYPES.AADHAAR, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Business registration detection (check before PAN as GST contains PAN-like pattern)
    const gstPattern = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/;
    const gstMatch = text.match(gstPattern);
    const cinPattern = /[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}/;
    const cinMatch = text.match(cinPattern);
    
    if (
      (lowerText.includes('registration') && (lowerText.includes('business') || lowerText.includes('company'))) ||
      lowerText.includes('certificate of incorporation') ||
      lowerText.includes('gstin') ||
      gstMatch ||
      cinMatch
    ) {
      let confidence = 0.75;
      if (gstMatch) {
        extractedData.gstNumber = gstMatch[0];
        confidence = 0.9;
      }
      if (cinMatch) {
        extractedData.cinNumber = cinMatch[0];
        confidence = 0.9;
      }
      if (lowerText.includes('ministry of corporate affairs')) confidence += 0.05;
      
      return { type: DOCUMENT_TYPES.BUSINESS_REGISTRATION, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // PAN detection with data extraction (after business registration check)
    const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/;
    const panMatch = text.match(panPattern);
    if (
      lowerText.includes('permanent account number') || 
      lowerText.includes('income tax') ||
      (lowerText.includes('pan') && !lowerText.includes('company')) ||
      panMatch
    ) {
      let confidence = 0.7;
      if (panMatch) {
        extractedData.panNumber = panMatch[0];
        confidence = 0.95;
      }
      if (lowerText.includes('income tax department')) confidence += 0.05;
      
      return { type: DOCUMENT_TYPES.PAN, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Income certificate detection
    if (
      (lowerText.includes('income') && lowerText.includes('certificate')) ||
      (lowerText.includes('annual income') && lowerText.includes('certify'))
    ) {
      let confidence = 0.8;
      
      // Try to extract income amount
      const incomePattern = /(?:rs\.?|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i;
      const incomeMatch = text.match(incomePattern);
      if (incomeMatch) {
        extractedData.annualIncome = incomeMatch[1].replace(/,/g, '');
        confidence = 0.9;
      }
      
      if (lowerText.includes('district magistrate') || lowerText.includes('tehsildar')) {
        confidence += 0.05;
      }
      
      return { type: DOCUMENT_TYPES.INCOME_CERTIFICATE, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Caste certificate detection
    if (
      (lowerText.includes('caste') && lowerText.includes('certificate')) ||
      lowerText.includes('scheduled caste') ||
      lowerText.includes('scheduled tribe') ||
      lowerText.includes('obc') ||
      lowerText.includes('other backward class')
    ) {
      let confidence = 0.85;
      
      // Extract caste category
      if (lowerText.includes('scheduled caste') || lowerText.includes('sc')) {
        extractedData.category = 'SC';
        confidence = 0.9;
      } else if (lowerText.includes('scheduled tribe') || lowerText.includes('st')) {
        extractedData.category = 'ST';
        confidence = 0.9;
      } else if (lowerText.includes('obc') || lowerText.includes('other backward')) {
        extractedData.category = 'OBC';
        confidence = 0.9;
      }
      
      return { type: DOCUMENT_TYPES.CASTE_CERTIFICATE, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Bank statement detection
    const ifscPattern = /[A-Z]{4}0[A-Z0-9]{6}/;
    const ifscMatch = text.match(ifscPattern);
    const accountPattern = /(?:account|a\/c)[\s:]+(\d{9,18})/i;
    const accountMatch = text.match(accountPattern);
    
    if (
      lowerText.includes('bank') && (lowerText.includes('statement') || lowerText.includes('account')) ||
      lowerText.includes('transaction') ||
      ifscMatch ||
      accountMatch
    ) {
      let confidence = 0.75;
      if (ifscMatch) {
        extractedData.ifscCode = ifscMatch[0];
        confidence = 0.85;
      }
      if (accountMatch) {
        extractedData.accountNumber = accountMatch[1];
        confidence = 0.85;
      }
      if (lowerText.includes('opening balance') || lowerText.includes('closing balance')) {
        confidence += 0.1;
      }
      
      return { type: DOCUMENT_TYPES.BANK_STATEMENT, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Address proof detection
    if (
      (lowerText.includes('address') && lowerText.includes('proof')) ||
      lowerText.includes('residence certificate') ||
      lowerText.includes('domicile certificate')
    ) {
      let confidence = 0.8;
      
      // Extract address components
      const pincodePattern = /\b\d{6}\b/;
      const pincodeMatch = text.match(pincodePattern);
      if (pincodeMatch) {
        extractedData.pincode = pincodeMatch[0];
        confidence = 0.85;
      }
      
      return { type: DOCUMENT_TYPES.ADDRESS_PROOF, confidence: Math.min(confidence, 1), extractedData };
    }
    
    // Photo detection (minimal text expected)
    if (text.length < 50 && lowerText.includes('photo')) {
      return { type: DOCUMENT_TYPES.PHOTO, confidence: 0.7, extractedData };
    }
    
    return { type: DOCUMENT_TYPES.OTHER, confidence: 0.5, extractedData };
  }
  
  /**
   * Extract expiry date from document text
   * Requirement: 2.3 - Detect document expiry dates
   */
  private extractExpiryDate(text: string, documentType: string): Date | undefined {
    const lowerText = text.toLowerCase();
    
    // Common expiry date patterns
    const patterns = [
      /(?:valid\s+(?:till|until|up\s+to|through))[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:expiry|expires|expiration)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:valid\s+from).*?(?:to)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}).*?(?:expiry|expires)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1];
        const parsedDate = this.parseDate(dateStr);
        if (parsedDate && parsedDate > new Date()) {
          return parsedDate;
        }
      }
    }
    
    // Document-specific expiry logic
    if (documentType === DOCUMENT_TYPES.AADHAAR) {
      // Aadhaar doesn't expire, but we can check for DOB to validate
      return undefined;
    }
    
    if (documentType === DOCUMENT_TYPES.PAN) {
      // PAN doesn't expire
      return undefined;
    }
    
    // For certificates, look for issue date and add typical validity period
    const issueDatePattern = /(?:issued\s+on|date\s+of\s+issue)[\s:]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    const issueDateMatch = text.match(issueDatePattern);
    
    if (issueDateMatch && issueDateMatch[1]) {
      const issueDate = this.parseDate(issueDateMatch[1]);
      if (issueDate) {
        // Most certificates are valid for 1-3 years
        const expiryDate = new Date(issueDate);
        
        if (documentType === DOCUMENT_TYPES.INCOME_CERTIFICATE) {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity
        } else if (documentType === DOCUMENT_TYPES.CASTE_CERTIFICATE) {
          // Caste certificates typically don't expire, but some states have validity
          expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 2); // Default 2 years
        }
        
        return expiryDate;
      }
    }
    
    return undefined;
  }
  
  /**
   * Parse date string in various formats
   */
  private parseDate(dateStr: string): Date | null {
    // Try different date formats
    const formats = [
      /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
      /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2})/, // DD-MM-YY or DD/MM/YY
      /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        let day: number, month: number, year: number;
        
        if (match[0].startsWith(match[1]) && match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // DD-MM-YYYY or DD-MM-YY format
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = parseInt(match[3]);
          
          // Handle 2-digit year
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
        }
        
        const date = new Date(year, month, day);
        
        // Validate date
        if (
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
        ) {
          return date;
        }
      }
    }
    
    return null;
  }

  /**
   * Enhanced document quality assessment with comprehensive checks
   * Requirement: 2.5 - Document quality assessment with improvement suggestions
   */
  private async assessDocumentQuality(
    buffer: Buffer,
    mimeType: string,
    extractedText: string,
    ocrConfidence?: number
  ): Promise<{ score: number; issues: DocumentIssue[]; suggestions: string[] }> {
    const issues: DocumentIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 1. File size checks
    const fileSizeKB = buffer.length / 1024;
    const fileSizeMB = fileSizeKB / 1024;
    
    if (fileSizeKB < 50) {
      issues.push({
        type: 'quality',
        severity: 'high',
        description: 'File size is extremely small (< 50KB), indicating very low quality',
        suggestion: 'Upload a higher resolution image (at least 300 DPI recommended)'
      });
      suggestions.push('Use your phone camera in good lighting conditions');
      suggestions.push('Ensure the document fills most of the frame');
      score -= 30;
    } else if (fileSizeKB < 200) {
      issues.push({
        type: 'quality',
        severity: 'medium',
        description: 'File size is small, which may indicate low quality',
        suggestion: 'Try uploading a higher resolution image for better clarity'
      });
      score -= 15;
    }
    
    if (fileSizeMB > 8) {
      issues.push({
        type: 'size',
        severity: 'low',
        description: 'File size is very large, which may slow down processing',
        suggestion: 'Consider compressing the image while maintaining quality'
      });
      score -= 5;
    }

    // 2. OCR confidence check
    if (ocrConfidence !== undefined) {
      if (ocrConfidence < 0.5) {
        issues.push({
          type: 'quality',
          severity: 'high',
          description: 'Text recognition confidence is very low',
          suggestion: 'Document may be blurry, skewed, or poorly lit'
        });
        suggestions.push('Ensure good lighting when capturing the document');
        suggestions.push('Hold the camera steady and avoid shadows');
        suggestions.push('Make sure the document is flat and not folded');
        score -= 35;
      } else if (ocrConfidence < 0.7) {
        issues.push({
          type: 'quality',
          severity: 'medium',
          description: 'Text recognition confidence is moderate',
          suggestion: 'Image quality could be improved for better accuracy'
        });
        suggestions.push('Try capturing in better lighting');
        suggestions.push('Ensure the document is in focus');
        score -= 20;
      } else if (ocrConfidence < 0.85) {
        issues.push({
          type: 'quality',
          severity: 'low',
          description: 'Text recognition confidence is acceptable but could be better',
          suggestion: 'Minor improvements to image quality recommended'
        });
        score -= 10;
      }
    }

    // 3. Text content analysis
    if (this.isImageOrPDF(mimeType)) {
      const textLength = extractedText.length;
      const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
      
      if (textLength < 50) {
        issues.push({
          type: 'content',
          severity: 'high',
          description: 'Very little text could be extracted from the document',
          suggestion: 'Ensure the entire document is visible and readable'
        });
        suggestions.push('Check if the document is completely visible in the image');
        suggestions.push('Avoid cutting off edges of the document');
        suggestions.push('Ensure text is not too small or compressed');
        score -= 30;
      } else if (textLength < 200) {
        issues.push({
          type: 'content',
          severity: 'medium',
          description: 'Limited text extracted from the document',
          suggestion: 'Document may be partially visible or text may be unclear'
        });
        suggestions.push('Capture the full document in the frame');
        score -= 15;
      }
      
      // Check for gibberish or random characters (indicates poor OCR)
      const gibberishRatio = this.calculateGibberishRatio(extractedText);
      if (gibberishRatio > 0.3) {
        issues.push({
          type: 'quality',
          severity: 'high',
          description: 'Extracted text contains many unrecognizable characters',
          suggestion: 'Image quality is too poor for accurate text extraction'
        });
        suggestions.push('Retake the photo with better focus and lighting');
        suggestions.push('Clean the camera lens if needed');
        score -= 25;
      }
      
      // Check for minimum word count
      if (wordCount < 10) {
        issues.push({
          type: 'content',
          severity: 'medium',
          description: 'Very few words detected in the document',
          suggestion: 'Ensure the document contains readable text'
        });
        score -= 15;
      }
    }

    // 4. Image-specific quality checks
    if (mimeType.startsWith('image/')) {
      // Check for common quality issues in text
      const lowerText = extractedText.toLowerCase();
      
      if (lowerText.includes('blur') || lowerText.includes('unclear')) {
        issues.push({
          type: 'quality',
          severity: 'high',
          description: 'Document appears to be blurry or unclear',
          suggestion: 'Retake the photo with better focus'
        });
        suggestions.push('Tap on the document in your camera app to focus');
        suggestions.push('Hold the phone steady while capturing');
        score -= 25;
      }
      
      // Check for rotation issues
      if (this.detectRotationIssues(extractedText)) {
        issues.push({
          type: 'orientation',
          severity: 'medium',
          description: 'Document may be rotated or skewed',
          suggestion: 'Ensure the document is properly aligned'
        });
        suggestions.push('Hold the phone parallel to the document');
        suggestions.push('Align the document edges with the camera frame');
        score -= 15;
      }
    }

    // 5. Document completeness check
    const completenessIssues = this.checkDocumentCompleteness(extractedText);
    if (completenessIssues.length > 0) {
      for (const issue of completenessIssues) {
        issues.push(issue);
        score -= 10;
      }
      suggestions.push('Ensure all parts of the document are visible');
      suggestions.push('Check that no information is cut off at the edges');
    }

    // 6. Security and authenticity indicators
    const securityChecks = this.checkSecurityFeatures(extractedText);
    if (!securityChecks.hasOfficialMarkers) {
      issues.push({
        type: 'authenticity',
        severity: 'low',
        description: 'Document may be missing official markers or seals',
        suggestion: 'Ensure official stamps and signatures are clearly visible'
      });
      score -= 5;
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Add general suggestions if score is low
    if (score < 60) {
      suggestions.push('Consider scanning the document instead of photographing it');
      suggestions.push('Use a document scanning app for better results');
      suggestions.push('Ensure the document is placed on a flat, contrasting surface');
    }
    
    // Remove duplicate suggestions
    const uniqueSuggestions = Array.from(new Set(suggestions));

    return { score, issues, suggestions: uniqueSuggestions };
  }
  
  /**
   * Calculate ratio of gibberish/unrecognizable characters
   */
  private calculateGibberishRatio(text: string): number {
    if (text.length === 0) return 0;
    
    // Count special characters and non-alphanumeric characters
    const specialChars = text.match(/[^a-zA-Z0-9\s\u0900-\u097F.,;:!?'"()-]/g) || [];
    const totalChars = text.length;
    
    return specialChars.length / totalChars;
  }
  
  /**
   * Detect if document has rotation or skew issues
   */
  private detectRotationIssues(text: string): boolean {
    // Check for unusual character sequences that might indicate rotation
    const lines = text.split('\n');
    
    // If most lines are very short, document might be rotated
    const shortLines = lines.filter(line => line.trim().length < 5).length;
    const shortLineRatio = shortLines / Math.max(lines.length, 1);
    
    return shortLineRatio > 0.5 && lines.length > 5;
  }
  
  /**
   * Check document completeness
   */
  private checkDocumentCompleteness(text: string): DocumentIssue[] {
    const issues: DocumentIssue[] = [];
    const lowerText = text.toLowerCase();
    
    // Check for truncated text indicators
    if (text.endsWith('...') || text.includes('[truncated]')) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: 'Document appears to be truncated or incomplete',
        suggestion: 'Ensure the entire document is captured in the image'
      });
    }
    
    // Check for common document elements
    const hasDate = /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(text);
    const hasSignature = lowerText.includes('signature') || lowerText.includes('signed');
    
    if (!hasDate && text.length > 100) {
      issues.push({
        type: 'completeness',
        severity: 'low',
        description: 'No date found in document',
        suggestion: 'Ensure the document date is visible and clear'
      });
    }
    
    return issues;
  }
  
  /**
   * Check for security features and official markers
   */
  private checkSecurityFeatures(text: string): { hasOfficialMarkers: boolean } {
    const lowerText = text.toLowerCase();
    
    const officialKeywords = [
      'government',
      'official',
      'seal',
      'stamp',
      'authorized',
      'certified',
      'ministry',
      'department',
      'issued by',
      'सरकार', // Government in Hindi
      'प्रमाणित' // Certified in Hindi
    ];
    
    const hasOfficialMarkers = officialKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    return { hasOfficialMarkers };
  }

  /**
   * Save document metadata to Firestore
   */
  private async saveDocumentMetadata(
    artisanId: string,
    documentInfo: DocumentInfo
  ): Promise<void> {
    const profile = await this.getArtisanProfile(artisanId);
    
    if (!profile) {
      throw new Error('Artisan profile not found');
    }

    const documents = profile.documents || {};
    documents[documentInfo.id] = documentInfo;

    await this.updateArtisanProfile(artisanId, { documents });
  }

  /**
   * Get artisan profile from Firestore
   */
  private async getArtisanProfile(artisanId: string): Promise<ArtisanProfile | null> {
    try {
      const docRef = adminDb.collection(SCHEME_SAHAYAK_COLLECTIONS.ARTISANS).doc(artisanId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as ArtisanProfile;
    } catch (error) {
      console.error('Error fetching artisan profile:', error);
      return null;
    }
  }

  /**
   * Update artisan profile in Firestore
   */
  private async updateArtisanProfile(
    artisanId: string,
    updates: Partial<ArtisanProfile>
  ): Promise<void> {
    const docRef = adminDb.collection(SCHEME_SAHAYAK_COLLECTIONS.ARTISANS).doc(artisanId);
    await docRef.update(updates);
  }

  /**
   * Handle errors with proper error types
   */
  private handleError(error: any, operation: string): Error {
    console.error(`DocumentManager.${operation} error:`, error);
    
    if (error.message) {
      return new Error(`${operation} failed: ${error.message}`);
    }
    
    return new Error(`${operation} failed: Unknown error`);
  }
}

// Export singleton instance
export const documentManager = new DocumentManager();
