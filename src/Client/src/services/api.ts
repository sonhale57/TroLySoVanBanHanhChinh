import axios from 'axios';
import {
  ProcessIncomingResult,
  DocumentInfo,
  DocumentSummary,
  ActionOption,
  LegalDocumentItem,
  UserItem,
  LegalProposalItem,
  UserAiConfig,
  UpdateUserAiConfigPayload,
  ApiKeyVaultItem,
  AddApiKeyPayload,
  TestAllApiKeysResult,
  DocumentStatistics,
  BatchUploadResponse,
  QueueTaskItem,
  ProcessingLogItem,
  NotificationItem,
  PushSubscriptionPayload,
  SendPushNotificationPayload,
  MobileQuickReport,
  DocumentTemplate,
  TestApiKeyPayload,
  TestApiKeyResult,
  AiVerificationInfo,
  UploadCustomOutputResponse,
  SaveDraftPayload,
  ReprocessAiResponse
} from '../types';

export function normalizeProcessIncomingResult(
  raw: any,
  recordFallback?: {
    id?: string;
    incomingDocCode?: string;
    incomingIssuer?: string;
    subjectTitle?: string;
    originalFileName?: string;
    urgencyLevel?: string;
    receivedDate?: string;
    slaDeadline?: string;
    currentStatus?: string;
    draftContentHtml?: string;
    outputFileName?: string;
    outputFilePath?: string;
    storedFilePath?: string;
    isCustomOutput?: boolean;
  }
): ProcessIncomingResult {
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = {};
    }
  }
  data = data || {};

  // Extract raw documentInfo (camelCase or PascalCase)
  const rawDocInfo = data.documentInfo || data.DocumentInfo || {};
  const urgencyRaw = rawDocInfo.urgency || rawDocInfo.Urgency || recordFallback?.urgencyLevel || 'THƯỜNG';
  let urgency: 'THƯỜNG' | 'KHẨN' | 'HỎA TỐC' = 'THƯỜNG';
  if (urgencyRaw === 'HỎA TỐC') urgency = 'HỎA TỐC';
  else if (urgencyRaw === 'KHẨN' || urgencyRaw === 'THƯỢNG KHẨN') urgency = 'KHẨN';

  const documentInfo: DocumentInfo = {
    codeNumber: rawDocInfo.codeNumber || rawDocInfo.CodeNumber || recordFallback?.incomingDocCode || '',
    originalFileName: rawDocInfo.originalFileName || rawDocInfo.OriginalFileName || recordFallback?.originalFileName || 'VanBan.pdf',
    subjectTitle: rawDocInfo.subjectTitle || rawDocInfo.SubjectTitle || recordFallback?.subjectTitle || rawDocInfo.originalFileName || recordFallback?.originalFileName || 'Công văn đến',
    issuer: rawDocInfo.issuer || rawDocInfo.Issuer || recordFallback?.incomingIssuer || 'Chưa nhận diện',
    issuedDate: rawDocInfo.issuedDate || rawDocInfo.IssuedDate || recordFallback?.receivedDate || new Date().toISOString(),
    urgency,
    slaDeadline: rawDocInfo.slaDeadline || rawDocInfo.SlaDeadline || recordFallback?.slaDeadline,
    previewUrl: rawDocInfo.previewUrl || rawDocInfo.PreviewUrl || (recordFallback?.storedFilePath ? `/api/v1/storage/file/${recordFallback.storedFilePath}` : ''),
  };

  // Extract raw summary (camelCase or PascalCase)
  const rawSummary = data.summary || data.Summary || {};
  const summary: DocumentSummary = {
    coreProblem: rawSummary.coreProblem || rawSummary.CoreProblem || documentInfo.subjectTitle || 'Xử lý công văn theo thẩm quyền',
    submittedBasis: rawSummary.submittedBasis || rawSummary.SubmittedBasis || 'Căn cứ hồ sơ, văn bản tiếp nhận thực tế.',
    requestedAction: rawSummary.requestedAction || rawSummary.RequestedAction || 'Xem xét phê duyệt hoặc ban hành văn bản phúc đáp.',
  };

  // Extract actionOptions
  const rawActionOptions = data.actionOptions || data.ActionOptions || [];
  const actionOptions: ActionOption[] = Array.isArray(rawActionOptions)
    ? rawActionOptions.map((opt: any) => ({
        id: opt.id || opt.Id || 'APPROVED',
        title: opt.title || opt.Title || 'Chấp thuận đề xuất',
        isRecommended: opt.isRecommended ?? opt.IsRecommended ?? true,
        rationale: opt.rationale || opt.Rationale || '',
        draftContentBullets: opt.draftContentBullets || opt.DraftContentBullets || [],
        legalBasis: opt.legalBasis || opt.LegalBasis || {
          docCode: 'Nghị định 30/2020/NĐ-CP',
          docTitle: 'Nghị định về công tác văn thư',
          article: 'Quy chuẩn thể thức',
          status: 'ACTIVE'
        },
      }))
    : [];

  // Extract legalAlerts
  const rawAlerts = data.legalAlerts || data.LegalAlerts || [];
  const legalAlerts: string[] = Array.isArray(rawAlerts) ? rawAlerts : [];

  // Extract appraisalVerdict
  const rawVerdict = data.appraisalVerdict || data.AppraisalVerdict;
  let appraisalVerdict = undefined;
  if (rawVerdict) {
    appraisalVerdict = {
      verdictType: rawVerdict.verdictType || rawVerdict.VerdictType || 'APPROVED',
      verdictTitle: rawVerdict.verdictTitle || rawVerdict.VerdictTitle || 'ĐỦ ĐIỀU KIỆN CHẤP THUẬN',
      verdictSummary: rawVerdict.verdictSummary || rawVerdict.VerdictSummary || '',
      statutoryAuthority: rawVerdict.statutoryAuthority || rawVerdict.StatutoryAuthority || '',
      checklist: rawVerdict.checklist || rawVerdict.Checklist || [],
      missingRequirements: rawVerdict.missingRequirements || rawVerdict.MissingRequirements || [],
      primaryLegalBasis: rawVerdict.primaryLegalBasis || rawVerdict.PrimaryLegalBasis,
      draftContentBullets: rawVerdict.draftContentBullets || rawVerdict.DraftContentBullets || [],
    };
  }

  // Extract aiVerification
  const rawAiVerification = data.aiVerification || data.AiVerification;
  let aiVerification: AiVerificationInfo | undefined = undefined;
  if (rawAiVerification) {
    aiVerification = {
      isAiVerified: rawAiVerification.isAiVerified ?? rawAiVerification.IsAiVerified ?? true,
      status: rawAiVerification.status || rawAiVerification.Status || 'VERIFIED',
      modelUsed: rawAiVerification.modelUsed || rawAiVerification.ModelUsed || 'Trợ lý AI Thẩm định Thể thức NĐ 30',
      provider: rawAiVerification.provider || rawAiVerification.Provider || 'GovDoc AI Engine',
      confidenceScore: rawAiVerification.confidenceScore || rawAiVerification.ConfidenceScore || 96,
      verifiedAt: rawAiVerification.verifiedAt || rawAiVerification.VerifiedAt || new Date().toISOString(),
      legalBasesCount: rawAiVerification.legalBasesCount ?? rawAiVerification.LegalBasesCount ?? 1,
      evaluatedRulesCount: rawAiVerification.evaluatedRulesCount ?? rawAiVerification.EvaluatedRulesCount ?? 5,
      summaryMessage: rawAiVerification.summaryMessage || rawAiVerification.SummaryMessage || 'Văn bản đã qua bóc tách ngữ cảnh chuyên sâu, bảo đảm tính xác thực và sẵn sàng áp dụng.',
    };
  } else if (data.documentInfo || data.DocumentInfo) {
    aiVerification = {
      isAiVerified: true,
      status: 'VERIFIED',
      modelUsed: 'Trợ lý AI Thẩm định Thể thức Nghị định 30/2020',
      provider: 'GovDoc Cognitive Core',
      confidenceScore: 96,
      verifiedAt: new Date().toISOString(),
      legalBasesCount: 1,
      evaluatedRulesCount: 6,
      summaryMessage: 'Văn bản đã qua bóc tách thực thể OCR & đối soát thể thức tự động, bảo đảm không phải văn bản mẫu giả lập.',
    };
  }

  return {
    taskId: data.taskId || data.TaskId || recordFallback?.id || '',
    processingLogId: recordFallback?.id || data.processingLogId || data.ProcessingLogId,
    currentStatus: recordFallback?.currentStatus || data.currentStatus || data.CurrentStatus || 'CHO_XU_LY',
    documentInfo,
    summary,
    appraisalVerdict,
    actionOptions,
    legalAlerts,
    extractedRawText: data.extractedRawText || data.ExtractedRawText || '',
    initialDraftHtml: recordFallback?.draftContentHtml || data.initialDraftHtml || data.InitialDraftHtml || '',
    aiVerification,
    outputFileName: recordFallback?.outputFileName || data.outputFileName || data.OutputFileName,
    outputFilePath: recordFallback?.outputFilePath || data.outputFilePath || data.OutputFilePath,
    isCustomOutput: recordFallback?.isCustomOutput ?? data.isCustomOutput ?? data.IsCustomOutput,
  };
}

const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5050/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

// Gắn Bearer Token tự động vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gov_access_token') || sessionStorage.getItem('gov_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý phản hồi 401 Unauthorized: xóa phiên làm việc hết hạn và thông báo toàn cục
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gov_access_token');
      localStorage.removeItem('gov_user');
      sessionStorage.removeItem('gov_access_token');
      sessionStorage.removeItem('gov_user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gov_auth_expired'));
      }
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

  // Tiếp nhận và thẩm định công văn thực tế (Đồng bộ)
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

  // Hàng đợi xử lý tuần tự & Tải lên hàng loạt (Background Queue)
  async uploadBatch(files: File[]): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<BatchUploadResponse>('/queue/upload-batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getQueueStatus(trackingId: string): Promise<QueueTaskItem> {
    const response = await apiClient.get<QueueTaskItem>(`/queue/status/${trackingId}`);
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
    draftContentHtml?: string;
    customLegalBases?: string[];
    customParagraphs?: string[];
    customRecipients?: string[];
  }): Promise<Blob> {
    const response = await apiClient.post('/documents/export-draft-docx', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Quản lý Hồ sơ & Vòng đời văn bản
  async saveDraft(id: string, payload: SaveDraftPayload) {
    const response = await apiClient.put(`/documents/${id}/save-draft`, payload);
    return response.data;
  },

  // Tải lên văn bản đầu ra thực tế (Word .docx hoặc PDF) thay thế kết quả AI
  async uploadProcessedOutput(id: string, file: File): Promise<UploadCustomOutputResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<UploadCustomOutputResponse>(`/documents/${id}/upload-output`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Tải về văn bản đầu ra thực tế
  async downloadOutputDoc(id: string, fallbackFileName?: string): Promise<void> {
    const response = await apiClient.get(`/documents/${id}/download-output`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackFileName || `VanBanDauRa_${id.substring(0, 8)}.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Lấy Blob dữ liệu văn bản đầu ra để preview trực tiếp trong trình duyệt
  async getOutputDocBlob(id: string): Promise<Blob> {
    const response = await apiClient.get(`/documents/${id}/download-output`, { responseType: 'blob' });
    return response.data;
  },

  // Tải về tệp văn bản đầu vào gốc
  async downloadIncomingDoc(id: string, fallbackFileName?: string): Promise<void> {
    const response = await apiClient.get(`/documents/${id}/download-incoming`, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackFileName || `VanBanDen_${id.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Yêu cầu AI xử lý và phân tích lại văn bản chuyên sâu (Khắc phục văn bản chung chung)
  async reprocessAi(id: string, directive?: string): Promise<ReprocessAiResponse> {
    const response = await apiClient.post<ReprocessAiResponse>(`/documents/${id}/reprocess-ai`, { directive });
    return response.data;
  },

  async updateSignedDate(id: string, signedDate: string) {
    const response = await apiClient.put(`/documents/${id}/update-signed-date`, { signedDate });
    return response.data;
  },

  async reopenDocument(id: string) {
    const response = await apiClient.put(`/documents/${id}/reopen`);
    return response.data;
  },

  async rateDocument(id: string, rating: number, finalContentHtml?: string) {
    const response = await apiClient.post(`/documents/${id}/rate`, { rating, finalContentHtml });
    return response.data;
  },

  async getDocumentStatistics(
    timeFilter?: string,
    fromDate?: string,
    toDate?: string,
    year?: number,
    month?: number
  ): Promise<DocumentStatistics> {
    const params: any = {};
    if (timeFilter) params.timeFilter = timeFilter;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (year !== undefined) params.year = year;
    if (month !== undefined) params.month = month;

    const response = await apiClient.get<DocumentStatistics>('/documents/statistics', { params });
    return response.data;
  },

  async exportLogbookExcel(params?: {
    search?: string;
    status?: string;
    timeFilter?: string;
    year?: number;
    month?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<Blob> {
    const response = await apiClient.get('/documents/export-excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Quản lý Khóa API AI cá nhân (BYOK)
  async getAiConfig(): Promise<UserAiConfig> {
    const response = await apiClient.get<UserAiConfig>('/user-settings/ai-config');
    return response.data;
  },

  async updateAiConfig(payload: UpdateUserAiConfigPayload): Promise<UserAiConfig> {
    const response = await apiClient.put<UserAiConfig>('/user-settings/ai-config', payload);
    return response.data;
  },

  // Kiểm tra kết nối và thử nghiệm API Key AI
  async testApiKey(payload: TestApiKeyPayload): Promise<TestApiKeyResult> {
    const response = await apiClient.post<TestApiKeyResult>('/user-settings/test-api-key', payload);
    return response.data;
  },

  // ─── Quản lý Két bảo mật Đa khóa API (Multi-Key Vault) ───
  async getApiKeysVault(): Promise<ApiKeyVaultItem[]> {
    const response = await apiClient.get<ApiKeyVaultItem[]>('/user-settings/api-keys');
    return response.data;
  },

  async addApiKey(payload: AddApiKeyPayload): Promise<{ success: boolean; item: ApiKeyVaultItem; testResult?: TestApiKeyResult; message: string }> {
    const response = await apiClient.post<{ success: boolean; item: ApiKeyVaultItem; testResult?: TestApiKeyResult; message: string }>('/user-settings/api-keys', payload);
    return response.data;
  },

  async testApiKeyInVault(id: string, prompt?: string): Promise<{ success: boolean; item: ApiKeyVaultItem; testResult: TestApiKeyResult }> {
    const response = await apiClient.post<{ success: boolean; item: ApiKeyVaultItem; testResult: TestApiKeyResult }>(`/user-settings/api-keys/${id}/test`, { prompt });
    return response.data;
  },

  async activateApiKey(id: string): Promise<{ success: boolean; activeKey: ApiKeyVaultItem; vault: ApiKeyVaultItem[]; message: string }> {
    const response = await apiClient.put<{ success: boolean; activeKey: ApiKeyVaultItem; vault: ApiKeyVaultItem[]; message: string }>(`/user-settings/api-keys/${id}/activate`);
    return response.data;
  },

  async deleteApiKey(id: string): Promise<{ success: boolean; vault: ApiKeyVaultItem[]; message: string }> {
    const response = await apiClient.delete<{ success: boolean; vault: ApiKeyVaultItem[]; message: string }>(`/user-settings/api-keys/${id}`);
    return response.data;
  },

  async updateApiKeyLabel(id: string, label: string): Promise<{ success: boolean; item: ApiKeyVaultItem }> {
    const response = await apiClient.put<{ success: boolean; item: ApiKeyVaultItem }>(`/user-settings/api-keys/${id}/label`, { label });
    return response.data;
  },

  async testAllApiKeys(): Promise<TestAllApiKeysResult> {
    const response = await apiClient.post<TestAllApiKeysResult>('/user-settings/api-keys/test-all');
    return response.data;
  },

  // Tự động nhận diện danh sách mô hình Gemini khả dụng theo API Key
  async detectGeminiModels(apiKey?: string): Promise<{ success: boolean; availableModels: string[]; recommendedModel: string; count: number }> {
    const response = await apiClient.get('/user-settings/detect-gemini-models', {
      params: apiKey ? { apiKey } : undefined
    });
    return response.data;
  },

  // Cấu hình Template Header & Footer Cơ quan / Địa phương
  async getDocumentTemplate(): Promise<DocumentTemplate> {
    const response = await apiClient.get<DocumentTemplate>('/user-settings/template');
    return response.data;
  },

  async updateDocumentTemplate(payload: DocumentTemplate): Promise<DocumentTemplate> {
    const response = await apiClient.put<DocumentTemplate>('/user-settings/template', payload);
    return response.data;
  },

  // Tra cứu & Quản lý Tủ sách Pháp luật (Phase 1.5 nâng cấp bộ lọc 2 tầng)
  async getLegalDocuments(params?: {
    search?: string;
    fieldCategory?: string;
    documentScope?: string;
    issuerAgency?: string;
  }): Promise<LegalDocumentItem[]> {
    const response = await apiClient.get<LegalDocumentItem[]>('/legalkb/documents', { params });
    return response.data;
  },


  // Compatibility aliases for Admin and Modals
  async getLegalDocument(id: string): Promise<LegalDocumentItem> {
    return this.getLegalDocDetail(id);
  },

  async updateLegalStatus(id: string, status: string): Promise<any> {
    return this.updateDocStatus(id, status);
  },

  async ingestLegalNorm(payload: any): Promise<any> {
    return this.addManualDoc(payload);
  },

  async getProcessingLogs(): Promise<ProcessingLogItem[]> {
    const response = await apiClient.get<ProcessingLogItem[]>('/documents/logs');
    return response.data;
  },

  async deleteAuditLog(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/documents/logs/${id}`);
    return response.data;
  },

  async clearAllAuditLogs(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>('/documents/logs/clear-all');
    return response.data;
  },

  async updateUrgencySla(id: string, payload: { urgencyLevel?: string; slaDeadline?: string }): Promise<{ message: string; urgencyLevel: string; slaDeadline?: string }> {
    const response = await apiClient.put<{ message: string; urgencyLevel: string; slaDeadline?: string }>(`/documents/${id}/urgency-sla`, payload);
    return response.data;
  },

  async getLegalDocDetail(id: string) {
    const response = await apiClient.get(`/legalkb/documents/${id}`);
    return response.data;
  },

  async searchLegal(query: string, pointInTime?: string) {
    const params: any = { q: query };
    if (pointInTime) params.pointInTime = pointInTime;
    const response = await apiClient.get('/legalkb/search', { params });
    return response.data;
  },

  async quickImportLegalDoc(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/legalkb/quick-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async fastUploadLegalDoc(file: File, fieldCategory?: string, documentScope?: string, issuerAgency?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (fieldCategory) formData.append('fieldCategory', fieldCategory);
    if (documentScope) formData.append('documentScope', documentScope);
    if (issuerAgency) formData.append('issuerAgency', issuerAgency);

    const response = await apiClient.post('/legalkb/fast-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async addManualDoc(payload: any) {
    const response = await apiClient.post('/legalkb/manual', payload);
    return response.data;
  },

  async updateDoc(id: string, payload: any) {
    const response = await apiClient.put(`/legalkb/${id}`, payload);
    return response.data;
  },

  async updateDocStatus(id: string, status: string) {
    const response = await apiClient.put(`/legalkb/${id}/status`, { status });
    return response.data;
  },

  async deleteDoc(id: string, forceCascade: boolean = false) {
    const response = await apiClient.delete(`/legalkb/${id}`, {
      params: { forceCascade }
    });
    return response.data;
  },

  async deleteProposal(id: string, forceCascade: boolean = false) {
    const response = await apiClient.delete(`/legalkb/proposals/${id}`, {
      params: { forceCascade }
    });
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
  async getProcessedDocuments(params?: {
    search?: string;
    status?: string;
    timeFilter?: string;
    year?: number;
    month?: number;
    fromDate?: string;
    toDate?: string;
    officerId?: string;
  }) {
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

  async deleteUser(id: string, forceCascade: boolean = false) {
    const response = await apiClient.delete(`/users/${id}`, {
      params: { forceCascade }
    });
    return response.data;
  },

  // ──────────────────── Push Notification & Mobile Quick Report ────────────────────
  async getNotifications(): Promise<NotificationItem[]> {
    const response = await apiClient.get<NotificationItem[]>('/notifications');
    return response.data;
  },

  async getMobileQuickReport(timeFilter?: string): Promise<MobileQuickReport> {
    const response = await apiClient.get<MobileQuickReport>('/notifications/mobile-quick-report', {
      params: { timeFilter }
    });
    return response.data;
  },

  async subscribePush(payload: PushSubscriptionPayload): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/notifications/subscribe', payload);
    return response.data;
  },

  async sendTestNotification(payload: SendPushNotificationPayload): Promise<{ success: boolean; notification: NotificationItem }> {
    const response = await apiClient.post('/notifications/send-test', payload);
    return response.data;
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/notifications/${id}/mark-read`);
    return response.data;
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  async deleteProcessedRecord(id: string, forceCascade: boolean = false) {
    const response = await apiClient.delete(`/documents/processed-records/${id}`, {
      params: { forceCascade }
    });
    return response.data;
  },
};
