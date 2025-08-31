'use client';

import { useAuth } from '@/context/auth-context';

export function usePermissions() {
  const { user, userProfile, loading, isArtisan, isBuyer } = useAuth();

  const permissions = {
    // Basic authentication checks
    isAuthenticated: !!user,
    hasProfile: !!userProfile,
    isLoading: loading,

    // Role-based permissions
    isArtisan,
    isBuyer,
    
    // Admin check (you can customize this logic)
    isAdmin: userProfile?.email?.includes('admin') || false,

    // Feature-specific permissions
    canCreateProducts: isArtisan,
    canPurchaseProducts: isBuyer || isArtisan, // Artisans can also buy
    canAccessArtisanTools: isArtisan,
    canAccessBuyerTools: isBuyer,
    canManageOrders: isArtisan || isBuyer,
    canAccessAnalytics: isArtisan,
    canManageProfile: !!userProfile,

    // Specific feature permissions based on your app structure
    canUseArthSaarthi: isArtisan, // Government scheme advisor for artisans
    canUseArtisanBuddy: isArtisan, // Digital twin chat for artisans
    canUseMatchmaking: isArtisan || isBuyer, // Both can use matchmaking
    canUseMultiMarketplace: isArtisan || isBuyer, // Both can access marketplace
    canUsePriceEngine: isArtisan, // Pricing suggestions for artisans
    canUseStoryGenerator: isArtisan, // Product story generation for artisans
    canUseTrendMapper: isArtisan || isBuyer, // Market trends for both
    canUseTrustLayer: isArtisan || isBuyer, // Trust and verification for both
    canUseYojanaMitra: isArtisan, // Scheme recommendations for artisans
  };

  return permissions;
}

// Utility function to check if user has specific permission
export function hasPermission(permission: keyof ReturnType<typeof usePermissions>): boolean {
  const permissions = usePermissions();
  return permissions[permission] as boolean;
}

// Higher-order component for permission-based rendering
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: keyof ReturnType<typeof usePermissions>,
  fallback?: React.ComponentType
) {
  return function PermissionWrappedComponent(props: T) {
    const permissions = usePermissions();
    const hasRequiredPermission = permissions[requiredPermission] as boolean;

    if (permissions.isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!hasRequiredPermission) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">You don't have permission to access this feature.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}