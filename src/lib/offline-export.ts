/**
 * Offline Data Export Utilities
 * Export cached data for backup or analysis
 */

import { offlineStorage } from './offline-storage';

export interface ExportOptions {
    includeProducts?: boolean;
    includeTrends?: boolean;
    includeCart?: boolean;
    includeWishlist?: boolean;
    includeChat?: boolean;
    format?: 'json' | 'csv';
    dateRange?: {
        start: Date;
        end: Date;
    };
}

export class OfflineExporter {
    /**
     * Export all offline data
     */
    async exportData(options: ExportOptions = {}) {
        const {
            includeProducts = true,
            includeTrends = true,
            includeCart = true,
            includeWishlist = true,
            includeChat = true,
            format = 'json',
            dateRange
        } = options;

        const exportData: any = {
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            data: {}
        };

        try {
            // Export products
            if (includeProducts) {
                const products = await offlineStorage.getProducts();
                exportData.data.products = this.filterByDate(products, dateRange);
            }

            // Export trends
            if (includeTrends) {
                const trends = await offlineStorage.getTrendData();
                exportData.data.trends = this.filterByDate(trends, dateRange);
            }

            // Export cart
            if (includeCart) {
                const cart = await offlineStorage.getCartItems();
                exportData.data.cart = this.filterByDate(cart, dateRange);
            }

            // Export wishlist
            if (includeWishlist) {
                const wishlist = await offlineStorage.getWishlistItems();
                exportData.data.wishlist = this.filterByDate(wishlist, dateRange);
            }

            // Export chat
            if (includeChat) {
                const chat = await offlineStorage.getChatMessages();
                exportData.data.chat = this.filterByDate(chat, dateRange);
            }

            // Get storage stats
            const storageUsage = await offlineStorage.getStorageUsage();
            exportData.storageStats = storageUsage;

            if (format === 'csv') {
                return this.convertToCSV(exportData);
            }

            return exportData;
        } catch (error) {
            console.error('Export failed:', error);
            throw new Error('Failed to export offline data');
        }
    }

    /**
     * Filter data by date range
     */
    private filterByDate(data: any[], dateRange?: { start: Date; end: Date }) {
        if (!dateRange || !Array.isArray(data)) return data;

        return data.filter(item => {
            const itemDate = new Date(item.timestamp || item.createdAt || item.date || 0);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    }

    /**
     * Convert data to CSV format
     */
    private convertToCSV(exportData: any): string {
        const csvSections: string[] = [];

        // Products CSV
        if (exportData.data.products?.length > 0) {
            csvSections.push('=== PRODUCTS ===');
            csvSections.push(this.arrayToCSV(exportData.data.products));
            csvSections.push('');
        }

        // Trends CSV
        if (exportData.data.trends?.length > 0) {
            csvSections.push('=== TRENDS ===');
            csvSections.push(this.arrayToCSV(exportData.data.trends));
            csvSections.push('');
        }

        // Cart CSV
        if (exportData.data.cart?.length > 0) {
            csvSections.push('=== CART ===');
            csvSections.push(this.arrayToCSV(exportData.data.cart));
            csvSections.push('');
        }

        // Wishlist CSV
        if (exportData.data.wishlist?.length > 0) {
            csvSections.push('=== WISHLIST ===');
            csvSections.push(this.arrayToCSV(exportData.data.wishlist));
            csvSections.push('');
        }

        // Chat CSV
        if (exportData.data.chat?.length > 0) {
            csvSections.push('=== CHAT ===');
            csvSections.push(this.arrayToCSV(exportData.data.chat));
            csvSections.push('');
        }

        return csvSections.join('\n');
    }

    /**
     * Convert array to CSV
     */
    private arrayToCSV(data: any[]): string {
        if (!data.length) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    /**
     * Download export as file
     */
    async downloadExport(options: ExportOptions = {}, filename?: string) {
        const data = await this.exportData(options);
        const format = options.format || 'json';

        const blob = new Blob(
            [format === 'json' ? JSON.stringify(data, null, 2) : data as string],
            { type: format === 'json' ? 'application/json' : 'text/csv' }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `kalabandhu-offline-export-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Get export summary
     */
    async getExportSummary(): Promise<{
        products: number;
        trends: number;
        cart: number;
        wishlist: number;
        chat: number;
        totalSize: number;
    }> {
        try {
            const [products, trends, cart, wishlist, chat, storageUsage] = await Promise.all([
                offlineStorage.getProducts(),
                offlineStorage.getTrendData(),
                offlineStorage.getCartItems(),
                offlineStorage.getWishlistItems(),
                offlineStorage.getChatMessages(),
                offlineStorage.getStorageUsage()
            ]);

            return {
                products: products.length,
                trends: trends.length,
                cart: cart.length,
                wishlist: wishlist.length,
                chat: chat.length,
                totalSize: storageUsage.used
            };
        } catch (error) {
            console.error('Failed to get export summary:', error);
            return {
                products: 0,
                trends: 0,
                cart: 0,
                wishlist: 0,
                chat: 0,
                totalSize: 0
            };
        }
    }
}

// Global exporter instance
export const offlineExporter = new OfflineExporter();