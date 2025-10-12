import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jwtDecode from 'jwt-decode';
import sessionTracker from '../services/sessionTracking';

interface User {
  householdId: string;
  studentId?: string;
  volunteerCode?: string;
  isVolunteer: boolean;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (studentId: string) => Promise<boolean>;
  volunteerLogin: (volunteerCode: string, email: string) => Promise<boolean>;
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
        let decoded: { householdId: string; studentId?: string; volunteerCode?: string; isVolunteer?: boolean; exp: number };
        try {
          decoded = jwtDecode<{ householdId: string; studentId?: string; volunteerCode?: string; isVolunteer?: boolean; exp: number }>(storedToken);
        } catch {
          // Fall back to simple base64 decoding
          decoded = JSON.parse(atob(storedToken));
        }
        
        if (decoded.exp > Date.now()) {
          setToken(storedToken);
          const userData = {
            householdId: decoded.householdId,
            studentId: decoded.studentId,
            volunteerCode: decoded.volunteerCode,
            isVolunteer: decoded.isVolunteer || false
          };
          setUser(userData);
          
          // Initialize session tracking for existing user
          const sessionId = `session_${decoded.householdId}_${Date.now()}`;
          sessionTracker.initialize(
            decoded.householdId, 
            decoded.isVolunteer ? 'volunteer' : 'student', 
            sessionId
          );
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
      // Use backend API for authentication
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentId.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setToken(data.token);
        const userData = {
          householdId: data.householdId,
          studentId: studentId.trim(),
          isVolunteer: false
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        
        // Initialize session tracking for new login
        const sessionId = `session_${data.householdId}_${Date.now()}`;
        sessionTracker.initialize(data.householdId, 'student', sessionId);
        
        // Force flush data immediately
        setTimeout(() => {
          sessionTracker.forceFlush();
        }, 1000);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const volunteerLogin = async (volunteerCode: string, email: string): Promise<boolean> => {
    try {
      // Always use backend API for authentication
      const response = await fetch('/api/volunteer-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          volunteerCode: volunteerCode.trim(),
          email: email.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setToken(data.token);
        const userData = {
          householdId: data.householdId,
          volunteerCode: volunteerCode.trim(),
          isVolunteer: true,
          isAdmin: data.isAdmin || false
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        
        // Initialize session tracking for volunteer login
        const sessionId = `session_${data.householdId}_${Date.now()}`;
        sessionTracker.initialize(data.householdId, 'volunteer', sessionId);
        
        // Force flush data immediately
        setTimeout(() => {
          sessionTracker.forceFlush();
        }, 1000);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Volunteer login error:', error);
      return false;
    }
  };

  const logout = () => {
    // Stop session tracking before logout
    sessionTracker.stop();
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, volunteerLogin, logout, isLoading }}>
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
