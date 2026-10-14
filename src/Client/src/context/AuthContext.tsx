import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserItem | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Khôi phục phiên làm việc đã lưu (Remember Me 30 ngày trong localStorage hoặc sessionStorage)
    const storedUser = localStorage.getItem('gov_user') || sessionStorage.getItem('gov_user');
    const storedToken = localStorage.getItem('gov_access_token') || sessionStorage.getItem('gov_access_token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('gov_user');
        sessionStorage.removeItem('gov_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    const data = await api.login(username, password, rememberMe);
    const loggedUser: UserItem = {
      id: data.user.id,
      username: data.user.username,
      fullName: data.user.fullName,
      role: data.user.role,
      department: data.user.department,
      token: data.accessToken,
    };

    setUser(loggedUser);

    // Lưu phiên: localStorage cho 30 ngày, sessionStorage cho phiên làm việc thường
    if (rememberMe) {
      localStorage.setItem('gov_access_token', data.accessToken);
      localStorage.setItem('gov_user', JSON.stringify(loggedUser));
    } else {
      sessionStorage.setItem('gov_access_token', data.accessToken);
      sessionStorage.setItem('gov_user', JSON.stringify(loggedUser));
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignored
    } finally {
      setUser(null);
      localStorage.removeItem('gov_access_token');
      localStorage.removeItem('gov_user');
      sessionStorage.removeItem('gov_access_token');
      sessionStorage.removeItem('gov_user');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
    return res.message || 'Đổi mật khẩu thành công.';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
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
