import { prepareDocuments, DocumentPrepConfig, DocumentPrepResult } from '@/ai/flows/document-prep-agent';
import { extractRequirementsFromDocument, OCRConfig, OCRResult } from '@/ai/flows/ocr-agent';
import { LoanApplicationService } from './LoanApplicationService';
import connectDB from '../mongodb';

interface DocumentPreparationRequest {
  applicationId: string;
  documentType: 'loan_application' | 'business_plan' | 'financial_statement' | 'identity_proof';
  sourceDocuments?: Array<{
    url: string;
    type: string;
  }>;
  requirements?: {
    schemeId?: string;
    customRequirements?: string[];
  };
}

interface DocumentPreparationResult {
  success: boolean;
  preparedDocument?: {
    type: string;
    content: string;
    format: 'pdf' | 'text' | 'json';
    generatedAt: Date;
  };
  extractedData?: any;
  errors?: string[];
}

export class DocumentPreparationService {
  /**
   * Prepare documents for loan application using AI agents
   */
  static async prepareLoanDocuments(request: DocumentPreparationRequest): Promise<DocumentPreparationResult> {
    try {
      await connectDB();

      // Get loan application details
      const applicationResult = await LoanApplicationService.getLoanApplicationById(request.applicationId);

      if (!applicationResult.success || !applicationResult.data) {
        return {
          success: false,
          errors: ['Loan application not found']
        };
      }

      const application = applicationResult.data;

  let extractedRequirements: OCRResult | null = null;

      // Extract requirements from source documents using OCR agent
      if (request.sourceDocuments && request.sourceDocuments.length > 0) {
        for (const doc of request.sourceDocuments) {
          try {
            extractedRequirements = await extractRequirementsFromDocument({ document: doc });
            break;
          } catch (error) {
            console.error(`Failed to extract from ${doc.url}:`, error);
            continue;
          }
        }
      }

      // Prepare document using document prep agent
      const artisanProfile = {
        id: application.userId,
        name: application.personalInfo.fullName,
        skills: [], // Could be enhanced with actual skills data
        location: `${application.personalInfo.address.city}, ${application.personalInfo.address.state}`,
        income: application.businessInfo.annualTurnover.toString(),
        businessType: application.businessInfo.businessType,
        experience: application.businessInfo.businessExperience.toString(),
        contactInfo: {
          phone: application.personalInfo.phoneNumber,
          email: application.personalInfo.email,
          address: `${application.personalInfo.address.street}, ${application.personalInfo.address.city}, ${application.personalInfo.address.state} ${application.personalInfo.address.pincode}`
        },
        documents: {
          aadhaar: application.personalInfo.aadhaarNumber,
          pan: application.personalInfo.panNumber,
          bankAccount: application.bankDetails?.accountNumber
        }
      };

      const documentsNeeded = this.getDocumentsNeeded(request.documentType, application);

      const prepInput: DocumentPrepConfig = {
        artisanProfile,
        requirements: extractedRequirements
          ? extractedRequirements.extractedRequirements
          : (request.requirements?.customRequirements || documentsNeeded)
      };

  const prepResult: DocumentPrepResult = await prepareDocuments(prepInput);

      if (prepResult.preparedDocuments.length > 0) {
        const preparedDoc = prepResult.preparedDocuments[0];

        return {
          success: true,
          preparedDocument: {
            type: preparedDoc.requirementId || 'unknown',
            content: preparedDoc.filePath || '',
            format: 'pdf',
            generatedAt: new Date()
          },
          extractedData: extractedRequirements,
          errors: undefined
        };
      } else {
        return {
          success: false,
          errors: ['Failed to prepare document']
        };
      }

    } catch (error: any) {
      console.error('Document preparation error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Extract data from uploaded documents using OCR
   */
  static async extractDocumentData(documentUrl: string, documentType: string): Promise<any> {
    try {
      const extractedData = await extractRequirementsFromDocument({ document: { url: documentUrl, type: documentType } });
      return this.processExtractedData(extractedData, documentType);
    } catch (error: any) {
      console.error('Document data extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate document against requirements
   */
  static async validateDocument(documentUrl: string, requirements: string[]): Promise<{
    valid: boolean;
    extractedData: any;
    compliance: string[];
    issues: string[];
  }> {
    try {
      const extractedData = await this.extractDocumentData(documentUrl, 'validation');

      const compliance: string[] = [];
      const issues: string[] = [];

      // Check compliance with requirements
      for (const requirement of requirements) {
        // Simple compliance check - could be enhanced with AI
        const isCompliant = extractedData.extractedText?.toLowerCase().includes(requirement.toLowerCase());
        if (isCompliant) {
          compliance.push(requirement);
        } else {
          issues.push(`Missing: ${requirement}`);
        }
      }

      return {
        valid: issues.length === 0,
        extractedData,
        compliance,
        issues
      };

    } catch (error: any) {
      console.error('Document validation error:', error);
      return {
        valid: false,
        extractedData: null,
        compliance: [],
        issues: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get required documents based on type and application
   */
  private static getDocumentsNeeded(documentType: string, application: any): string[] {
    const baseDocuments = [
      'Personal Information Form',
      'Business Details Form',
      'Financial Information'
    ];

    switch (documentType) {
      case 'loan_application':
        return [
          ...baseDocuments,
          'Loan Application Form',
          'Credit History Report',
          'Collateral Documents'
        ];

      case 'business_plan':
        return [
          'Business Plan Document',
          'Financial Projections',
          'Market Analysis'
        ];

      case 'financial_statement':
        return [
          'Profit & Loss Statement',
          'Balance Sheet',
          'Cash Flow Statement'
        ];

      case 'identity_proof':
        return [
          'Aadhaar Card',
          'PAN Card',
          'Address Proof'
        ];

      default:
        return baseDocuments;
    }
  }

  /**
   * Process extracted OCR data based on document type
   */
  private static processExtractedData(extractedData: OCRResult, documentType: string): any {
    const processed = {
      documentType,
      extractedRequirements: extractedData.extractedRequirements,
      structuredData: {} as any,
      confidence: 0.8 // Placeholder confidence score
    };

    // Example: Extract structured data based on document type (mock)
    // You can add more logic here if OCRResult structure changes
    return processed;
  }

  /**
   * Extract Aadhaar card data
   */
  private static extractAadhaarData(text: string): any {
    // Simple pattern matching for Aadhaar data
    const aadhaarMatch = text.match(/(\d{4}\s?\d{4}\s?\d{4})/);
    const nameMatch = text.match(/Name[:\s]+([^\n]+)/i);
    const dobMatch = text.match(/DOB[:\s]+([^\n]+)/i);

    return {
      aadhaarNumber: aadhaarMatch ? aadhaarMatch[1].replace(/\s/g, '') : null,
      name: nameMatch ? nameMatch[1].trim() : null,
      dateOfBirth: dobMatch ? dobMatch[1].trim() : null
    };
  }

  /**
   * Extract PAN card data
   */
  private static extractPANData(text: string): any {
    const panMatch = text.match(/([A-Z]{5}[0-9]{4}[A-Z]{1})/);
    const nameMatch = text.match(/Name[:\s]+([^\n]+)/i);
    const fatherMatch = text.match(/Father['s]? Name[:\s]+([^\n]+)/i);

    return {
      panNumber: panMatch ? panMatch[1] : null,
      name: nameMatch ? nameMatch[1].trim() : null,
      fatherName: fatherMatch ? fatherMatch[1].trim() : null
    };
  }

  /**
   * Extract bank statement data
   */
  private static extractBankData(text: string): any {
    const accountMatch = text.match(/Account[:\s]+([^\n]+)/i);
    const balanceMatch = text.match(/Balance[:\s]+(?:Rs\.?|INR)?\s?([\d,]+)/i);

    return {
      accountNumber: accountMatch ? accountMatch[1].trim() : null,
      currentBalance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : null
    };
  }
}
