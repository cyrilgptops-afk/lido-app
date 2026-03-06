import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Performance tracking ────────────────────────────────────────────────────
export interface PerfEntry {
  url: string;
  method: string;
  status: number | 'error';
  durationMs: number;
  timestamp: string;
}

const _perfStore: PerfEntry[] = [];
const _startTimes = new Map<string, number>();

/** Returns a copy of all recorded perf entries. */
export function getPerfEntries(): PerfEntry[] {
  return [..._perfStore];
}

/** Clears all recorded perf entries. */
export function clearPerfEntries(): void {
  _perfStore.length = 0;
}

function _key(config: InternalAxiosRequestConfig): string {
  return `${config.method?.toUpperCase()}:${config.url}:${Date.now()}`;
}

// ─── API base URL ─────────────────────────────────────────────────────────────
// Get API base URL from environment or default to localhost
const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
  : 'http://localhost:4000';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token + record perf start time
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Tag request with a unique key so we can match it on response
    const key = _key(config);
    (config as any).__perfKey = key;
    _startTimes.set(key, performance.now());
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - record perf + handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    // ── Perf: record successful request ────────────────────────────────────
    const key = (response.config as any).__perfKey;
    if (key && _startTimes.has(key)) {
      const durationMs = Math.round(performance.now() - _startTimes.get(key)!);
      _startTimes.delete(key);
      const entry: PerfEntry = {
        url       : response.config.url || '',
        method    : response.config.method?.toUpperCase() || 'GET',
        status    : response.status,
        durationMs,
        timestamp : new Date().toISOString(),
      };
      _perfStore.push(entry);
      console.debug(`[API perf] ${entry.method} ${entry.url} → ${entry.status} in ${entry.durationMs}ms`);
    }
    return response;
  },
  (error) => {
    // ── Perf: record failed request ────────────────────────────────────────
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const key = config ? (config as any).__perfKey : undefined;
    if (key && _startTimes.has(key)) {
      const durationMs = Math.round(performance.now() - _startTimes.get(key)!);
      _startTimes.delete(key);
      const entry: PerfEntry = {
        url       : config?.url || '',
        method    : config?.method?.toUpperCase() || 'GET',
        status    : error.response?.status ?? 'error',
        durationMs,
        timestamp : new Date().toISOString(),
      };
      _perfStore.push(entry);
      console.debug(`[API perf] ${entry.method} ${entry.url} → ${entry.status} in ${entry.durationMs}ms`);
    }

    if (error.response) {
      const message = error.response.data?.error?.message || error.response.statusText || 'Request failed';
      console.error('API Error:', message, error.response.data);
      throw new ApiError(message, error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new ApiError('No response from server. Please check your connection.', 0);
    } else {
      throw new ApiError(error.message || 'An unexpected error occurred', 0);
    }
  }
);

// Export as apiClient for compatibility
export const apiClient = axiosInstance;

// Legacy export
export async function apiFetch<T>(
  path: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  const response = await axiosInstance.request<T>({
    url: path,
    ...options,
  });
  return response.data;
}
