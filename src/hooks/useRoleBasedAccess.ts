'use client';

import { useAuth } from '@/context/auth-context';
import { usePathname } from 'next/navigation';

/**
 * Hook for role-based access control
 * Provides utilities for checking user permissions and route access
 */
export function useRoleBasedAccess() {
  const { userProfile, isArtisan, isBuyer, loading } = useAuth();
  const pathname = usePathname();

  // Routes that buyers should not see or access
  const buyerRestrictedRoutes = [
    '/dashboard/inventory',
    '/smart-product-creator',
    '/arth-saarthi',
    '/yojana-mitra',
    '/trend-mapper',
    '/voice-enrollment',
    '/trust-layer'
  ];

  // Routes that are public (no authentication required)
  const publicRoutes = ['/auth', '/', '/marketplace'];

  // Check if current route is restricted for buyers
  const isBuyerRestrictedRoute = buyerRestrictedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check if user can access current route
  const canAccessCurrentRoute = () => {
    if (isPublicRoute) return true;
    if (!userProfile) return false;
    if (isArtisan) return true; // Artisans can access everything
    if (isBuyer && isBuyerRestrictedRoute) return false;
    return true;
  };

  // Check if user can access a specific route
  const canAccessRoute = (route: string) => {
    if (publicRoutes.includes(route)) return true;
    if (!userProfile) return false;
    if (isArtisan) return true;
    if (isBuyer && buyerRestrictedRoutes.some(r => route.startsWith(r))) return false;
    return true;
  };

  // Get the appropriate redirect path based on user role
  const getDefaultPath = () => {
    if (!userProfile) return '/marketplace'; // Unauthenticated users go to marketplace
    if (isBuyer) return '/marketplace';
    if (isArtisan) return '/dashboard/inventory';
    return '/dashboard';
  };

  // Check if user should see a menu item
  const shouldShowMenuItem = (path: string) => {
    if (!userProfile) return true; // Show all while loading
    if (isArtisan) return true; // Artisans can see everything
    if (isBuyer) {
      return !buyerRestrictedRoutes.some(route => path.startsWith(route));
    }
    return true;
  };

  return {
    // User info
    userProfile,
    isArtisan,
    isBuyer,
    loading,
    userRole: userProfile?.role,

    // Route info
    pathname,
    isBuyerRestrictedRoute,
    isPublicRoute,

    // Access control functions
    canAccessCurrentRoute: canAccessCurrentRoute(),
    canAccessRoute,
    shouldShowMenuItem,
    getDefaultPath,

    // Route lists
    buyerRestrictedRoutes,
    publicRoutes
  };
}
