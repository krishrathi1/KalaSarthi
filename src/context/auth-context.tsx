'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";

// Address interface matching the backend schema
// Enhanced type definitions for better type safety
interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

// UserProfile interface matching the MongoDB schema
interface UserProfile {
  _id?: string; // MongoDB ObjectId
  uid: string; // Firebase UID
  email?: string;
  name: string;
  phone: string;
  role: "artisan" | "buyer";
  artisticProfession: string;
  description?: string;
  profileImage?: string;
  address?: Address;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  isArtisan: boolean;
  isBuyer: boolean;
  refreshUserProfile: () => Promise<void>; // Added method to refresh profile
  demoLogin: (phone: string) => Promise<boolean>; // Demo login for judges/testers
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = (): AuthContextType => useContext(AuthContext);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Function to fetch user profile
  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Convert date strings to Date objects if needed
          const userData = result.data;
          if (userData.createdAt && typeof userData.createdAt === 'string') {
            userData.createdAt = new Date(userData.createdAt);
          }
          if (userData.updatedAt && typeof userData.updatedAt === 'string') {
            userData.updatedAt = new Date(userData.updatedAt);
          }
          return userData as UserProfile;
        }
      } else {
        console.error('Failed to fetch user profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
    return null;
  };

  // Function to refresh user profile (useful after profile updates)
  const refreshUserProfile = async (): Promise<void> => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    // Skip Firebase auth listener if in demo mode
    if (isDemoMode) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch user profile from MongoDB via API
        const profile = await fetchUserProfile(firebaseUser.uid);
        setUserProfile(profile);
        
        // If no profile exists in MongoDB, you might want to create one
        if (!profile) {
          console.warn(`No profile found for user ${firebaseUser.uid}. Consider creating one.`);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [isDemoMode]);

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // If in demo mode, just clear state
      if (isDemoMode) {
        setIsDemoMode(false);
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('demoMode');
        localStorage.removeItem('demoProfile');
      } else {
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  // Demo login function for judges/testers
  const demoLogin = async (phone: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Fetch user profile by phone number
      const response = await fetch(`/api/users/demo?phone=${encodeURIComponent(phone)}`);
      
      if (!response.ok) {
        console.error('Demo login failed:', response.status);
        return false;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // Create a mock Firebase user object
        const mockUser = {
          uid: result.data.uid,
          email: result.data.email || null,
          phoneNumber: result.data.phone,
          displayName: result.data.name,
        } as User;
        
        // Set demo mode
        setIsDemoMode(true);
        setUser(mockUser);
        setUserProfile(result.data);
        
        // Store in localStorage for persistence
        localStorage.setItem('demoMode', 'true');
        localStorage.setItem('demoProfile', JSON.stringify(result.data));
        
        console.log('Demo login successful:', result.data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during demo login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check for demo mode on mount
  useEffect(() => {
    const checkDemoMode = () => {
      const demoMode = localStorage.getItem('demoMode');
      const demoProfile = localStorage.getItem('demoProfile');
      
      if (demoMode === 'true' && demoProfile) {
        try {
          const profile = JSON.parse(demoProfile);
          const mockUser = {
            uid: profile.uid,
            email: profile.email || null,
            phoneNumber: profile.phone,
            displayName: profile.name,
          } as User;
          
          setIsDemoMode(true);
          setUser(mockUser);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error restoring demo session:', error);
          localStorage.removeItem('demoMode');
          localStorage.removeItem('demoProfile');
        }
      }
      setLoading(false);
    };
    
    checkDemoMode();
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    logout,
    refreshUserProfile,
    demoLogin,
    isArtisan: userProfile?.role === "artisan",
    isBuyer: userProfile?.role === "buyer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the interfaces for use in other components
export type { UserProfile, Address };