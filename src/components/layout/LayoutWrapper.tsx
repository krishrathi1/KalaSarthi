'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Header } from "@/components/header";
import AuthGuard from "@/components/auth/AuthGuard";
import PublicLayoutWrapper from "@/components/layout/PublicLayoutWrapper";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Routes that should not show the sidebar and header (like auth pages)
  const authRoutes = ['/auth'];
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // Public routes that don't require authentication (including root path)
  const publicRoutes = ['/marketplace', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (isAuthRoute) {
    // For auth routes, just show the content without sidebar/header
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  if (isPublicRoute) {
    // For public routes, show layout without authentication requirement
    return (
      <PublicLayoutWrapper>
        {children}
      </PublicLayoutWrapper>
    );
  }

  // For all other routes, wrap with AuthGuard and show sidebar/header
  return (
    <AuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}