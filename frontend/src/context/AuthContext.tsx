import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../mock/initialData';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  login: (email: string, password?: string, remember?: boolean) => boolean;
  register: (name: string, email: string, password?: string) => boolean;
  logout: () => void;
  setActiveRole: (role: UserRole) => void;
  updateProfile: (updates: Partial<User>) => void;
  switchDemoUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Clear legacy localStorage auto-login so opening link always starts on Login Page
    try {
      localStorage.removeItem('taskflow_auth_user');
      localStorage.removeItem('taskflow_active_role');
    } catch {
      // ignore
    }
    const saved = sessionStorage.getItem('taskflow_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Default to null: users must see the Login Page first
    return null;
  });

  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    if (currentUser?.role !== 'admin') return 'user';
    const savedRole = sessionStorage.getItem('taskflow_active_role');
    if (savedRole === 'admin' || savedRole === 'user') return savedRole;
    return 'admin';
  });

  const isAuthenticated = currentUser !== null;

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('taskflow_session_user', JSON.stringify(currentUser));
      if (currentUser.role !== 'admin' && activeRole !== 'user') {
        setActiveRoleState('user');
      }
    } else {
      sessionStorage.removeItem('taskflow_session_user');
      sessionStorage.removeItem('taskflow_active_role');
      localStorage.removeItem('taskflow_auth_user');
      localStorage.removeItem('taskflow_active_role');
    }
  }, [currentUser, activeRole]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      sessionStorage.setItem('taskflow_active_role', activeRole);
    } else {
      sessionStorage.setItem('taskflow_active_role', 'user');
    }
  }, [activeRole, currentUser]);

  const login = (email: string, _password?: string, _remember: boolean = true) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check direct match
    let matched = INITIAL_USERS.find((u) => u.email.toLowerCase() === cleanEmail);

    // Support backend API contract default accounts
    if (!matched) {
      if (cleanEmail === 'admin@taskflow.com') {
        matched = INITIAL_USERS.find((u) => u.role === 'admin') || INITIAL_USERS[0];
      } else if (cleanEmail === 'user@taskflow.com' || cleanEmail === 'rashika@taskflow.com') {
        matched = INITIAL_USERS.find((u) => u.role === 'user') || INITIAL_USERS[1];
      }
    }

    if (matched) {
      setCurrentUser(matched);
      setActiveRoleState(matched.role);
      return true;
    }

    // If not in initial list, log in as custom user (admin if email includes 'admin')
    const assignedRole: UserRole = cleanEmail.includes('admin') ? 'admin' : 'user';
    const newUser: User = {
      id: 'usr-' + Date.now().toString(36),
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: email.trim(),
      role: assignedRole,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      department: 'Productivity',
      registeredDate: new Date().toISOString().split('T')[0],
      totalTasks: 0,
      completedTasks: 0,
    };
    setCurrentUser(newUser);
    setActiveRoleState(assignedRole);
    return true;
  };

  const register = (name: string, email: string, _password?: string) => {
    const newUser: User = {
      id: 'usr-' + Date.now().toString(36),
      name: name.trim(),
      email: email.trim(),
      role: 'user',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      department: 'Productivity',
      registeredDate: new Date().toISOString().split('T')[0],
      totalTasks: 0,
      completedTasks: 0,
    };
    setCurrentUser(newUser);
    setActiveRoleState('user');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('taskflow_session_user');
    sessionStorage.removeItem('taskflow_active_role');
    localStorage.removeItem('taskflow_auth_user');
    localStorage.removeItem('taskflow_active_role');
  };

  const setActiveRole = (role: UserRole) => {
    if (currentUser?.role !== 'admin') {
      setActiveRoleState('user');
      return;
    }
    setActiveRoleState(role);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
  };

  const switchDemoUser = (userId: string) => {
    const user = INITIAL_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setActiveRoleState(user.role === 'admin' ? 'admin' : 'user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        activeRole,
        login,
        register,
        logout,
        setActiveRole,
        updateProfile,
        switchDemoUser,
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
