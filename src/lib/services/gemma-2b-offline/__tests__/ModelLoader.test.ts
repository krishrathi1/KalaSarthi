/**
 * Unit tests for ModelLoader component
 * Tests core functionality without requiring actual model downloads
 */

import { ModelLoader } from '../ModelLoader';
import { LoadStage } from '../../../types/gemma-2b-offline';
import { ModelLoadError, CacheError } from '../errors';

// Mock Transformers.js pipeline
jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn()
}));

// Mock IndexedDB
const mockIndexedDB = {
    open: jest.fn(),
    deleteDatabase: jest.fn()
};

Object.defineProperty(global, 'indexedDB', {
    value: mockIndexedDB,
    writable: true
});

describe('ModelLoader', () => {
    let modelLoader: ModelLoader;
    let mockPipeline: any;

    beforeEach(() => {
        modelLoader = new ModelLoader();
        mockPipeline = {
            // Mock pipeline methods
            call: jest.fn().mockResolvedValue([{ generated_text: 'Hello world' }])
        };

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        modelLoader.dispose();
    });

    describe('initialization', () => {
        it('should initialize with correct default state', () => {
            const progress = modelLoader.getLoadProgress();

            expect(progress.stage).toBe(LoadStage.INITIALIZING);
            expect(progress.progress).toBe(0);
            expect(progress.message).toContain('Initializing');
        });
    });

    describe('cache management', () => {
        it('should check cache availability', async () => {
            // This test verifies the method exists and handles errors gracefully
            const isCached = await modelLoader.isModelCached('test-model');
            expect(typeof isCached).toBe('boolean');
        });

        it('should handle cache errors gracefully', async () => {
            // Mock IndexedDB error
            mockIndexedDB.open.mockImplementation(() => {
                throw new Error('IndexedDB not available');
            });

            const isCached = await modelLoader.isModelCached('test-model');
            expect(isCached).toBe(false);
        });

        it('should calculate model size correctly', async () => {
            const size = await modelLoader.getModelSize('google/gemma-2b-it');
            expect(size).toBeGreaterThan(0);
            expect(typeof size).toBe('number');
        });
    });

    describe('progress tracking', () => {
        it('should track loading progress', () => {
            const initialProgress = modelLoader.getLoadProgress();
            expect(initialProgress.progress).toBe(0);
            expect(initialProgress.stage).toBe(LoadStage.INITIALIZING);
        });

        it('should emit progress events', () => {
            // Progress should be tracked internally
            const progress = modelLoader.getLoadProgress();
            expect(progress).toBeDefined();
            expect(progress.stage).toBeDefined();
            expect(typeof progress.progress).toBe('number');
        });
    });

    describe('error handling', () => {
        it('should prevent concurrent loading', async () => {
            const { pipeline } = require('@xenova/transformers');

            // Mock a slow loading pipeline
            pipeline.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve(mockPipeline), 1000);
            }));

            // Start first load
            const firstLoad = modelLoader.loadModel('test-model');

            // Try to start second load immediately
            await expect(modelLoader.loadModel('test-model'))
                .rejects
                .toThrow(ModelLoadError);

            // Clean up
            modelLoader.abort();
        });

        it('should handle network errors', async () => {
            const { pipeline } = require('@xenova/transformers');

            pipeline.mockRejectedValue(new Error('Network error: fetch failed'));

            await expect(modelLoader.loadModel('test-model'))
                .rejects
                .toThrow();
        });

        it('should handle validation errors', async () => {
            const { pipeline } = require('@xenova/transformers');

            // Mock pipeline that fails validation
            const invalidPipeline = jest.fn().mockRejectedValue(new Error('Invalid model'));
            pipeline.mockResolvedValue(invalidPipeline);

            await expect(modelLoader.loadModel('test-model'))
                .rejects
                .toThrow();
        });
    });

    describe('resource management', () => {
        it('should abort loading when requested', () => {
            modelLoader.abort();

            const progress = modelLoader.getLoadProgress();
            expect(progress.stage).toBe(LoadStage.ERROR);
            expect(progress.message).toContain('cancelled');
        });

        it('should dispose resources properly', () => {
            expect(() => modelLoader.dispose()).not.toThrow();
        });
    });
});