export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    // If accessing from another device (e.g. mobile/tablet on LAN), dynamically replace localhost with current host
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const url = new URL(envUrl);
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return `${url.protocol}//${window.location.hostname}:${url.port || '5000'}${url.pathname}`;
        }
      } catch {
        return '/api/v1';
      }
    }
    return envUrl;
  }
  return '/api/v1';
}

export const API_BASE = getApiBaseUrl();

export class ApiRequestError extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('codesync_access_token');
  const apiBase = getApiBaseUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (netErr: any) {
    throw new ApiRequestError('Network error connecting to CodeSync server', 0, 'NETWORK_ERROR');
  }

  // Handle 401 Token Expiry & Automatic Refresh
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('codesync_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data.tokens.accessToken;
          localStorage.setItem('codesync_access_token', newAccessToken);

          // Retry original request with fresh token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          const retryRes = await fetch(url, { ...options, headers });
          const retryData = await retryRes.json();
          if (!retryRes.ok) {
            throw new ApiRequestError(retryData.error?.message || 'Request failed', retryRes.status, retryData.error?.code);
          }
          return retryData.data;
        } else {
          // Refresh token invalid or secrets changed: purge stale credentials
          localStorage.removeItem('codesync_access_token');
          localStorage.removeItem('codesync_refresh_token');
        }
      } catch {
        localStorage.removeItem('codesync_access_token');
        localStorage.removeItem('codesync_refresh_token');
      }
    } else {
      localStorage.removeItem('codesync_access_token');
    }
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}`;
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    const details = data?.error?.details;
    throw new ApiRequestError(message, response.status, code, details);
  }

  return data.data;
}
