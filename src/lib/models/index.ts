// Export all models for easy importing
export { type IUser, type IUserDocument } from './User';
export type { default as User } from './User';
export { default as Chat, type IChatSession, type IChatMessage, type IChatDocument } from './Chat';
export { default as MatchHistory, type IMatchHistory, type IMatchResult, type ISearchQuery, type IMatchHistoryDocument } from './MatchHistory';
export { default as BuyerConnectOrder, type IBuyerConnectOrder, type IDesignCollaboration, type IPricingDetails, type IOrderTimeline, type ICulturalContext, type IBuyerConnectOrderDocument, type OrderStatus } from './BuyerConnectOrder';
export { default as VirtualShowroom, type IVirtualShowroom, type IShowroomImage, type IProcessVideo, type IARHotspot, type IVirtualShowroomDocument } from './VirtualShowroom';
export { default as AIAgentInteraction, type IAIAgentInteraction, type IAIAgentInteractionDocument } from './AIAgentInteraction';

// Re-export existing models
export type { default as Product } from './Product';
export type { default as Order } from './Order';
export type { default as Cart } from './Cart';
export type { default as Wishlist } from './Wishlist';