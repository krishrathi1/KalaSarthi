
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { Dashboard } from '@/components/dashboard';

export default function Home() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (userProfile) {
        // Redirect authenticated users based on their role
        if (userProfile.role === 'buyer') {
          router.replace('/marketplace');
        } else {
          // For artisans and other roles, show the main dashboard
          router.replace('/dashboard');
        }
      }
      // If no user profile, stay on home page to show dashboard
    }
  }, [userProfile, loading, router]);

  // Show loading while determining redirect
  // Improved loading state handling
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10 mx-auto" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              KalaSarthi
            </h2>
            <p className="text-muted-foreground animate-pulse">
              Empowering Tradition with Technology...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard for unauthenticated users (with mock data)
  return (
    <div className="min-h-screen">
      <Dashboard />
    </div>
  );
}
