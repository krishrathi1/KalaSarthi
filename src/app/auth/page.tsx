'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // or 'next/navigation' for app directory
import { useAuth } from '@/context/auth-context';
import PhoneAuth from '@/components/auth/PhoneAuth';

import { User } from 'firebase/auth';
import UserRegistrationForm from '@/components/auth/UserRegistrationForm';

// Define types for the component
type AuthStep = 'login' | 'register';

interface UserProfileResponse {
  success: boolean;
  data?: any; // Replace with your actual user profile type
}

interface UserData {
  // Define the structure of userData based on your registration form
  [key: string]: any;
}

const AuthPage: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!loading && user && userProfile) {
      // User is authenticated and has a profile, redirect to dashboard
      router.push('/dashboard');
    }
  }, [user, userProfile, loading, router]);

  const handleAuthSuccess = async (firebaseUser: User): Promise<void> => {
    console.log('Authentication successful:', firebaseUser);
    setAuthenticatedUser(firebaseUser);
    
    // Check if user profile exists in MongoDB
    try {
      const response = await fetch(`/api/users/${firebaseUser.uid}`);
      
      if (response.ok) {
        const result: UserProfileResponse = await response.json();
        if (result.success && result.data) {
          // User already has a profile, redirect to dashboard
          console.log('User profile found, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          // New user, show registration form
          setAuthStep('register');
        }
      } else if (response.status === 404) {
        // User not found, show registration form
        setAuthStep('register');
      } else {
        console.error('Error checking user profile');
        setAuthStep('register'); // Default to registration on error
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      setAuthStep('register'); // Default to registration on error
    }
  };

  const handleRegistrationComplete = (userData: UserData): void => {
    console.log('Registration completed:', userData);
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-headline font-bold text-foreground mb-4">
            KalaMitra
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered artisan marketplace. Connect with talented craftspeople and discover authentic handmade treasures.
          </p>
        </div>

        {authStep === 'login' && (
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
        )}

        {authStep === 'register' && authenticatedUser && (
          <UserRegistrationForm
            user={authenticatedUser}
            onRegistrationComplete={handleRegistrationComplete}
          />
        )}
      </div>
    </div>
  );
};

export default AuthPage;