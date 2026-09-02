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

const DEFAULT_PROD_API_URL = 'https://civix-xo87.onrender.com';

export const getApiUrl = (endpoint: string): string => {
  const envBase = import.meta.env.VITE_API_URL;
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  // In production (Vercel), automatically point to live Render backend if VITE_API_URL is missing
  const base = envBase || (isLocal ? '' : DEFAULT_PROD_API_URL);
  
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

function get405ErrorMessage(): string {
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) {
    return 'API server unreachable (405 Method Not Allowed). Please ensure the backend server is running on port 5000 via "pnpm dev".';
  }
  return 'Backend API connecting... (Render free tier server is waking up from sleep, please retry in 15 seconds).';
}

async function executeSmartFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const targetUrl = getApiUrl(endpoint);
  let res: Response;
  try {
    res = await fetch(targetUrl, options);
  } catch (err: any) {
    // If request failed, attempt direct failover
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const failoverBase = isLocal ? 'http://localhost:5000' : DEFAULT_PROD_API_URL;
      if (!targetUrl.startsWith(failoverBase)) {
        try {
          const directUrl = `${failoverBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          return await fetch(directUrl, options);
        } catch {}
      }
    }
    throw new Error(`Server connection failed. ${err.message || 'Service offline'}.`);
  }

  // If static server responded with 405, automatically retry to live Render backend
  if (res.status === 405) {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const failoverBase = isLocal ? 'http://localhost:5000' : DEFAULT_PROD_API_URL;
      if (!targetUrl.startsWith(failoverBase)) {
        try {
          const directUrl = `${failoverBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          const directRes = await fetch(directUrl, options);
          if (directRes.status !== 405) {
            return directRes;
          }
        } catch {}
      }
    }
    throw new Error(get405ErrorMessage());
  }

  return res;
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
          const res = await executeSmartFetch('/api/users/me', {
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
    const res = await executeSmartFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      if (res.status === 405) {
        throw new Error(get405ErrorMessage());
      }
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
    const res = await executeSmartFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, role })
    });

    if (!res.ok) {
      if (res.status === 405) {
        throw new Error(get405ErrorMessage());
      }
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
      response = await executeSmartFetch(url, {
        ...options,
        headers
      });
    } catch (netErr: any) {
      console.warn(`[apiFetch] Network connection failure for ${url}:`, netErr);
      // Return a synthesized synthetic response to prevent uncaught promise rejection
      return wrapResponseWithSafeJson(new Response(JSON.stringify({ error: netErr.message || 'Network request failed. Service unreachable.' }), {
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
          const refreshRes = await executeSmartFetch('/api/auth/refresh', {
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
              const retryResponse = await executeSmartFetch(url, { ...options, headers });
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
