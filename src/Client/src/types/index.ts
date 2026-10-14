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

export interface ProcessIncomingResult {
  taskId: string;
  documentInfo: DocumentInfo;
  summary: DocumentSummary;
  appraisalVerdict?: AppraisalVerdict;
  actionOptions: ActionOption[];
  legalAlerts: string[];
  extractedRawText?: string;
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
  slaDeadline?: string;
  selectedOptionId: string;
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
  slaDeadline?: string;
  selectedOptionId: string;
  createdAt: string;
  reprocessCount: number;
  lastReprocessedAt?: string;
  userName: string;
  department: string;
  hasStoredFile: boolean;
}

export interface ProcessedRecordDetail {
  id: string;
  incomingDocCode?: string;
  incomingIssuer?: string;
  subjectTitle?: string;
  originalFileName: string;
  urgencyLevel: string;
  slaDeadline?: string;
  selectedOptionId: string;
  summaryDataJson: string;
  legalBasesUsedJson: string;
  resultDataJson?: string;
  exportedDocxPath?: string;
  createdAt: string;
  userName: string;
  department: string;
  reprocessCount: number;
  lastReprocessedAt?: string;
  hasStoredFile: boolean;
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
