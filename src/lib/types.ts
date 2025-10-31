// Legacy ChatMessage interface for backward compatibility
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Re-export Enhanced Artisan Buddy types
export * from './types/enhanced-artisan-buddy';
export * from './utils/profile-utils';

// Re-export AI-Powered Scheme Sahayak types
export * from './types/scheme-sahayak';
