/**
 * Document Verification System Tests
 * Tests for task 5.3: Build document verification system
 */

import { DocumentManager } from '@/lib/services/scheme-sahayak/DocumentManager';
import { adminDb } from '@/lib/firebase-admin';
import {
    DocumentInfo,
    DocumentVerificationResult,
    ArtisanProfile,
    SCHEME_SAHAYAK_COLLECTIONS
} from '@/lib/types/scheme-sahayak';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
    adminDb: {
        collection: jest.fn()
    }
}));

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
            file: jest.fn().mockReturnValue({
                save: jest.fn(),
                delete: jest.fn(),
                getSignedUrl: jest.fn().mockResolvedValue(['https://example.com/signed-url'])
            })
        })
    }))
}));

// Mock Google Cloud Vision
jest.mock('@google-cloud/vision', () => ({
    ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
        documentTextDetection: jest.fn().mockResolvedValue([{
            fullTextAnnotation: {
                text: 'Sample document text',
                pages: [{
                    blocks: [{
                        paragraphs: [{
                            words: [{ confidence: 0.95 }]
                        }]
                    }]
                }]
            }
        }])
    }))
}));

// Mock GovernmentAPIConnector
jest.mock('@/lib/services/scheme-sahayak/GovernmentAPIConnector', () => ({
    GovernmentAPIConnector: jest.fn().mockImplementation(() => ({
        verifyDocumentWithGovernment: jest.fn().mockResolvedValue({
            isValid: true,
            details: {
                issuer: 'UIDAI',
                issueDate: new Date('2020-01-01'),
                documentNumber: '123456789012'
            }
        })
    }))
}));

describe('DocumentManager - Verification System', () => {
    let documentManager: DocumentManager;
    let mockCollection: any;
    let mockDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Firestore
        mockDoc = {
            get: jest.fn(),
            update: jest.fn(),
            set: jest.fn()
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            add: jest.fn().mockResolvedValue({ id: 'notification123' })
        };

        (adminDb.collection as jest.Mock).mockReturnValue(mockCollection);

        documentManager = new DocumentManager();
    });

    describe('verifyDocument', () => {
        it('should verify document with automatic verification', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'aadhaar',
                filename: 'aadhaar.jpg',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 85,
                extractedData: {
                    text: 'AADHAAR 1234 5678 9012',
                    aadhaarNumber: '123456789012',
                    ocrConfidence: 0.9
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            expect(result).toBeDefined();
            expect(result.isValid).toBe(true);
            expect(result.confidence).toBeGreaterThan(0.6);
            expect(result.verificationDetails.documentNumber).toBe('123456789012');
            expect(mockDoc.update).toHaveBeenCalled();
        });

        it('should handle manual verification request', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'other',
                filename: 'document.pdf',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 75,
                extractedData: {
                    text: 'Some document text'
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'manual');

            expect(result).toBeDefined();
            expect(result.verificationMethod).toBe('manual_review');
            expect(result.status).toBe('pending');
            expect(result.recommendations).toContain('Document queued for manual review by verification team');
        });

        it('should detect expired documents during verification', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const expiredDate = new Date();
            expiredDate.setFullYear(expiredDate.getFullYear() - 1); // 1 year ago

            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'income_certificate',
                filename: 'income.pdf',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 80,
                expiryDate: expiredDate,
                extractedData: {
                    text: 'Income Certificate',
                    ocrConfidence: 0.85
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            expect(result.status).toBe('expired');
            expect(result.recommendations).toContain('Document has expired and needs renewal');
        });

        it('should validate PAN card format', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'pan',
                filename: 'pan.jpg',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 90,
                extractedData: {
                    text: 'PAN ABCDE1234F',
                    panNumber: 'ABCDE1234F',
                    ocrConfidence: 0.95
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            expect(result.isValid).toBe(true);
            expect(result.verificationDetails.documentNumber).toBe('ABCDE1234F');
            // Government API verification takes precedence, so issuer will be from API
            expect(result.verificationDetails.issuer).toBeDefined();
        });

        it('should handle low quality documents', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'other',
                filename: 'document.jpg',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 40,
                extractedData: {
                    text: 'Unclear text',
                    ocrConfidence: 0.3
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            // Low OCR confidence should result in invalid verification
            expect(result.isValid).toBe(false);
            expect(result.confidence).toBeLessThan(0.6);
            expect(result.recommendations).toContain('OCR confidence too low for automatic verification');
        });
    });

    describe('scheduleExpiryReminders', () => {
        it('should schedule reminders for documents expiring within 30 days', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20); // 20 days from now

            const mockDocument: DocumentInfo = {
                id: 'doc_artisan123_1234567890_abc123',
                type: 'income_certificate',
                filename: 'income.pdf',
                uploadDate: new Date(),
                status: 'verified',
                qualityScore: 85,
                expiryDate: futureDate,
                extractedData: {}
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [mockDocument.id]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            await documentManager.scheduleExpiryReminders('artisan123');

            expect(mockCollection.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'document_expiry_reminder',
                    userId: 'artisan123',
                    priority: 'medium', // 20 days is > 7 days, so medium priority
                    status: 'scheduled'
                })
            );
        });

        it('should mark expired documents', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

            const mockDocument: DocumentInfo = {
                id: 'doc_artisan123_1234567890_abc123',
                type: 'caste_certificate',
                filename: 'caste.pdf',
                uploadDate: new Date(),
                status: 'verified',
                qualityScore: 85,
                expiryDate: pastDate,
                extractedData: {}
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [mockDocument.id]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            await documentManager.scheduleExpiryReminders('artisan123');

            expect(mockDoc.update).toHaveBeenCalled();
            expect(mockCollection.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'document_expired',
                    userId: 'artisan123',
                    priority: 'high'
                })
            );
        });

        it('should not schedule reminders for documents without expiry dates', async () => {
            const mockDocument: DocumentInfo = {
                id: 'doc_artisan123_1234567890_abc123',
                type: 'pan',
                filename: 'pan.jpg',
                uploadDate: new Date(),
                status: 'verified',
                qualityScore: 90,
                extractedData: {}
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [mockDocument.id]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            await documentManager.scheduleExpiryReminders('artisan123');

            expect(mockCollection.add).not.toHaveBeenCalled();
        });

        it('should handle multiple documents with different expiry dates', async () => {
            const nearExpiry = new Date();
            nearExpiry.setDate(nearExpiry.getDate() + 5); // 5 days from now

            const farExpiry = new Date();
            farExpiry.setDate(farExpiry.getDate() + 60); // 60 days from now

            const mockDocuments: Record<string, DocumentInfo> = {
                'doc1': {
                    id: 'doc1',
                    type: 'income_certificate',
                    filename: 'income.pdf',
                    uploadDate: new Date(),
                    status: 'verified',
                    qualityScore: 85,
                    expiryDate: nearExpiry,
                    extractedData: {}
                },
                'doc2': {
                    id: 'doc2',
                    type: 'caste_certificate',
                    filename: 'caste.pdf',
                    uploadDate: new Date(),
                    status: 'verified',
                    qualityScore: 85,
                    expiryDate: farExpiry,
                    extractedData: {}
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: mockDocuments
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            await documentManager.scheduleExpiryReminders('artisan123');

            // Should only schedule reminder for the document expiring within 30 days
            expect(mockCollection.add).toHaveBeenCalledTimes(1);
            expect(mockCollection.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'document_expiry_reminder',
                    priority: 'high' // High priority because it's within 7 days
                })
            );
        });
    });

    describe('Document Authenticity Checking', () => {
        it('should verify Aadhaar with government API', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'aadhaar',
                filename: 'aadhaar.jpg',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 90,
                extractedData: {
                    text: 'AADHAAR 1234 5678 9012',
                    aadhaarNumber: '123456789012',
                    ocrConfidence: 0.95
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            expect(result.isValid).toBe(true);
            expect(result.verificationMethod).toBe('government_api');
            expect(result.confidence).toBeGreaterThanOrEqual(0.95);
        });

        it('should validate GST number format', async () => {
            const documentId = 'doc_artisan123_1234567890_abc123';
            const mockDocument: DocumentInfo = {
                id: documentId,
                type: 'business_registration',
                filename: 'gst.pdf',
                uploadDate: new Date(),
                status: 'uploaded',
                qualityScore: 88,
                extractedData: {
                    text: 'GST 27AAPFU0939F1ZV',
                    gstNumber: '27AAPFU0939F1ZV',
                    ocrConfidence: 0.92
                }
            };

            const mockProfile: Partial<ArtisanProfile> = {
                id: 'artisan123',
                documents: {
                    [documentId]: mockDocument
                }
            };

            mockDoc.get.mockResolvedValue({
                exists: true,
                id: 'artisan123',
                data: () => mockProfile
            });

            const result = await documentManager.verifyDocument(documentId, 'auto');

            expect(result.isValid).toBe(true);
            expect(result.verificationDetails.documentNumber).toBe('27AAPFU0939F1ZV');
        });
    });
});
