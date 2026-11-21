import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api, getStoredToken, setStoredToken } from '../services/api';
import {
  signInWithGoogle,
  signInEmail,
  registerEmail,
  signInWithCustomToken,
  firebaseLogout,
  onAuthChange,
  getFreshIdToken,
  isFirebaseConfigured,
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  isLoading: boolean;
  login: (email: string, password?: string, targetMode?: 'user' | 'admin') => Promise<boolean>;
  loginWithGoogle: (idToken?: string, targetMode?: 'user' | 'admin') => Promise<boolean>;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setActiveRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskflow_auth_user_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('taskflow_active_role_v3');
    if (savedRole === 'admin' || savedRole === 'user') return savedRole;
    return currentUser?.role || 'user';
  });

  const isAuthenticated = currentUser !== null;

  // Listen to Firebase Auth state to keep currentUser & ID token perfectly synchronized
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const freshToken = await firebaseUser.getIdToken();
          setStoredToken(freshToken);

          const res = await api.getProfile();
          if (res.success && res.data) {
            const profile = res.data;
            const email = (profile.email || firebaseUser.email || '').toLowerCase().trim();
            const isSuperAdmin = Boolean(profile.isSuperAdmin) || email === 'omkarghangale36@gmail.com';
            const role: UserRole = (isSuperAdmin || profile.role === 'admin') ? 'admin' : 'user';

            const hydratedUser: User = {
              id: profile.id || profile.uid || firebaseUser.uid,
              name: profile.name || firebaseUser.displayName || 'User',
              email: profile.email || firebaseUser.email || '',
              role,
              isSuperAdmin,
              status: 'Active',
              avatar:
                profile.avatar ||
                firebaseUser.photoURL ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  profile.name || firebaseUser.displayName || 'User'
                )}`,
              department: profile.department || 'Workspace',
              registeredDate: profile.createdAt
                ? new Date(profile.createdAt._seconds ? profile.createdAt._seconds * 1000 : profile.createdAt)
                    .toISOString()
                    .split('T')[0]
                : new Date().toISOString().split('T')[0],
              totalTasks: 0,
              completedTasks: 0,
            };
            setCurrentUser(hydratedUser);
            if (hydratedUser.role !== 'admin') {
              setActiveRoleState('user');
            }
            localStorage.setItem('taskflow_auth_user_v3', JSON.stringify(hydratedUser));
          }
        } catch (err) {
          console.warn('Could not sync user profile from backend:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        const token = getStoredToken();
        if (token) {
          try {
            const res = await api.getProfile();
            if (res.success && res.data) {
              const profile = res.data;
              const email = (profile.email || '').toLowerCase().trim();
              const isSuperAdmin = Boolean(profile.isSuperAdmin) || email === 'omkarghangale36@gmail.com';
              const role: UserRole = (isSuperAdmin || profile.role === 'admin') ? 'admin' : 'user';

              const hydratedUser: User = {
                id: profile.id || profile.uid || 'usr-1',
                name: profile.name || 'User',
                email: profile.email || '',
                role,
                isSuperAdmin,
                status: 'Active',
                avatar:
                  profile.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    profile.name || 'User'
                  )}`,
                department: profile.department || 'Workspace',
                registeredDate: new Date().toISOString().split('T')[0],
                totalTasks: 0,
                completedTasks: 0,
              };
              setCurrentUser(hydratedUser);
              if (hydratedUser.role !== 'admin') {
                setActiveRoleState('user');
              }
            }
          } catch {
            setStoredToken(null);
            setCurrentUser(null);
            localStorage.removeItem('taskflow_auth_user_v3');
          }
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('taskflow_auth_user_v3', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('taskflow_auth_user_v3');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('taskflow_active_role_v3', activeRole);
  }, [activeRole]);

  const loginWithGoogle = useCallback(async (providedToken?: string, targetMode: 'user' | 'admin' = 'user'): Promise<boolean> => {
    try {
      let token = providedToken;

      if (!token) {
        if (isFirebaseConfigured) {
          const fbResult = await signInWithGoogle();
          token = fbResult.idToken;
        } else {
          throw new Error('Google Sign-In is not configured. Please check VITE_FIREBASE_API_KEY in frontend/.env.');
        }
      }

      setStoredToken(token);

      // Verify token with backend & retrieve or create user profile
      const res = await api.googleAuth(token);
      if (res.success && res.data) {
        const profile = res.data;
        const email = (profile.email || '').toLowerCase().trim();
        const isSuperAdmin = Boolean(profile.isSuperAdmin) || email === 'omkarghangale36@gmail.com';
        const role: UserRole = (isSuperAdmin || profile.role === 'admin') ? 'admin' : 'user';

        // Strict role-gate: if Admin Login requested, reject non-admins immediately
        if (targetMode === 'admin' && role !== 'admin') {
          firebaseLogout();
          setStoredToken(null);
          setCurrentUser(null);
          localStorage.removeItem('taskflow_auth_user_v3');
          localStorage.removeItem('taskflow_active_role_v3');
          throw new Error('Access denied. This account does not have administrator privileges. Please use User Login.');
        }

        const loggedUser: User = {
          id: profile.id || profile.uid || 'usr-g',
          name: profile.name || 'Google User',
          email: profile.email || '',
          role,
          isSuperAdmin,
          status: 'Active',
          avatar:
            profile.avatar ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || 'Google User')}`,
          department: profile.department || 'Workspace',
          registeredDate: new Date().toISOString().split('T')[0],
          totalTasks: 0,
          completedTasks: 0,
        };
        setCurrentUser(loggedUser);
        setActiveRoleState(targetMode === 'admin' ? 'admin' : 'user');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Google login failed:', err);
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password?: string, targetMode: 'user' | 'admin' = 'user'): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      let idToken: string | undefined;

      if (isFirebaseConfigured && password) {
        try {
          const fbResult = await signInEmail(cleanEmail, password);
          idToken = fbResult.idToken;
        } catch (fbErr: any) {
          console.warn('Firebase client sign-in failed, trying backend directly:', fbErr.message);
        }
      }

      if (idToken) {
        setStoredToken(idToken);
      }

      // Call backend login
      const res = await api.login({ email: cleanEmail, password, idToken });
      if (res.success && res.data) {
        // If backend returned a custom token and client isn't signed in yet, sign in with it
        if (res.token && res.token.split('.').length === 3 && isFirebaseConfigured) {
          try {
            const customResult = await signInWithCustomToken(res.token);
            idToken = customResult.idToken;
          } catch {}
        }

        const validToken = idToken || res.token;
        if (validToken) {
          setStoredToken(validToken);
        }

        const profile = res.data;
        const isSuperAdmin = Boolean(profile.isSuperAdmin) || cleanEmail === 'omkarghangale36@gmail.com';
        const role: UserRole = (isSuperAdmin || profile.role === 'admin') ? 'admin' : 'user';

        // Strict role-gate: if Admin Login requested, reject non-admins immediately
        if (targetMode === 'admin' && role !== 'admin') {
          firebaseLogout();
          setStoredToken(null);
          setCurrentUser(null);
          localStorage.removeItem('taskflow_auth_user_v3');
          localStorage.removeItem('taskflow_active_role_v3');
          throw new Error('Access denied. This account does not have administrator privileges. Please use User Login.');
        }

        const loggedUser: User = {
          id: profile.id || profile.uid || 'usr-' + Date.now(),
          name: profile.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role,
          isSuperAdmin,
          status: 'Active',
          avatar:
            profile.avatar ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || cleanEmail)}`,
          department: profile.department || 'Workspace',
          registeredDate: new Date().toISOString().split('T')[0],
          totalTasks: 0,
          completedTasks: 0,
        };
        setCurrentUser(loggedUser);
        setActiveRoleState(targetMode === 'admin' ? 'admin' : 'user');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login failed:', err);
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      let idToken: string | undefined;

      if (isFirebaseConfigured && password) {
        try {
          const fbResult = await registerEmail(name.trim(), cleanEmail, password);
          idToken = fbResult.idToken;
        } catch (fbErr: any) {
          console.warn('Firebase client register failed, trying backend directly:', fbErr.message);
        }
      }

      if (idToken) {
        setStoredToken(idToken);
      }

      const res = await api.register({ name: name.trim(), email: cleanEmail, password });
      if (res.success && res.data) {
        if (res.token && res.token.split('.').length === 3 && isFirebaseConfigured) {
          try {
            const customResult = await signInWithCustomToken(res.token);
            idToken = customResult.idToken;
          } catch {}
        }

        const validToken = idToken || res.token;
        if (validToken) {
          setStoredToken(validToken);
        }

        const profile = res.data;
        const loggedUser: User = {
          id: profile.id || profile.uid || 'usr-' + Date.now(),
          name: name.trim(),
          email: cleanEmail,
          role: 'user',
          status: 'Active',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
          department: 'Workspace',
          registeredDate: new Date().toISOString().split('T')[0],
          totalTasks: 0,
          completedTasks: 0,
        };
        setCurrentUser(loggedUser);
        setActiveRoleState('user');
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Registration failed:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    firebaseLogout();
    setStoredToken(null);
    setCurrentUser(null);
    localStorage.removeItem('taskflow_auth_user_v3');
    localStorage.removeItem('taskflow_active_role_v3');
  }, []);

  const setActiveRole = useCallback((role: UserRole) => {
    if (role === 'admin' && currentUser?.role !== 'admin' && !currentUser?.isSuperAdmin) {
      console.warn('Unauthorized attempt to set active role to admin blocked.');
      return;
    }
    setActiveRoleState(role);
    localStorage.setItem('taskflow_active_role_v3', role);
  }, [currentUser]);

  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    if (updates.name && updates.name !== currentUser.name) {
      try {
        await api.updateProfile({ name: updates.name });
      } catch (e) {
        console.error('Could not update profile on backend:', e);
      }
    }
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        activeRole,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        setActiveRole,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
