'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Header } from "@/components/header";
import { useAuth } from '@/context/auth-context';

interface PublicLayoutWrapperProps {
  children: React.ReactNode;
}

export default function PublicLayoutWrapper({ children }: PublicLayoutWrapperProps) {
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();
  
  // Routes that should not show the sidebar and header (like auth pages)
  const authRoutes = ['/auth'];
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (isAuthRoute) {
    // For auth routes, just show the content without sidebar/header
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // For public routes (like marketplace), show layout with sidebar/header
  // but don't require authentication
  return (
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
  );
}
