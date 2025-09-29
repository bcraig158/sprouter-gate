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
        const decoded = jwtDecode<{ householdId: string; studentId: string; exp: number }>(storedToken);
        if (decoded.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser({
            householdId: decoded.householdId,
            studentId: decoded.studentId,
            isVolunteer: false // Will be updated when we fetch user state
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
      const response = await api.post('/login', { studentId });
      
      if (response.data.success) {
        const { token: newToken, householdId, isVolunteer } = response.data;
        
        setToken(newToken);
        setUser({
          householdId,
          studentId,
          isVolunteer
        });
        
        localStorage.setItem('token', newToken);
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
