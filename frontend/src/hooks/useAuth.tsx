import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jwtDecode from 'jwt-decode';
import api from '../services/api';

interface User {
  householdId: string;
  studentId: string;
  isVolunteer: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (studentId: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        // Try to decode as JWT first, then fall back to simple base64
        let decoded: { householdId: string; studentId: string; exp: number };
        try {
          decoded = jwtDecode<{ householdId: string; studentId: string; exp: number }>(storedToken);
        } catch {
          // Fall back to simple base64 decoding
          decoded = JSON.parse(atob(storedToken));
        }
        
        if (decoded.exp > Date.now()) {
          setToken(storedToken);
          setUser({
            householdId: decoded.householdId,
            studentId: decoded.studentId,
            isVolunteer: false
          });
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (studentId: string): Promise<boolean> => {
    try {
      // Simple frontend-only authentication
      // Accept any non-empty student ID
      if (studentId && studentId.trim().length > 0) {
        // Create a simple token for session management
        const mockToken = btoa(JSON.stringify({
          studentId: studentId.trim(),
          householdId: `HH_${studentId.trim()}`,
          exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));
        
        setToken(mockToken);
        setUser({
          householdId: `HH_${studentId.trim()}`,
          studentId: studentId.trim(),
          isVolunteer: false
        });
        
        localStorage.setItem('token', mockToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
