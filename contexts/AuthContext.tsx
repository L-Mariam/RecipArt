import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInAnonymously, signOut, updateProfile, deleteUser } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  loginAsMock: () => Promise<void>;
  updateUserProfile: (data: {displayName?: string, photoURL?: string}) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const MOCK_USER_KEY = 'recipart_mock_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there is a saved mock session first
    const savedMock = localStorage.getItem(MOCK_USER_KEY);
    if (savedMock) {
        setCurrentUser(JSON.parse(savedMock));
        setLoading(false);
        return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.uid.startsWith('mock-user-')) {
          localStorage.setItem('isMockSession', 'true');
      } else if (!user) {
          localStorage.removeItem('isMockSession');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) { await loginAsMock(); return; }
    await signInWithPopup(auth, googleProvider);
  };

  const signInGuest = async () => {
    if (!auth) { await loginAsMock(); return; }
    try {
        await signInAnonymously(auth);
    } catch (error: any) {
        await loginAsMock();
    }
  };

  const updateUserProfile = async (data: {displayName?: string, photoURL?: string}) => {
      if (!currentUser) return;
      
      // Handle Mock User Persistence
      if (currentUser.uid.startsWith('mock-user-')) {
          const updated = { ...currentUser, ...data } as User;
          setCurrentUser(updated);
          localStorage.setItem(MOCK_USER_KEY, JSON.stringify(updated));
          return;
      }

      // Handle Firebase User
      if (auth.currentUser) {
          await updateProfile(auth.currentUser, data);
          const updatedUser = { ...auth.currentUser, ...data } as User;
          setCurrentUser(updatedUser);
      }
  };

  const deleteAccount = async () => {
      if (!currentUser) return;
      if (currentUser.uid.startsWith('mock-user-')) {
          localStorage.removeItem('isMockSession');
          localStorage.removeItem(MOCK_USER_KEY);
          setCurrentUser(null);
          return;
      }
      if (auth.currentUser) {
          await deleteUser(auth.currentUser);
      }
  };

  const loginAsMock = async () => {
    const mockUser = { 
        uid: 'mock-user-' + Math.random().toString(36).substr(2, 9), 
        displayName: 'Detective Artist', 
        photoURL: null,
        emailVerified: true,
        isAnonymous: true,
    } as unknown as User;

    localStorage.setItem('isMockSession', 'true');
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    setCurrentUser(mockUser);
    setLoading(false);
  };

  const logout = async () => {
    localStorage.removeItem('isMockSession');
    localStorage.removeItem(MOCK_USER_KEY);
    if (!auth) { setCurrentUser(null); return; }
    try { await signOut(auth); } catch (e) { setCurrentUser(null); }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, signInWithGoogle, signInGuest, loginAsMock, updateUserProfile, deleteAccount, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
