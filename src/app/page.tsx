
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
    if (!loading && userProfile) {
      // Redirect authenticated users based on their role
      if (userProfile.role === 'buyer') {
        router.push('/marketplace');
      } else {
        // For artisans and other roles, show the main dashboard
        router.push('/dashboard');
      }
    }
  }, [userProfile, loading, router]);

  // Show loading while determining redirect
  // Improved loading state handling
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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
