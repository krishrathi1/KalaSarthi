'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { user, userProfile, loading } = useAuth();
    const { 
        pathname, 
        isPublicRoute, 
        isBuyerRestrictedRoute, 
        isBuyer, 
        isArtisan, 
        getDefaultPath 
    } = useRoleBasedAccess();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        // If on public route, no need to check auth
        if (isPublicRoute) return;

        // If not authenticated, redirect to auth page
        if (!user) {
            router.push('/auth');
            return;
        }

        // If authenticated but no profile, redirect to auth to complete registration
        if (user && !userProfile) {
            router.push('/auth');
            return;
        }

        // If on auth page but already authenticated with profile, redirect based on role
        if (pathname === '/auth' && user && userProfile) {
            console.log('AuthGuard: Redirecting from auth page, user role:', userProfile.role);
            const redirectPath = getDefaultPath();
            console.log('AuthGuard: Redirecting to:', redirectPath);
            router.push(redirectPath);
            return;
        }

        // Role-based route protection and redirection
        if (userProfile) {
            // Redirect buyer trying to access artisan tools
            if (isBuyerRestrictedRoute && isBuyer) {
                router.push('/marketplace');
                return;
            }
        }
    }, [user, userProfile, loading, pathname, router, isPublicRoute, isBuyerRestrictedRoute, isBuyer, getDefaultPath]);

    // Show loading for protected routes
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Don't render protected content if not authenticated
    if (!isPublicRoute && !user) {
        return null;
    }

    // Don't render protected content if no profile
    if (!isPublicRoute && user && !userProfile) {
        return null;
    }

    // Show access denied message only for buyers accessing restricted routes
    if (userProfile && !isPublicRoute) {
        if (isBuyerRestrictedRoute && isBuyer) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center p-8 max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Artisan Tools Access</h2>
                        <p className="text-muted-foreground mb-4">
                            This feature is designed for artisans to manage their craft and business.
                        </p>
                        <button
                            onClick={() => router.push('/marketplace')}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                        >
                            Go to Marketplace
                        </button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}

// Simple role guards
export function ArtisanGuard({ children }: AuthGuardProps) {
    const { userProfile, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (userProfile?.role !== 'artisan') {
        return (
            <div className="text-center p-8">
                <p className="text-muted-foreground">This feature is only available to artisans.</p>
            </div>
        );
    }

    return <>{children}</>;
}

export function BuyerGuard({ children }: AuthGuardProps) {
    const { userProfile, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (userProfile?.role !== 'buyer') {
        return (
            <div className="text-center p-8">
                <p className="text-muted-foreground">This feature is only available to buyers.</p>
            </div>
        );
    }

    return <>{children}</>;
}

// Utility function to check route access
export function canAccessRoute(pathname: string, userRole?: 'artisan' | 'buyer'): boolean {
    const buyerRestrictedRoutes = [
        '/arth-saarthi',
        '/price-engine',
        '/smart-product-creator',
        '/yojana-mitra',
        '/dashboard/inventory',
        '/trend-spotter',
        '/voice-enrollment'
    ];

    const publicRoutes = ['/auth', '/marketplace'];

    // Public routes are accessible to everyone
    if (publicRoutes.includes(pathname)) {
        return true;
    }

    // If no user role, can't access protected routes
    if (!userRole) {
        return false;
    }

    // Artisans can access all routes
    if (userRole === 'artisan') {
        return true;
    }

    // Buyers cannot access artisan tools
    if (buyerRestrictedRoutes.some(route => pathname.startsWith(route))) {
        return false;
    }

    // All other routes are accessible to buyers
    return true;
}

// Hook to check current route access (deprecated - use useRoleBasedAccess instead)
export function useRouteAccess() {
    const { userProfile } = useAuth();
    const pathname = usePathname();

    const buyerRestrictedRoutes = [
        '/arth-saarthi', 
        '/price-engine', 
        '/smart-product-creator', 
        '/yojana-mitra',
        '/dashboard/inventory',
        '/trend-spotter',
        '/voice-enrollment'
    ];

    return {
        canAccess: canAccessRoute(pathname, userProfile?.role),
        isBuyerRestrictedRoute: buyerRestrictedRoutes.some(route => pathname.startsWith(route)),
        isArtisan: userProfile?.role === 'artisan',
        isBuyer: userProfile?.role === 'buyer',
        userRole: userProfile?.role
    };
}