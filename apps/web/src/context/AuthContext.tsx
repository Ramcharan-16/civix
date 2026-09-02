import React, { createContext, useState, useEffect, useContext } from 'react';

export type Role = 'CITIZEN' | 'STAFF' | 'DEPARTMENT_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, phone: string, password: string, role?: Role) => Promise<void>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getApiUrl = (endpoint: string): string => {
  const base = import.meta.env.VITE_API_URL || '';
  if (!base || endpoint.startsWith('http')) return endpoint;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * Safely parse JSON from a fetch Response without throwing syntax errors
 * on empty body (204/empty string) or non-JSON (HTML 404/500).
 */
export async function safeJsonParse<T = any>(res: Response, fallback?: any): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return (fallback !== undefined ? fallback : {}) as T;
    }
    return JSON.parse(text) as T;
  } catch {
    return (fallback !== undefined ? fallback : {}) as T;
  }
}

function wrapResponseWithSafeJson(response: Response): Response {
  const originalJson = response.json.bind(response);
  response.json = async function () {
    try {
      const cloned = response.clone();
      const text = await cloned.text();
      if (!text || !text.trim()) {
        return {};
      }
      return JSON.parse(text);
    } catch {
      try {
        return await originalJson();
      } catch {
        return {};
      }
    }
  };
  return response;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('civix_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load user profile if token is present
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('civix_token');
      if (storedToken) {
        try {
          const res = await fetch(getApiUrl('/api/users/me'), {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          if (res.ok) {
            const userData = await safeJsonParse(res, null);
            if (userData && userData.id) {
              setUser(userData);
              setToken(storedToken);
            } else {
              logout();
            }
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (e) {
          console.error('Failed to load profile during init:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch (netErr: any) {
      throw new Error(`Server connection failed. Please ensure the backend server is running (${netErr.message || 'offline'}).`);
    }

    if (!res.ok) {
      const errorData = await safeJsonParse(res, { error: `Server error (${res.status})` });
      throw new Error(errorData.error || errorData.message || 'Login failed');
    }

    const data = await safeJsonParse(res, null);
    if (!data || !data.accessToken) {
      throw new Error('Invalid response received from authentication service');
    }

    localStorage.setItem('civix_token', data.accessToken);
    localStorage.setItem('civix_refresh_token', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (name: string, email: string, phone: string, password: string, role?: Role) => {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role })
      });
    } catch (netErr: any) {
      throw new Error(`Server connection failed. Please ensure the backend server is running (${netErr.message || 'offline'}).`);
    }

    if (!res.ok) {
      const errorData = await safeJsonParse(res, { error: `Registration error (${res.status})` });
      throw new Error(errorData.error || errorData.message || 'Registration failed');
    }

    const data = await safeJsonParse(res, null);
    if (!data || !data.accessToken) {
      throw new Error('Invalid response received from authentication service');
    }

    localStorage.setItem('civix_token', data.accessToken);
    localStorage.setItem('civix_refresh_token', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('civix_token');
    localStorage.removeItem('civix_refresh_token');
    setToken(null);
    setUser(null);
  };

  // Wrapper for authenticated API requests
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const targetUrl = getApiUrl(url);
    const headers = new Headers(options.headers || {});
    
    // Auto attach token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Default content-type
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        ...options,
        headers
      });
    } catch (netErr: any) {
      console.warn(`[apiFetch] Network connection failure for ${url}:`, netErr);
      // Return a synthesized synthetic response to prevent uncaught promise rejection
      return wrapResponseWithSafeJson(new Response(JSON.stringify({ error: 'Network request failed. Service unreachable.' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Check if unauthorized (token expired), attempt to refresh
    if (response.status === 401 && token) {
      const refreshToken = localStorage.getItem('civix_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(getApiUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshRes.ok) {
            const data = await safeJsonParse(refreshRes, null);
            if (data && data.accessToken) {
              localStorage.setItem('civix_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('civix_refresh_token', data.refreshToken);
              }
              setToken(data.accessToken);
              
              // Retry request with new token
              headers.set('Authorization', `Bearer ${data.accessToken}`);
              const retryResponse = await fetch(targetUrl, { ...options, headers });
              return wrapResponseWithSafeJson(retryResponse);
            }
          }
        } catch (e) {
          console.error('Refresh token failed:', e);
        }
      }
      logout();
    }

    return wrapResponseWithSafeJson(response);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, apiFetch }}>
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
