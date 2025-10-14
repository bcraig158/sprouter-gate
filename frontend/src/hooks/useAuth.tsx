import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import jwtDecode from 'jwt-decode';
import sessionTracker from '../services/sessionTracking';
import { eventTracker } from '../services/eventTracking';
import { authService } from '../services/api';

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
          
          // Initialize session tracking for existing user (non-blocking)
          try {
            const sessionId = `session_${decoded.householdId}_${Date.now()}`;
            sessionTracker.initialize(
              decoded.householdId, 
              decoded.isVolunteer ? 'volunteer' : 'student', 
              sessionId
            );
            
            // Initialize event tracking for existing user
            eventTracker.setUser(
              decoded.householdId,
              decoded.isVolunteer ? 'volunteer' : 'student'
            );
          } catch (error) {
            console.warn('Tracking initialization failed for existing user:', error);
            // Don't let tracking errors affect login
          }
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
      const data = await authService.loginStudent(studentId.trim());
      
      if (data.success) {
        setToken(data.token);
        const userData = {
          householdId: data.user.household_id,
          studentId: studentId.trim(),
          isVolunteer: false
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('sessionId', data.sessionId);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Initialize session tracking for new login (non-blocking)
        try {
          sessionTracker.initialize(data.user.household_id, 'student', data.sessionId);
          
          // Initialize event tracking for new login
          eventTracker.setUser(data.user.household_id, 'student');
          
          // Force flush data immediately (non-blocking)
          setTimeout(() => {
            sessionTracker.forceFlush().catch(err => 
              console.warn('Session tracking flush failed:', err)
            );
          }, 1000);
        } catch (error) {
          console.warn('Tracking initialization failed:', error);
          // Don't let tracking errors affect login
        }
        
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
      const data = await authService.loginVolunteer(volunteerCode.trim(), email.trim());
      
      if (data.success) {
        setToken(data.token);
        const userData = {
          householdId: data.user.code, // Using code as household identifier for volunteers
          volunteerCode: volunteerCode.trim(),
          isVolunteer: true,
          isAdmin: data.user.role === 'admin'
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('sessionId', data.sessionId);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Initialize session tracking for volunteer login (non-blocking)
        try {
          sessionTracker.initialize(data.user.code, 'volunteer', data.sessionId);
          
          // Initialize event tracking for volunteer login
          eventTracker.setUser(data.user.code, 'volunteer');
          
          // Force flush data immediately (non-blocking)
          setTimeout(() => {
            sessionTracker.forceFlush().catch(err => 
              console.warn('Session tracking flush failed:', err)
            );
          }, 1000);
        } catch (error) {
          console.warn('Tracking initialization failed:', error);
          // Don't let tracking errors affect login
        }
        
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
