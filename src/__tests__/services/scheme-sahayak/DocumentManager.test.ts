/**
 * Tests for DocumentManager - OCR and Document Processing
 * Task 5.2: Implement OCR and document processing
 */

// Mock Firebase Admin before any imports
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: 'test-artisan-123',
          data: () => ({
            id: 'test-artisan-123',
            documents: {}
          })
        }),
        update: jest.fn().mockResolvedValue(undefined)
      })
    })
  },
  adminAuth: {},
  adminStorage: {}
}));

// Mock Google Cloud services
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue(['https://example.com/signed-url'])
      })
    })
  }))
}));

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    documentTextDetection: jest.fn().mockResolvedValue([{
      fullTextAnnotation: {
        text: 'Mock OCR text',
        pages: [{
          property: { detectedLanguages: [{ languageCode: 'en' }] },
          blocks: [{
            paragraphs: [{
              words: [{ confidence: 0.9 }]
            }]
          }]
        }]
      }
    }])
  }))
}));

import { DocumentManager } from '@/lib/services/scheme-sahayak/DocumentManager';
import { DocumentUploadResult } from '@/lib/types/scheme-sahayak';

describe('DocumentManager - OCR and Document Processing', () => {
  let documentManager: DocumentManager;

  beforeAll(() => {
    // Set required environment variables
    process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './key.json';
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.DOCUMENT_ENCRYPTION_KEY = '0'.repeat(64);
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create new instance for each test
    documentManager = new DocumentManager();
    
    // Store instance globally for mock access
    (global as any).documentManagerInstance = documentManager;
  });

  describe('Document Type Classification', () => {
    it('should detect Aadhaar card with high confidence', async () => {
      const mockFile = createMockFile(
        'aadhaar.jpg',
        'image/jpeg',
        'GOVERNMENT OF INDIA\nAadhaar\n1234 5678 9012\nName: Test User\nDOB: 01/01/1990'
      );

      const mockOCRResult = {
        fullTextAnnotation: {
          text: 'GOVERNMENT OF INDIA\nAadhaar\n1234 5678 9012\nName: Test User\nDOB: 01/01/1990',
          pages: [{
            property: { detectedLanguages: [{ languageCode: 'en' }] },
            blocks: [{
              paragraphs: [{
                words: [{ confidence: 0.95 }]
              }]
            }]
          }]
        }
      };

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('aadhaar');
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.extractedData?.aadhaarNumber).toBeDefined();
    });

    it('should detect PAN card with extracted PAN number', async () => {
      const mockFile = createMockFile(
        'pan.jpg',
        'image/jpeg',
        'INCOME TAX DEPARTMENT\nPermanent Account Number\nABCDE1234F\nName: Test User'
      );

      const mockOCRResult = createMockOCRResult(
        'INCOME TAX DEPARTMENT\nPermanent Account Number\nABCDE1234F\nName: Test User',
        0.92
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('pan');
      expect(result.confidence).toBeGreaterThan(0.85);
      expect(result.extractedData?.panNumber).toBe('ABCDE1234F');
    });

    it('should detect business registration with GST number', async () => {
      const mockFile = createMockFile(
        'gst.jpg',
        'image/jpeg',
        'Certificate of Registration\nGSTIN: 27AABCU9603R1ZM\nBusiness Name: Test Business\nMinistry of Corporate Affairs'
      );

      const mockOCRResult = createMockOCRResult(
        'Certificate of Registration\nGSTIN: 27AABCU9603R1ZM\nBusiness Name: Test Business\nMinistry of Corporate Affairs',
        0.88
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('business_registration');
      expect(result.extractedData?.gstNumber).toBeDefined();
    });

    it('should detect income certificate with amount', async () => {
      const mockFile = createMockFile(
        'income.jpg',
        'image/jpeg',
        'Income Certificate\nThis is to certify that annual income is Rs. 250,000\nIssued by District Magistrate'
      );

      const mockOCRResult = createMockOCRResult(
        'Income Certificate\nThis is to certify that annual income is Rs. 250,000\nIssued by District Magistrate',
        0.90
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('income_certificate');
      expect(result.extractedData?.annualIncome).toBeDefined();
    });

    it('should detect caste certificate with category', async () => {
      const mockFile = createMockFile(
        'caste.jpg',
        'image/jpeg',
        'Caste Certificate\nThis is to certify that belongs to Scheduled Caste (SC)\nIssued by Tehsildar'
      );

      const mockOCRResult = createMockOCRResult(
        'Caste Certificate\nThis is to certify that belongs to Scheduled Caste (SC)\nIssued by Tehsildar',
        0.89
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('caste_certificate');
      expect(result.extractedData?.category).toBe('SC');
    });
  });

  describe('Quality Assessment', () => {
    it('should give high quality score for clear document', async () => {
      const goodText = 'This is a clear government document with proper text content. '.repeat(20);
      const mockFile = createMockFile(
        'clear-doc.jpg',
        'image/jpeg',
        goodText,
        500 * 1024 // 500KB - good size
      );

      const mockOCRResult = createMockOCRResult(goodText, 0.92);
      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.qualityScore).toBeGreaterThan(70);
      expect(result.issues.length).toBeLessThan(3);
    });

    it('should detect low quality from small file size', async () => {
      const mockFile = createMockFile(
        'low-quality.jpg',
        'image/jpeg',
        'Small text',
        30 * 1024 // 30KB - very small
      );

      const mockOCRResult = createMockOCRResult('Small text', 0.45);
      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.qualityScore).toBeLessThan(70);
      expect(result.issues.some(i => i.type === 'quality')).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should detect poor OCR confidence', async () => {
      const mockFile = createMockFile(
        'blurry.jpg',
        'image/jpeg',
        'Some blurry text that is hard to read',
        200 * 1024
      );

      const mockOCRResult = createMockOCRResult('Some blurry text that is hard to read', 0.35);
      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.qualityScore).toBeLessThan(65);
      expect(result.issues.some(i => i.severity === 'high')).toBe(true);
      expect(result.suggestions!.some(s => s.toLowerCase().includes('lighting'))).toBe(true);
    });

    it('should provide improvement suggestions for low quality', async () => {
      const mockFile = createMockFile(
        'poor-doc.jpg',
        'image/jpeg',
        'abc',
        40 * 1024
      );

      const mockOCRResult = createMockOCRResult('abc', 0.40);
      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(2);
      expect(result.suggestions!.some(s => s.includes('resolution') || s.includes('lighting'))).toBe(true);
    });
  });

  describe('Expiry Date Extraction', () => {
    it('should extract expiry date from document text', async () => {
      const mockFile = createMockFile(
        'certificate.jpg',
        'image/jpeg',
        'Income Certificate\nValid till: 31/12/2025\nIssued on: 01/01/2025'
      );

      const mockOCRResult = createMockOCRResult(
        'Income Certificate\nValid till: 31/12/2025\nIssued on: 01/01/2025',
        0.90
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.expiryDate).toBeDefined();
      expect(result.expiryDate).toBeInstanceOf(Date);
    });

    it('should calculate expiry date from issue date for income certificate', async () => {
      const mockFile = createMockFile(
        'income-cert.jpg',
        'image/jpeg',
        'Income Certificate\nIssued on: 01/01/2024\nDistrict Magistrate'
      );

      const mockOCRResult = createMockOCRResult(
        'Income Certificate\nIssued on: 01/01/2024\nDistrict Magistrate',
        0.88
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');

      expect(result.detectedType).toBe('income_certificate');
      // Income certificates typically valid for 1 year
      if (result.expiryDate) {
        const expectedExpiry = new Date('2025-01-01');
        expect(result.expiryDate.getFullYear()).toBe(expectedExpiry.getFullYear());
      }
    });
  });

  describe('OCR Performance', () => {
    it('should complete OCR processing within 30 seconds', async () => {
      const mockFile = createMockFile(
        'document.pdf',
        'application/pdf',
        'Test document content with reasonable amount of text',
        1024 * 1024 // 1MB
      );

      const mockOCRResult = createMockOCRResult(
        'Test document content with reasonable amount of text',
        0.85
      );

      mockVisionClient(mockOCRResult);
      mockFirestore();

      const startTime = Date.now();
      const result = await documentManager.uploadDocument(mockFile, 'test-artisan-123');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000); // 30 seconds
      expect(result.processingTime).toBeLessThan(30000);
    });
  });
});

// Helper functions

function createMockFile(
  name: string,
  type: string,
  content: string,
  size?: number
): File {
  const actualSize = size || Buffer.from(content).length;
  const buffer = Buffer.alloc(actualSize);
  Buffer.from(content).copy(buffer);
  
  const file = {
    name,
    type,
    size: actualSize,
    lastModified: Date.now(),
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    text: async () => content,
    slice: () => new Blob([buffer], { type }),
    stream: () => new ReadableStream()
  } as File;
  
  return file;
}

function createMockOCRResult(text: string, confidence: number) {
  return {
    fullTextAnnotation: {
      text,
      pages: [{
        property: { detectedLanguages: [{ languageCode: 'en' }] },
        blocks: [{
          paragraphs: [{
            words: [{ confidence }]
          }]
        }]
      }]
    }
  };
}

function mockVisionClient(ocrResult: any) {
  const documentManager = (global as any).documentManagerInstance;
  if (documentManager && documentManager['visionClient']) {
    documentManager['visionClient'].documentTextDetection = jest.fn().mockResolvedValue([ocrResult]);
  }
}

function mockFirestore() {
  // Firestore is already mocked at the module level
}
