/**
 * Compliance and Privacy Service for Enhanced Artisan Buddy
 * 
 * Handles GDPR compliance, data retention, and privacy controls
 * Requirements: 4.2, 6.4, 7.4
 */

import { EnhancedArtisanBuddyAuth, DataProtection } from '../middleware/enhanced-artisan-buddy-auth';
import { ConversationStateService } from './ConversationStateService';
import { ArtisanProfile, ConversationContext } from '../types/enhanced-artisan-buddy';

export interface DataRetentionPolicy {
    conversationRetentionDays: number;
    profileRetentionDays: number;
    auditLogRetentionDays: number;
    anonymizeAfterDays: number;
}

export interface PrivacySettings {
    allowDataCollection: boolean;
    allowAnalytics: boolean;
    allowPersonalization: boolean;
    dataProcessingConsent: boolean;
    marketingConsent: boolean;
}

export interface DataExportRequest {
    userId: string;
    requestId: string;
    requestDate: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    expiryDate?: Date;
}

export interface DataDeletionRequest {
    userId: string;
    requestId: string;
    requestDate: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    deletionType: 'partial' | 'complete';
    retainAnonymized: boolean;
}

export class ComplianceService {
    private static instance: ComplianceService;
    private auth: EnhancedArtisanBuddyAuth;
    private conversationService: ConversationStateService;
    private retentionPolicy: DataRetentionPolicy;
    private exportRequests: Map<string, DataExportRequest> = new Map();
    private deletionRequests: Map<string, DataDeletionRequest> = new Map();

    private constructor() {
        this.auth = EnhancedArtisanBuddyAuth.getInstance();
        this.conversationService = ConversationStateService.getInstance();
        this.retentionPolicy = {
            conversationRetentionDays: parseInt(process.env.CONVERSATION_RETENTION_DAYS || '365'),
            profileRetentionDays: parseInt(process.env.PROFILE_RETENTION_DAYS || '1095'), // 3 years
            auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '2555'), // 7 years
            anonymizeAfterDays: parseInt(process.env.ANONYMIZE_AFTER_DAYS || '730') // 2 years
        };
    }

    public static getInstance(): ComplianceService {
        if (!ComplianceService.instance) {
            ComplianceService.instance = new ComplianceService();
        }
        return ComplianceService.instance;
    }

    /**
     * Handle GDPR data export request (Right to Data Portability)
     */
    public async requestDataExport(userId: string): Promise<string> {
        const requestId = this.generateRequestId();

        const exportRequest: DataExportRequest = {
            userId,
            requestId,
            requestDate: new Date(),
            status: 'pending'
        };

        this.exportRequests.set(requestId, exportRequest);

        // Log the request
        this.auth.auditLog({
            userId,
            action: 'data_export_requested',
            resource: 'user_data',
            details: { requestId }
        });

        // Process the export asynchronously
        this.processDataExport(requestId).catch(error => {
            console.error('Data export processing failed:', error);
            exportRequest.status = 'failed';
        });

        return requestId;
    }

    /**
     * Handle GDPR data deletion request (Right to be Forgotten)
     */
    public async requestDataDeletion(
        userId: string,
        deletionType: 'partial' | 'complete' = 'complete',
        retainAnonymized: boolean = false
    ): Promise<string> {
        const requestId = this.generateRequestId();

        const deletionRequest: DataDeletionRequest = {
            userId,
            requestId,
            requestDate: new Date(),
            status: 'pending',
            deletionType,
            retainAnonymized
        };

        this.deletionRequests.set(requestId, deletionRequest);

        // Log the request
        this.auth.auditLog({
            userId,
            action: 'data_deletion_requested',
            resource: 'user_data',
            details: { requestId, deletionType, retainAnonymized }
        });

        // Process the deletion asynchronously
        this.processDataDeletion(requestId).catch(error => {
            console.error('Data deletion processing failed:', error);
            deletionRequest.status = 'failed';
        });

        return requestId;
    }

    /**
     * Get user's privacy settings
     */
    public async getPrivacySettings(userId: string): Promise<PrivacySettings> {
        // In production, this would retrieve from database
        // For now, return default settings
        return {
            allowDataCollection: true,
            allowAnalytics: false,
            allowPersonalization: true,
            dataProcessingConsent: true,
            marketingConsent: false
        };
    }

    /**
     * Update user's privacy settings
     */
    public async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
        // Log the privacy settings update
        this.auth.auditLog({
            userId,
            action: 'privacy_settings_updated',
            resource: 'user_preferences',
            details: settings
        });

        // In production, this would update the database
        console.log(`Privacy settings updated for user ${userId}:`, settings);
    }

    /**
     * Check if user has given consent for specific data processing
     */
    public async hasConsent(userId: string, consentType: keyof PrivacySettings): Promise<boolean> {
        const settings = await this.getPrivacySettings(userId);
        return settings[consentType] || false;
    }

    /**
     * Anonymize old conversation data according to retention policy
     */
    public async anonymizeOldData(): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.anonymizeAfterDays);

        let anonymizedCount = 0;

        try {
            // Get all conversations older than cutoff date
            const oldConversations = await this.getConversationsOlderThan(cutoffDate);

            for (const conversation of oldConversations) {
                // Check if user has consent for data processing
                const hasConsent = await this.hasConsent(conversation.userId, 'allowDataCollection');

                if (!hasConsent) {
                    // Delete data if no consent
                    await this.conversationService.deleteConversationContext(conversation.conversationId);
                } else {
                    // Anonymize the conversation data
                    const anonymizedData = DataProtection.anonymizeConversationData(conversation);
                    await this.conversationService.storeConversationContext(anonymizedData);
                    anonymizedCount++;
                }
            }

            // Log the anonymization process
            this.auth.auditLog({
                userId: 'system',
                action: 'data_anonymization_completed',
                resource: 'conversation_data',
                details: { anonymizedCount, cutoffDate: cutoffDate.toISOString() }
            });

        } catch (error) {
            console.error('Data anonymization failed:', error);
            throw error;
        }

        return anonymizedCount;
    }

    /**
     * Delete expired data according to retention policy
     */
    public async deleteExpiredData(): Promise<{ conversations: number; profiles: number }> {
        const conversationCutoff = new Date();
        conversationCutoff.setDate(conversationCutoff.getDate() - this.retentionPolicy.conversationRetentionDays);

        const profileCutoff = new Date();
        profileCutoff.setDate(profileCutoff.getDate() - this.retentionPolicy.profileRetentionDays);

        let deletedConversations = 0;
        let deletedProfiles = 0;

        try {
            // Delete old conversations
            const expiredConversations = await this.getConversationsOlderThan(conversationCutoff);
            for (const conversation of expiredConversations) {
                await this.conversationService.deleteConversationContext(conversation.conversationId);
                deletedConversations++;
            }

            // Delete old profiles (in production, this would query a profile database)
            // For now, just log the action
            this.auth.auditLog({
                userId: 'system',
                action: 'expired_data_deletion_completed',
                resource: 'user_data',
                details: {
                    deletedConversations,
                    deletedProfiles,
                    conversationCutoff: conversationCutoff.toISOString(),
                    profileCutoff: profileCutoff.toISOString()
                }
            });

        } catch (error) {
            console.error('Expired data deletion failed:', error);
            throw error;
        }

        return { conversations: deletedConversations, profiles: deletedProfiles };
    }

    /**
     * Generate compliance report
     */
    public async generateComplianceReport(): Promise<{
        totalUsers: number;
        activeConversations: number;
        anonymizedConversations: number;
        pendingExportRequests: number;
        pendingDeletionRequests: number;
        dataRetentionCompliance: boolean;
    }> {
        const report = {
            totalUsers: 0,
            activeConversations: 0,
            anonymizedConversations: 0,
            pendingExportRequests: Array.from(this.exportRequests.values()).filter(r => r.status === 'pending').length,
            pendingDeletionRequests: Array.from(this.deletionRequests.values()).filter(r => r.status === 'pending').length,
            dataRetentionCompliance: true
        };

        // In production, this would query actual databases
        // For now, return mock data
        return report;
    }

    /**
     * Validate data processing legality
     */
    public async validateDataProcessing(userId: string, processingType: string): Promise<boolean> {
        try {
            // Check if user has given consent
            const hasConsent = await this.hasConsent(userId, 'dataProcessingConsent');

            if (!hasConsent) {
                this.auth.auditLog({
                    userId,
                    action: 'data_processing_denied',
                    resource: 'user_data',
                    details: { processingType, reason: 'no_consent' }
                });
                return false;
            }

            // Check if processing is within retention policy
            const userConversations = await this.conversationService.getUserConversations(userId);
            const oldestConversation = userConversations.reduce((oldest, current) =>
                current.sessionMetadata.startTime < oldest.sessionMetadata.startTime ? current : oldest
            );

            if (oldestConversation) {
                const dataAge = Date.now() - oldestConversation.sessionMetadata.startTime.getTime();
                const maxAge = this.retentionPolicy.conversationRetentionDays * 24 * 60 * 60 * 1000;

                if (dataAge > maxAge) {
                    this.auth.auditLog({
                        userId,
                        action: 'data_processing_denied',
                        resource: 'user_data',
                        details: { processingType, reason: 'data_expired' }
                    });
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Data processing validation failed:', error);
            return false;
        }
    }

    // Private helper methods

    private async processDataExport(requestId: string): Promise<void> {
        const request = this.exportRequests.get(requestId);
        if (!request) {
            throw new Error('Export request not found');
        }

        request.status = 'processing';

        try {
            // Collect all user data
            const userData = await this.collectUserData(request.userId);

            // Create export file (in production, this would be stored securely)
            const exportData = {
                exportDate: new Date().toISOString(),
                userId: request.userId,
                data: userData
            };

            // Generate download URL (mock)
            request.downloadUrl = `https://secure-exports.example.com/${requestId}.json`;
            request.expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            request.status = 'completed';

            // Log completion
            this.auth.auditLog({
                userId: request.userId,
                action: 'data_export_completed',
                resource: 'user_data',
                details: { requestId, downloadUrl: request.downloadUrl }
            });

        } catch (error) {
            request.status = 'failed';
            throw error;
        }
    }

    private async processDataDeletion(requestId: string): Promise<void> {
        const request = this.deletionRequests.get(requestId);
        if (!request) {
            throw new Error('Deletion request not found');
        }

        request.status = 'processing';

        try {
            if (request.deletionType === 'complete') {
                // Delete all user data
                await this.deleteAllUserData(request.userId, request.retainAnonymized);
            } else {
                // Partial deletion - keep essential data
                await this.deletePartialUserData(request.userId);
            }

            request.status = 'completed';

            // Log completion
            this.auth.auditLog({
                userId: request.userId,
                action: 'data_deletion_completed',
                resource: 'user_data',
                details: {
                    requestId,
                    deletionType: request.deletionType,
                    retainAnonymized: request.retainAnonymized
                }
            });

        } catch (error) {
            request.status = 'failed';
            throw error;
        }
    }

    private async collectUserData(userId: string): Promise<any> {
        // Collect all user data for export
        const conversations = await this.conversationService.getUserConversations(userId);
        const privacySettings = await this.getPrivacySettings(userId);

        return {
            conversations: conversations.map(conv => ({
                conversationId: conv.conversationId,
                startTime: conv.sessionMetadata.startTime,
                messageCount: conv.sessionMetadata.messageCount,
                messages: conv.conversationHistory
            })),
            privacySettings,
            profileData: conversations[0]?.profileContext || null
        };
    }

    private async deleteAllUserData(userId: string, retainAnonymized: boolean): Promise<void> {
        // Get all user conversations
        const conversations = await this.conversationService.getUserConversations(userId);

        for (const conversation of conversations) {
            if (retainAnonymized) {
                // Anonymize and keep for analytics
                const anonymizedData = DataProtection.anonymizeConversationData(conversation);
                await this.conversationService.storeConversationContext(anonymizedData);
            } else {
                // Complete deletion
                await this.conversationService.deleteConversationContext(conversation.conversationId);
            }
        }
    }

    private async deletePartialUserData(userId: string): Promise<void> {
        // Delete sensitive data but keep anonymized analytics data
        const conversations = await this.conversationService.getUserConversations(userId);

        for (const conversation of conversations) {
            const anonymizedData = DataProtection.anonymizeConversationData(conversation);
            await this.conversationService.storeConversationContext(anonymizedData);
        }
    }

    private async getConversationsOlderThan(cutoffDate: Date): Promise<ConversationContext[]> {
        // In production, this would query the database efficiently
        // For now, get all conversations and filter
        const allConversations: ConversationContext[] = [];

        // This is a simplified implementation
        // In production, you'd have a proper database query
        return allConversations.filter(conv =>
            conv.sessionMetadata.startTime < cutoffDate
        );
    }

    private generateRequestId(): string {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}