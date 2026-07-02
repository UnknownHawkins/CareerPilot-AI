import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    let token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

    // Dynamically retrieve token from Clerk session if Clerk is loaded in browser
    if (typeof window !== 'undefined' && (window as any).Clerk?.session) {
      try {
        const clerkToken = await (window as any).Clerk.session.getToken();
        if (clerkToken) {
          token = clerkToken;
          localStorage.setItem('accessToken', clerkToken);
        }
      } catch (err) {
        // Fallback to existing token
      }
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;

        if (!refreshToken) {
          if (typeof window !== 'undefined') {
            localStorage.clear();
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // ✅ FIXED: Correct refresh token URL
        const response = await axios.post(
          '/api/auth/refresh-token',
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data.tokens;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API wrapper
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
};

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => apiClient.post('/auth/register', data),

  logout: () => apiClient.post('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),

  getMe: () => apiClient.get('/auth/me'),

  updateProfile: (data: any) =>
    apiClient.put('/auth/profile', data),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.put('/auth/change-password', data),

  getStats: () => apiClient.get('/auth/stats'),
};

// Resume API
export const resumeApi = {
  upload: (data: FormData) =>
    apiClient.post('/resume/upload', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAnalyses: () => apiClient.get('/resume'),
  getAnalysisById: (id: string) => apiClient.get(`/resume/${id}`),
  reanalyze: (id: string) => apiClient.post(`/resume/${id}/reanalyze`),
};

// Interview API
export const interviewApi = {
  createSession: (data: any) => apiClient.post('/interview', data),
  getSessions: () => apiClient.get('/interview'),
  getSessionById: (id: string) => apiClient.get(`/interview/${id}`),
  submitAnswer: (id: string, data: any) => apiClient.post(`/interview/${id}/answer`, data),
  completeSession: (id: string) => apiClient.post(`/interview/${id}/complete`),
  getStats: () => apiClient.get('/interview/stats'),
  getTips: (params?: any) => apiClient.get('/interview/tips', { params }),
  transcribe: (data: FormData) =>
    apiClient.post('/interview/transcribe', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Activity API
export const activityApi = {
  getRecent: (limit: number = 10) => apiClient.get(`/activity?limit=${limit}`),
};

// LinkedIn API
export const linkedinApi = {
  analyze: (data: any) => apiClient.post('/linkedin/analyze', data),
  getHeadlineSuggestions: (data: any) => apiClient.post('/linkedin/suggestions/headline', data),
  getSummarySuggestions: (data: any) => apiClient.post('/linkedin/suggestions/summary', data),
  optimizeSkills: (data: any) => apiClient.post('/linkedin/optimize/skills', data),
};

// Roadmap API
export const roadmapApi = {
  createRoadmap: (data: any) => apiClient.post('/roadmap', data),
  getRoadmaps: () => apiClient.get('/roadmap'),
  getRoadmapById: (id: string) => apiClient.get(`/roadmap/${id}`),
  completeMilestone: (id: string, milestoneId: string) => apiClient.post(`/roadmap/${id}/milestones/${milestoneId}/complete`),
  deleteRoadmap: (id: string) => apiClient.delete(`/roadmap/${id}`),
};

// Job Match API
export const jobMatchApi = {
  createMatch: (data: any) => apiClient.post('/jobs', data),
  getMatches: (params?: any) => apiClient.get('/jobs', { params }),
  getMatchById: (id: string) => apiClient.get(`/jobs/${id}`),
  updateStatus: (id: string, data: any) => apiClient.put(`/jobs/${id}/status`, data),
  getStats: () => apiClient.get('/jobs/stats'),
  search: (params?: any) => apiClient.get('/jobs/search', { params }),
  findJobs: (data: any) => apiClient.post('/jobs/find', data),
};

// Subscription API
export const subscriptionApi = {
  getPlans: () => apiClient.get('/subscription/plans'),
  getSubscription: () => apiClient.get('/subscription'),
  mockUpgrade: (plan: 'pro' | 'enterprise' = 'pro') =>
    apiClient.post('/subscription/mock-upgrade', { plan }),
  checkAccess: (feature: string) =>
    apiClient.get(`/subscription/features/${feature}`),
  getBillingHistory: () => apiClient.get('/subscription/billing/history'),
  createCheckoutSession: (plan: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly' = 'monthly') =>
    apiClient.post('/subscription/checkout', { plan, billingCycle }),
  cancelSubscription: (reason?: string, feedback?: string) =>
    apiClient.post('/subscription/cancel', { reason, feedback }),
  earnCredit: () => apiClient.post('/subscription/earn-credit'),
  getCredits: () => apiClient.get('/subscription/credits'),
};

// Admin API
export const adminApi = {
  getStats: () => apiClient.get<any>('/admin/stats'),
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<any>('/admin/users', { params }),
  updateRole: (id: string, role: string) =>
    apiClient.put<any>(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: string) => apiClient.delete<any>(`/admin/users/${id}`),
};

// Cover Letter API
export const coverLetterApi = {
  generate: (data: any) => apiClient.post('/cover-letter/generate', data),
  getHistory: () => apiClient.get('/cover-letter/history'),
  delete: (id: string) => apiClient.delete(`/cover-letter/${id}`),
};

export default api;

