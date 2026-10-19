import axios from 'axios';
import {
  ProcessIncomingResult,
  LegalDocumentItem,
  ProcessingLogItem,
  UserItem,
  SampleDocumentItem,
  LegalProposalItem
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5050/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Gắn Bearer Token tự động vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gov_access_token') || sessionStorage.getItem('gov_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý phản hồi 401 Unauthorized: xóa phiên làm việc hết hạn
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gov_access_token');
      localStorage.removeItem('gov_user');
      sessionStorage.removeItem('gov_access_token');
      sessionStorage.removeItem('gov_user');
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Xác thực & Tài khoản cán bộ
  async login(username: string, password: string, rememberMe: boolean = false) {
    const response = await apiClient.post('/auth/login', { username, password, rememberMe });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  async getMe(): Promise<UserItem> {
    const response = await apiClient.get<UserItem>('/auth/me');
    return response.data;
  },

  async getDemoUsers(): Promise<UserItem[]> {
    const response = await apiClient.get<UserItem[]>('/auth/demo-users');
    return response.data;
  },

  // Tiếp nhận và thẩm định công văn thực tế
  async processIncoming(file: File): Promise<ProcessIncomingResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ProcessIncomingResult>('/documents/process-incoming', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Xuất file Word .docx chuẩn Nghị định 30
  async exportDraftDocx(params: {
    taskId: string;
    selectedOptionId: string;
    subjectTitle?: string;
    supplementaryNotes?: string;
    issuerParent?: string;
    issuerName?: string;
    docCode?: string;
    location?: string;
    recipientMain?: string;
    signerTitle?: string;
    signerName?: string;
    customLegalBases?: string[];
    customParagraphs?: string[];
    customRecipients?: string[];
  }): Promise<Blob> {
    const response = await apiClient.post('/documents/export-draft-docx', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Danh mục văn bản mẫu & Audit log
  async getSampleDocuments(): Promise<SampleDocumentItem[]> {
    const response = await apiClient.get<SampleDocumentItem[]>('/documents/samples');
    return response.data;
  },

  async getProcessingLogs(): Promise<ProcessingLogItem[]> {
    const response = await apiClient.get<ProcessingLogItem[]>('/documents/logs');
    return response.data;
  },

  // Tủ sách pháp lý (Tra cứu & Quản trị)
  async getLegalDocuments(): Promise<LegalDocumentItem[]> {
    const response = await apiClient.get<LegalDocumentItem[]>('/legalkb/documents');
    return response.data;
  },

  async searchLegalKB(query: string, pointInTime?: string) {
    const response = await apiClient.get('/legalkb/search', {
      params: { q: query, pointInTime },
    });
    return response.data;
  },

  async ingestLegalNorm(payload: any) {
    const response = await apiClient.post('/legalkb/manual', {
      codeNumber: payload.codeNumber,
      title: payload.title,
      docType: payload.docType,
      issuer: payload.issuer,
      effectiveDate: payload.effectiveDate,
      status: payload.status,
      notes: payload.fullContent,
    });
    return response.data;
  },

  // Quản trị tủ sách Phase 2
  async quickImportLegalDoc(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/legalkb/quick-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getLegalDocument(id: string): Promise<LegalDocumentItem> {
    const response = await apiClient.get<LegalDocumentItem>(`/legalkb/documents/${id}`);
    return response.data;
  },

  async addManualDoc(payload: {
    codeNumber: string;
    title: string;
    docType: string;
    issuer: string;
    effectiveDate: string;
    expiredDate?: string;
    status: string;
    notes?: string;
    clauses?: { articleNumber: string; clauseNumber?: string; rawContent: string; status?: string }[];
  }) {
    const response = await apiClient.post('/legalkb/manual', payload);
    return response.data;
  },

  async updateDoc(id: string, payload: {
    codeNumber: string;
    title: string;
    docType: string;
    issuer: string;
    effectiveDate: string;
    expiredDate?: string;
    status: string;
    notes?: string;
    clauses?: { id?: string; articleNumber: string; clauseNumber?: string; rawContent: string; status?: string }[];
  }) {
    const response = await apiClient.put(`/legalkb/${id}`, payload);
    return response.data;
  },

  async updateLegalStatus(id: string, status: string) {
    const response = await apiClient.put(`/legalkb/${id}/status`, { status });
    return response.data;
  },

  async deleteDoc(id: string) {
    const response = await apiClient.delete(`/legalkb/${id}`);
    return response.data;
  },

  // Phân hệ Đề xuất cập nhật pháp luật (Legal Proposals)
  async getProposals(): Promise<LegalProposalItem[]> {
    const response = await apiClient.get<LegalProposalItem[]>('/legalkb/proposals');
    return response.data;
  },

  async submitProposal(title: string, notes?: string, file?: File) {
    const formData = new FormData();
    formData.append('title', title);
    if (notes) formData.append('notes', notes);
    if (file) formData.append('file', file);

    const response = await apiClient.post('/legalkb/proposals', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async reviewProposal(id: string, status: string, adminResponseNote?: string) {
    const response = await apiClient.put(`/legalkb/proposals/${id}/review`, {
      status,
      adminResponseNote,
    });
    return response.data;
  },

  // Quản lý Hồ sơ đã xử lý & Xử lý lại văn bản
  async getProcessedDocuments(search?: string) {
    const params = search ? { search } : {};
    const response = await apiClient.get('/documents/processed-records', { params });
    return response.data;
  },

  async getProcessedDocumentDetail(id: string) {
    const response = await apiClient.get(`/documents/processed-records/${id}`);
    return response.data;
  },

  async reprocessDocument(id: string) {
    const response = await apiClient.post(`/documents/processed-records/${id}/reprocess`);
    return response.data;
  },

  // Quản lý Tài khoản Cán bộ (Chỉ dành cho ADMIN)
  async getUsers(search?: string) {
    const params = search ? { search } : {};
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  async createUser(payload: {
    username: string;
    password: string;
    fullName: string;
    role: string;
    department: string;
    email?: string;
  }) {
    const response = await apiClient.post('/users', payload);
    return response.data;
  },

  async updateUser(
    id: string,
    payload: {
      fullName: string;
      role: string;
      department: string;
      email?: string;
      isActive: boolean;
    }
  ) {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data;
  },

  async resetUserPassword(id: string, newPassword: string) {
    const response = await apiClient.put(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  async toggleUserStatus(id: string) {
    const response = await apiClient.put(`/users/${id}/toggle-status`);
    return response.data;
  },
};
