export interface LegalBasis {
  docCode: string;
  docTitle: string;
  article: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXPIRED_PARTIAL' | 'DRAFT';
  fullExcerpt?: string;
}

export interface ActionOption {
  id: string;
  isRecommended: boolean;
  title: string;
  rationale: string;
  legalBasis: LegalBasis;
  draftContentBullets?: string[];
}

export interface DocumentInfo {
  issuer: string;
  codeNumber: string;
  issuedDate: string;
  urgency: 'THƯỜNG' | 'KHẨN' | 'HỎA TỐC';
  subjectTitle?: string;
  slaDeadline?: string;
  previewUrl?: string;
  originalFileName: string;
}

export interface DocumentSummary {
  coreProblem: string;
  submittedBasis: string;
  requestedAction: string;
}

export interface AppraisalChecklistItem {
  criteriaName: string;
  isPassed: boolean;
  legalBasis: string;
  evaluationNote: string;
}

export interface AppraisalVerdict {
  verdictType: 'APPROVED' | 'REQUIRE_ADDITIONAL_INFO' | 'REJECTED' | 'TRANSFER_AUTHORITY';
  verdictTitle: string;
  verdictSummary: string;
  statutoryAuthority: string;
  checklist: AppraisalChecklistItem[];
  missingRequirements: string[];
  primaryLegalBasis: LegalBasis;
  draftContentBullets: string[];
}

export interface AiVerificationInfo {
  isAiVerified: boolean;
  status: 'VERIFIED' | 'BASIC_TEMPLATE' | 'FALLBACK';
  modelUsed: string;
  provider: string;
  confidenceScore: number;
  verifiedAt: string;
  legalBasesCount: number;
  evaluatedRulesCount: number;
  summaryMessage: string;
}

export interface ProcessIncomingResult {
  taskId: string;
  documentInfo: DocumentInfo;
  summary: DocumentSummary;
  appraisalVerdict?: AppraisalVerdict;
  actionOptions: ActionOption[];
  legalAlerts: string[];
  extractedRawText?: string;
  initialDraftHtml?: string;
  processingLogId?: string;
  currentStatus?: string;
  aiVerification?: AiVerificationInfo;
  outputFileName?: string;
  outputFilePath?: string;
  isCustomOutput?: boolean;
}

export interface LegalClause {
  id: string;
  articleNumber: string;
  clauseNumber?: string;
  rawContent: string;
  status: string;
}

export interface LegalRelation {
  id: string;
  relationType: string;
  affectedClauses?: string;
  legalBasisClause?: string;
  targetCode: string;
  targetTitle: string;
}

export interface LegalDocumentItem {
  id: string;
  codeNumber: string;
  title: string;
  docType: string;
  hierarchyRank: number;
  issuer: string;
  issuerAgency?: string;
  documentScope: 'QPPL' | 'HANH_CHINH' | 'HUONG_DAN_NGHIEP_VU';
  fieldCategory: string;
  issuedDate: string;
  effectiveDate: string;
  expiredDate?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'EXPIRED_PARTIAL' | 'DRAFT';
  isDraft: boolean;
  clausesCount: number;
  clauses: LegalClause[];
  relations: LegalRelation[];
}

export interface ProcessingLogItem {
  id: string;
  userName: string;
  incomingDocCode?: string;
  incomingIssuer?: string;
  subjectTitle?: string;
  originalFileName: string;
  urgencyLevel: string;
  receivedDate?: string;
  slaDeadline?: string;
  selectedOptionId: string;
  currentStatus: 'CHO_XU_LY' | 'DANG_XU_LY' | 'DA_XU_LY' | 'DA_KY';
  signedDate?: string;
  createdAt: string;
  isOwner?: boolean;
}

export interface ProcessedRecordItem {
  id: string;
  incomingDocCode?: string;
  incomingIssuer?: string;
  subjectTitle?: string;
  originalFileName: string;
  urgencyLevel: string;
  receivedDate: string;
  slaDeadline?: string;
  selectedOptionId: string;
  currentStatus: 'CHO_XU_LY' | 'DANG_XU_LY' | 'DA_XU_LY' | 'DA_KY';
  signedDate?: string;
  ratingScore?: number;
  isGoldSample: boolean;
  completedAt?: string;
  createdAt: string;
  reprocessCount: number;
  lastReprocessedAt?: string;
  userName: string;
  department: string;
  hasStoredFile: boolean;
  storedFilePath?: string;
  trackingId?: string;
  outputFileName?: string;
  outputFilePath?: string;
  isCustomOutput?: boolean;
  hasOutputFile?: boolean;
}

export interface ProcessedRecordDetail {
  id: string;
  incomingDocCode?: string;
  incomingIssuer?: string;
  subjectTitle?: string;
  originalFileName: string;
  urgencyLevel: string;
  receivedDate: string;
  slaDeadline?: string;
  selectedOptionId: string;
  currentStatus: 'CHO_XU_LY' | 'DANG_XU_LY' | 'DA_XU_LY' | 'DA_KY';
  signedDate?: string;
  ratingScore?: number;
  isGoldSample: boolean;
  completedAt?: string;
  summaryDataJson: string;
  legalBasesUsedJson: string;
  resultDataJson?: string;
  draftContentHtml?: string;
  exportedDocxPath?: string;
  createdAt: string;
  userName: string;
  department: string;
  reprocessCount: number;
  lastReprocessedAt?: string;
  hasStoredFile: boolean;
  storedFilePath?: string;
  trackingId?: string;
  outputFileName?: string;
  outputFilePath?: string;
  isCustomOutput?: boolean;
  signerAuthority?: string;
  recipientsJson?: string;
  docDateStr?: string;
  hasOutputFile?: boolean;
}

export interface UploadCustomOutputResponse {
  processingLogId: string;
  outputFileName: string;
  outputFilePath: string;
  previewUrl: string;
  draftContentHtml: string;
  currentStatus: string;
  isCustomOutput: boolean;
  message: string;
  detectedSubjectTitle?: string;
  detectedDocCode?: string;
  detectedIssuer?: string;
  detectedLegalBases?: string[];
  detectedRecipients?: string[];
}

export interface SaveDraftPayload {
  draftContentHtml: string;
  subjectTitle?: string;
  selectedOptionId?: string;
  issuerParent?: string;
  issuerName?: string;
  docCode?: string;
  location?: string;
  docDateStr?: string;
  signerAuthority?: string;
  signerTitle?: string;
  signerName?: string;
  recipientsList?: string[];
}

export interface ReprocessAiResponse {
  message: string;
  draftContentHtml: string;
  summary: DocumentSummary;
  actionOptions: ActionOption[];
  legalAlerts: string[];
}

export interface ManagedUserItem {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'USER';
  department: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  passwordChangedAt?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  department: string;
  email?: string;
}

export interface UpdateUserPayload {
  fullName: string;
  role: 'USER' | 'ADMIN';
  department: string;
  email?: string;
  isActive: boolean;
}

export interface UserItem {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'USER' | 'SPECIALIST';
  department: string;
  token: string;
}

export interface SampleDocumentItem {
  id: string;
  title: string;
  issuer: string;
  urgency: string;
  description: string;
}

export interface LegalProposalItem {
  id: string;
  title: string;
  notes?: string;
  attachmentPath: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminResponseNote?: string;
  submittedBy: string;
  submitterName: string;
  submitterDepartment: string;
  reviewedBy?: string;
  reviewerName?: string;
  createdAt: string;
  reviewedAt?: string;
}

// ──────────────────── Phase 1.5 Types ────────────────────

export interface ApiKeyVaultItem {
  id: string;
  label: string;
  provider: 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'OPENROUTER' | string;
  model?: string;
  maskedKey: string;
  isActive: boolean;
  status: 'HEALTHY' | 'ERROR' | 'UNCHECKED';
  latencyMs?: number;
  lastTestedAt?: string;
  lastErrorReason?: string;
}

export interface AddApiKeyPayload {
  label?: string;
  provider: string;
  model?: string;
  apiKey: string;
  autoTestAndActivate?: boolean;
}

export interface TestAllApiKeysResult {
  totalKeys: number;
  healthyKeys: number;
  errorKeys: number;
  items: ApiKeyVaultItem[];
  summaryMessage: string;
}

export interface UserAiConfig {
  provider: string;
  model: string;
  effectiveModel?: string;
  hasApiKey: boolean;
  maskedApiKey?: string;
  department: string;
  customPrompt?: string;
  enabledSkillsJson?: string;
  notificationPreferencesJson?: string;
  apiKeysVault?: ApiKeyVaultItem[];
}

export interface UpdateUserAiConfigPayload {
  provider?: string;
  model?: string;
  apiKey?: string;
  customPrompt?: string;
  enabledSkillsJson?: string;
  notificationPreferencesJson?: string;
  apiKeysVault?: ApiKeyVaultItem[];
}

export interface UserNotificationPreferences {
  urgentDocAlert: boolean;
  slaOverdueAlert: boolean;
  slaApproachingAlert: boolean;
  signedDocAlert: boolean;
  slaReminderHoursBefore: number;
}

export interface DepartmentSkillConfigItem {
  id: string;
  name: string;
  description: string;
  legalRef: string;
  isEnabled: boolean;
}

export interface DailyChartPoint {
  label: string;
  dateKey: string;
  receivedCount: number;
  processedCount: number;
  signedCount: number;
  overdueCount: number;
}

export interface DocumentStatistics {
  totalReceived: number;
  choXuLy: number;
  dangXuLy: number;
  daXuLy: number;
  daKy: number;
  overdueSla: number;
  onTimeRate: number;
  periodType: string;
  periodLabel: string;
  statusDistribution: Record<string, number>;
  fieldCategoryDistribution: Record<string, number>;
  urgencyDistribution?: Record<string, number>;
  timelineBreakdown?: DailyChartPoint[];
}

export interface DocumentTemplate {
  parentAgency: string;
  issuingAgency: string;
  docCodeTemplate: string;
  provinceCity: string;
  signerPosition: string;
  signerName: string;
  recipientDefault: string;
}

export interface TestApiKeyPayload {
  provider?: string;
  model?: string;
  apiKey?: string;
  prompt?: string;
}

export interface TestApiKeyResult {
  success: boolean;
  reply?: string;
  latencyMs: number;
  provider: string;
  model: string;
  status: string;
  errorMessage?: string;
  detailedError?: string;
  recommendation?: string;
}

export interface QueueTaskItem {
  trackingId: string;
  fileName: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  processingLogId?: string;
  result?: ProcessIncomingResult;
  createdAt: string;
}

export interface BatchUploadResponse {
  batchId: string;
  totalFiles: number;
  tasks: QueueTaskItem[];
}

export interface ForeignKeyDependencyItem {
  tableName: string;
  label: string;
  count: number;
}

export interface DeleteImpactResult {
  hasForeignKeys: boolean;
  requiresCascadeConfirmation: boolean;
  message: string;
  dependencies: ForeignKeyDependencyItem[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'URGENT_DOC' | 'SLA_WARNING' | 'SIGNED' | 'SYSTEM';
  urgencyLevel: 'HỎA TỐC' | 'THƯỢNG KHẨN' | 'KHẨN' | 'THƯỜNG';
  targetUrl?: string;
  documentCode?: string;
  isRead: boolean;
  createdAt: string;
  slaDeadline?: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh?: string;
  auth?: string;
  deviceName?: string;
}

export interface SendPushNotificationPayload {
  title: string;
  body: string;
  type?: string;
  urgencyLevel?: string;
  documentCode?: string;
  targetUrl?: string;
}

export interface MobileQuickReport {
  timeFilter: string;
  totalReceived: number;
  choXuLy: number;
  dangXuLy: number;
  daXuLy: number;
  daKy: number;
  overdueSla: number;
  urgentCount: number;
  expiringSoonSla: number;
  decree30ComplianceRate: number;
  onTimeRate: number;
  urgencyBreakdown: Record<string, number>;
  urgentAlerts?: NotificationItem[];
}
