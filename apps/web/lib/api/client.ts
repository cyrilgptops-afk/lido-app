import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

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

// Request interceptor - add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error?.message || error.response.statusText || 'Request failed';
      throw new ApiError(message, error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      throw new ApiError('No response from server. Please check your connection.', 0);
    } else {
      // Something else happened
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
