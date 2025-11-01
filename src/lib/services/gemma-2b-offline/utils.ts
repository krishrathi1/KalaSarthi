/**
 * Utility functions for Gemma 2B Offline Service
 * Provides system capability detection and helper functions
 */

import {
    SystemCheck,
    MemoryStats,
    BrowserSupport,
    SupportedLanguage,
    ArtisanDomain
} from '../../types/gemma-2b-offline';
import { BROWSER_SUPPORT, SYSTEM_REQUIREMENTS, LANGUAGE_CONFIG, ARTISAN_DOMAINS } from './constants';

// ============================================================================
// System Capability Detection
// ============================================================================

/**
 * Check if the current browser and system support Gemma 2B
 */
export function checkSystemCapabilities(): SystemCheck {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check WebGL support
    const hasWebGL = checkWebGLSupport();
    if (!hasWebGL) {
        warnings.push('WebGL not supported - AI acceleration unavailable');
        recommendations.push('Enable WebGL in browser settings or use a different browser');
    }

    // Check WebAssembly support
    const hasWebAssembly = checkWebAssemblySupport();
    if (!hasWebAssembly) {
        warnings.push('WebAssembly not supported - AI processing unavailable');
        recommendations.push('Update your browser to a version that supports WebAssembly');
    }

    // Check memory availability
    const memoryStats = getMemoryStats();
    const hasEnoughMemory = memoryStats.available >= SYSTEM_REQUIREMENTS.minMemoryMB;
    if (!hasEnoughMemory) {
        warnings.push(`Insufficient memory: ${memoryStats.available}MB available, ${SYSTEM_REQUIREMENTS.minMemoryMB}MB required`);
        recommendations.push('Close other applications to free up memory');
    }

    // Check browser compatibility
    const browserSupported = checkBrowserSupport();
    if (!browserSupported) {
        warnings.push('Browser version may not be fully supported');
        recommendations.push('Update to the latest browser version for best performance');
    }

    const isSupported = hasWebGL && hasWebAssembly && hasEnoughMemory && browserSupported;

    return {
        isSupported,
        hasWebGL,
        hasWebAssembly,
        availableMemory: memoryStats.available,
        browserSupported,
        warnings,
        recommendations
    };
}

/**
 * Check WebGL support
 */
export function checkWebGLSupport(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (error) {
        return false;
    }
}

/**
 * Check WebAssembly support
 */
export function checkWebAssemblySupport(): boolean {
    try {
        return typeof WebAssembly === 'object' &&
            typeof WebAssembly.instantiate === 'function';
    } catch (error) {
        return false;
    }
}

/**
 * Get current memory statistics
 */
export function getMemoryStats(): MemoryStats {
    // Try to get memory info from performance API
    const performance = (window as any).performance;

    if (performance && performance.memory) {
        const memory = performance.memory;
        return {
            used: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
            total: Math.round(memory.totalJSHeapSize / (1024 * 1024)),
            available: Math.round((memory.jsHeapSizeLimit - memory.usedJSHeapSize) / (1024 * 1024)),
            percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usedJSHeapSize: memory.usedJSHeapSize
        };
    }

    // Fallback estimates if memory API not available
    return {
        used: 0,
        total: 0,
        available: SYSTEM_REQUIREMENTS.recommendedMemoryMB, // Assume recommended amount
        percentage: 0
    };
}

/**
 * Check browser support
 */
export function checkBrowserSupport(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();

    // Chrome
    if (userAgent.includes('chrome')) {
        const version = extractChromeVersion(userAgent);
        return version >= parseInt(BROWSER_SUPPORT.chrome.min);
    }

    // Firefox
    if (userAgent.includes('firefox')) {
        const version = extractFirefoxVersion(userAgent);
        return version >= parseInt(BROWSER_SUPPORT.firefox.min);
    }

    // Safari
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        const version = extractSafariVersion(userAgent);
        return version >= parseInt(BROWSER_SUPPORT.safari.min);
    }

    // Edge
    if (userAgent.includes('edg')) {
        const version = extractEdgeVersion(userAgent);
        return version >= parseInt(BROWSER_SUPPORT.edge.min);
    }

    // Unknown browser - assume not supported
    return false;
}

// ============================================================================
// Language Detection Utilities
// ============================================================================

/**
 * Detect language from text input
 */
export function detectLanguage(text: string): SupportedLanguage {
    // Check for Hindi (Devanagari script)
    if (LANGUAGE_CONFIG.DETECTION_PATTERNS[SupportedLanguage.HINDI].test(text)) {
        return SupportedLanguage.HINDI;
    }

    // Default to English
    return SupportedLanguage.ENGLISH;
}

/**
 * Detect artisan domain from text
 */
export function detectArtisanDomain(text: string): ArtisanDomain {
    const lowerText = text.toLowerCase();

    // Check each domain for keyword matches
    for (const [domain, config] of Object.entries(ARTISAN_DOMAINS)) {
        const allKeywords = [...config.keywords, ...config.hindiKeywords];

        if (allKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
            return domain as ArtisanDomain;
        }
    }

    return ArtisanDomain.GENERAL;
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Measure function execution time
 */
export function measureExecutionTime<T>(
    fn: () => Promise<T>,
    label: string
): Promise<{ result: T; duration: number }> {
    return new Promise(async (resolve, reject) => {
        const startTime = performance.now();

        try {
            const result = await fn();
            const duration = performance.now() - startTime;

            console.log(`${label} completed in ${duration.toFixed(2)}ms`);

            resolve({ result, duration });
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`${label} failed after ${duration.toFixed(2)}ms:`, error);
            reject(error);
        }
    });
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;

    return (...args: Parameters<T>) => {
        const currentTime = Date.now();

        if (currentTime - lastExecTime > delay) {
            func(...args);
            lastExecTime = currentTime;
        } else {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                func(...args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Check available storage quota
 */
export async function checkStorageQuota(): Promise<{
    available: number;
    used: number;
    quota: number;
    percentage: number;
}> {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const quota = estimate.quota || 0;
            const used = estimate.usage || 0;
            const available = quota - used;
            const percentage = quota > 0 ? (used / quota) * 100 : 0;

            return {
                available: Math.round(available / (1024 * 1024)), // MB
                used: Math.round(used / (1024 * 1024)), // MB
                quota: Math.round(quota / (1024 * 1024)), // MB
                percentage: Math.round(percentage)
            };
        }
    } catch (error) {
        console.warn('Storage quota check failed:', error);
    }

    // Fallback values
    return {
        available: 1000, // 1GB estimate
        used: 0,
        quota: 1000,
        percentage: 0
    };
}

// ============================================================================
// Browser Version Extraction
// ============================================================================

function extractChromeVersion(userAgent: string): number {
    const match = userAgent.match(/chrome\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function extractFirefoxVersion(userAgent: string): number {
    const match = userAgent.match(/firefox\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function extractSafariVersion(userAgent: string): number {
    const match = userAgent.match(/version\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function extractEdgeVersion(userAgent: string): number {
    const match = userAgent.match(/edg\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English, ~6 for Hindi
    const language = detectLanguage(text);
    const charsPerToken = language === SupportedLanguage.HINDI ? 6 : 4;

    return Math.ceil(text.length / charsPerToken);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = estimateTokenCount(text);

    if (estimatedTokens <= maxTokens) {
        return text;
    }

    // Calculate approximate character limit
    const language = detectLanguage(text);
    const charsPerToken = language === SupportedLanguage.HINDI ? 6 : 4;
    const maxChars = maxTokens * charsPerToken;

    // Truncate at word boundary if possible
    if (text.length > maxChars) {
        const truncated = text.substring(0, maxChars);
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastSpace > maxChars * 0.8) { // If last space is reasonably close
            return truncated.substring(0, lastSpace) + '...';
        }

        return truncated + '...';
    }

    return text;
}