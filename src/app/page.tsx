
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect based on user authentication status and role
      if (!userProfile) {
        // Unauthenticated users go to marketplace
        router.push('/marketplace');
      } else if (userProfile.role === 'buyer') {
        router.push('/marketplace');
      } else if (userProfile.role === 'artisan') {
        router.push('/dashboard/inventory');
      } else {
        router.push('/dashboard');
      }
    }
  }, [userProfile, loading, router]);

  // Show loading while determining redirect
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

  // This should not be reached due to the redirect, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
