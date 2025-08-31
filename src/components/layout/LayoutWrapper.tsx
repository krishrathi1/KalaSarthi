'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Header } from "@/components/header";
import AuthGuard from "@/components/auth/AuthGuard";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Routes that should not show the sidebar and header (like auth pages)
  const authRoutes = ['/auth', '/login', '/register', '/signup'];
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (isAuthRoute) {
    // For auth routes, just show the content without sidebar/header
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
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
            <main className="flex-1 p-4 md:p-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}