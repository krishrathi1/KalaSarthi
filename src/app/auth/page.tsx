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
  const { user, userProfile, loading, demoLogin } = useAuth();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user && userProfile) {
      // User is authenticated and has a profile, redirect based on role
      if (userProfile.role === 'buyer') {
        router.push('/marketplace');
      } else {
        // For artisans and other roles, show the main dashboard
        router.push('/dashboard');
      }
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
          // User already has a profile, redirect based on role
          console.log('User profile found, redirecting based on role');
          if (result.data.role === 'buyer') {
            router.push('/marketplace');
          } else if (result.data.role === 'artisan') {
            router.push('/dashboard');
          } else {
            router.push('/dashboard');
          }
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
    // Redirect based on role after registration
    if (userData.role === 'buyer') {
      router.push('/marketplace');
    } else if (userData.role === 'artisan') {
      router.push('/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const handleDemoLogin = async (): Promise<void> => {
    setDemoLoading(true);
    setDemoSuccess(false);
    try {
      const success = await demoLogin('+919876543210');

      if (success) {
        console.log('Demo login successful, redirecting to dashboard...');
        setDemoSuccess(true);
        // Small delay to show success state
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        console.error('Demo login failed');
        alert('Demo login failed. Please try again or use regular login.');
      }
    } catch (error) {
      console.error('Error during demo login:', error);
      alert('An error occurred during demo login. Please try again.');
    } finally {
      setTimeout(() => {
        setDemoLoading(false);
      }, 800);
    }
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
    <div className="min-h-screen bg-background py-6 sm:py-8 lg:py-12 px-4">
      <div className="container mx-auto max-w-md sm:max-w-lg lg:max-w-2xl">
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-foreground mb-2 sm:mb-4">
            KalaSarthi
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
            Your AI-powered artisan marketplace. Connect with talented craftspeople and discover authentic handmade treasures.
          </p>
        </div>

        {authStep === 'login' && (
          <>
            <PhoneAuth onAuthSuccess={handleAuthSuccess} />

            {/* Demo Login Section for Judges */}
            <div className="mt-6 sm:mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Quick Access for Judges
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-200 dark:border-blue-800 max-w-sm sm:max-w-md mx-auto">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Demo Login
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      Skip authentication and explore the platform instantly with a test artisan profile
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDemoLogin}
                  disabled={loading || demoLoading || demoSuccess}
                  className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${demoSuccess
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    } text-white`}
                >
                  {demoSuccess ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Success! Redirecting...</span>
                    </>
                  ) : demoLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span>Enter as Demo Artisan</span>
                    </>
                  )}
                </button>

                <div className="mt-3 p-2 bg-white/50 dark:bg-black/20 rounded text-xs text-center text-blue-600 dark:text-blue-400">
                  <span className="font-medium">Test Profile:</span> +919876543210
                </div>
              </div>

            </div>
          </>
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