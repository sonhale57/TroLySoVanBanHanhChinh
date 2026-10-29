using System;
using System.Collections.Generic;

namespace GovDoc.Application.DTOs
{
    public class ProcessIncomingResultDto
    {
        public string TaskId { get; set; } = string.Empty;
        public DocumentInfoDto DocumentInfo { get; set; } = new();
        public DocumentSummaryDto Summary { get; set; } = new();
        public AppraisalVerdictDto AppraisalVerdict { get; set; } = new();
        public List<ActionOptionDto> ActionOptions { get; set; } = new();
        public List<string> LegalAlerts { get; set; } = new();
        public string ExtractedRawText { get; set; } = string.Empty;
        public string? InitialDraftHtml { get; set; } // Dự thảo ban đầu chuẩn Nghị định 30 nạp vào editor
        public Guid? ProcessingLogId { get; set; }
        public string CurrentStatus { get; set; } = "CHO_XU_LY";
        public AiVerificationInfoDto? AiVerification { get; set; }
    }

    public class AiVerificationInfoDto
    {
        public bool IsAiVerified { get; set; } = true;
        public string Status { get; set; } = "VERIFIED"; // VERIFIED, BASIC_TEMPLATE, FALLBACK
        public string ModelUsed { get; set; } = "Trợ lý AI Thẩm định Thể thức NĐ 30";
        public string Provider { get; set; } = "GovDoc AI Engine";
        public int ConfidenceScore { get; set; } = 96;
        public DateTimeOffset VerifiedAt { get; set; } = DateTimeOffset.UtcNow;
        public int LegalBasesCount { get; set; } = 1;
        public int EvaluatedRulesCount { get; set; } = 8;
        public string SummaryMessage { get; set; } = "Văn bản đã qua bóc tách ngữ cảnh chuyên sâu, bảo đảm tính xác thực và sẵn sàng áp dụng.";
    }

    public class AppraisalChecklistItemDto
    {
        public string CriteriaName { get; set; } = string.Empty;
        public bool IsPassed { get; set; }
        public string LegalBasis { get; set; } = string.Empty;
        public string EvaluationNote { get; set; } = string.Empty;
    }

    public class AppraisalVerdictDto
    {
        public string VerdictType { get; set; } = "APPROVED"; // APPROVED, REQUIRE_ADDITIONAL_INFO, REJECTED, TRANSFER_AUTHORITY
        public string VerdictTitle { get; set; } = string.Empty;
        public string VerdictSummary { get; set; } = string.Empty;
        public string StatutoryAuthority { get; set; } = string.Empty;
        public List<AppraisalChecklistItemDto> Checklist { get; set; } = new();
        public List<string> MissingRequirements { get; set; } = new();
        public LegalBasisDto PrimaryLegalBasis { get; set; } = new();
        public List<string> DraftContentBullets { get; set; } = new();
    }

    public class DocumentInfoDto
    {
        public string Issuer { get; set; } = string.Empty;
        public string CodeNumber { get; set; } = string.Empty;
        public string IssuedDate { get; set; } = string.Empty;
        public string Urgency { get; set; } = "THƯỜNG"; // THƯỜNG, KHẨN, HỎA TỐC
        public string SubjectTitle { get; set; } = string.Empty;
        public DateTimeOffset? SlaDeadline { get; set; }
        public string? PreviewUrl { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
    }

    public class DocumentSummaryDto
    {
        public string CoreProblem { get; set; } = string.Empty;
        public string SubmittedBasis { get; set; } = string.Empty;
        public string RequestedAction { get; set; } = string.Empty;
    }

    public class ActionOptionDto
    {
        public string Id { get; set; } = string.Empty;
        public bool IsRecommended { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Rationale { get; set; } = string.Empty;
        public LegalBasisDto LegalBasis { get; set; } = new();
        public List<string> DraftContentBullets { get; set; } = new();
    }

    public class LegalBasisDto
    {
        public string DocCode { get; set; } = string.Empty;
        public string DocTitle { get; set; } = string.Empty;
        public string Article { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";
        public string FullExcerpt { get; set; } = string.Empty;
    }

    public class ExportDraftRequestDto
    {
        public string TaskId { get; set; } = string.Empty;
        public string SelectedOptionId { get; set; } = "OPT-01";
        public string? SubjectTitle { get; set; }
        public string? SupplementaryNotes { get; set; }
        public string? IssuerParent { get; set; }
        public string? IssuerName { get; set; }
        public string? DocCode { get; set; }
        public string? Location { get; set; }
        public string? RecipientMain { get; set; }
        public string? SignerTitle { get; set; }
        public string? SignerName { get; set; }
        public string? DraftContentHtml { get; set; } // Nội dung từ trình soạn thảo In-App
        public List<string>? CustomLegalBases { get; set; }
        public List<string>? CustomParagraphs { get; set; }
        public List<string>? CustomRecipients { get; set; }
    }

    public class IngestLegalNormDto
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = string.Empty;
        public string? IssuerAgency { get; set; }
        public string DocumentScope { get; set; } = "QPPL";
        public string FieldCategory { get; set; } = "QUAN_TRI_VAN_PHONG";
        public DateTime IssuedDate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public bool IsDraft { get; set; } = false;
        public string FullContent { get; set; } = string.Empty;
        public string? ReplacesDocCode { get; set; }
        public string? AmendsDocCode { get; set; }
    }

    public class QuickImportResultDto
    {
        public string DetectedCode { get; set; } = string.Empty;
        public string DetectedTitle { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = "Chính phủ";
        public string? IssuerAgency { get; set; }
        public string DocumentScope { get; set; } = "QPPL";
        public string FieldCategory { get; set; } = "QUAN_TRI_VAN_PHONG";
        public DateTime EffectiveDate { get; set; }
        public string? ReplacesDocCode { get; set; }
        public string? ReplacesDocTitle { get; set; }
        public string SuggestedAction { get; set; } = "NONE";
        public string ExtractedSummary { get; set; } = string.Empty;
        public Guid? ExistingTargetDocId { get; set; }
    }

    public class LegalClauseInputDto
    {
        public Guid? Id { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string? ClauseNumber { get; set; }
        public string RawContent { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";
    }

    public class ManualLegalDocDto
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = "Chính phủ";
        public string? IssuerAgency { get; set; }
        public string DocumentScope { get; set; } = "QPPL";
        public string FieldCategory { get; set; } = "QUAN_TRI_VAN_PHONG";
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public string? Notes { get; set; }
        public List<LegalClauseInputDto>? Clauses { get; set; }
    }

    public class UpdateLegalDocDto
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = string.Empty;
        public string? IssuerAgency { get; set; }
        public string DocumentScope { get; set; } = "QPPL";
        public string FieldCategory { get; set; } = "QUAN_TRI_VAN_PHONG";
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public string? Notes { get; set; }
        public List<LegalClauseInputDto>? Clauses { get; set; }
    }

    public class LegalSearchResultDto
    {
        public Guid DocId { get; set; }
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = string.Empty;
        public int HierarchyRank { get; set; }
        public string Issuer { get; set; } = string.Empty;
        public string? IssuerAgency { get; set; }
        public string DocumentScope { get; set; } = "QPPL";
        public string FieldCategory { get; set; } = "QUAN_TRI_VAN_PHONG";
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public bool IsDraft { get; set; }
        public List<ClauseExcerptDto> MatchedClauses { get; set; } = new();
        public List<string> RelatedDocuments { get; set; } = new();
    }

    public class ClauseExcerptDto
    {
        public Guid Id { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string? ClauseNumber { get; set; }
        public string RawContent { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";
    }

    public class UserDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public string Department { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Token { get; set; } = string.Empty;
    }

    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; } = false;
    }

    public class LoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        public int ExpiresIn { get; set; } = 28800; // 8 hours in seconds
        public string RefreshToken { get; set; } = string.Empty;
        public UserDto User { get; set; } = new();
    }

    public class ChangePasswordRequestDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class CreateLegalProposalDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class ReviewLegalProposalDto
    {
        public string Status { get; set; } = "APPROVED"; // APPROVED, REJECTED
        public string? AdminResponseNote { get; set; }
    }

    public class LegalProposalItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string AttachmentPath { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING"; // PENDING, APPROVED, REJECTED
        public string? AdminResponseNote { get; set; }
        public Guid SubmittedBy { get; set; }
        public string SubmitterName { get; set; } = string.Empty;
        public string SubmitterDepartment { get; set; } = string.Empty;
        public Guid? ReviewedBy { get; set; }
        public string? ReviewerName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
    }

    public class ProcessedRecordListItemDto
    {
        public Guid Id { get; set; }
        public string? IncomingDocCode { get; set; }
        public string? IncomingIssuer { get; set; }
        public string? SubjectTitle { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string UrgencyLevel { get; set; } = "THUONG";
        public DateTimeOffset ReceivedDate { get; set; }
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SelectedOptionId { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = "CHO_XU_LY";
        public DateTimeOffset? SignedDate { get; set; }
        public int? RatingScore { get; set; }
        public bool IsGoldSample { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public bool HasStoredFile { get; set; }
        public string? TrackingId { get; set; }
        public string? OutputFileName { get; set; }
        public string? OutputFilePath { get; set; }
        public string? StoredFilePath { get; set; }
        public bool IsCustomOutput { get; set; }
        public bool HasOutputFile => !string.IsNullOrEmpty(OutputFilePath) || !string.IsNullOrEmpty(OutputFileName);
    }

    public class ProcessedRecordDetailDto
    {
        public Guid Id { get; set; }
        public string? IncomingDocCode { get; set; }
        public string? IncomingIssuer { get; set; }
        public string? SubjectTitle { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string UrgencyLevel { get; set; } = "THUONG";
        public DateTimeOffset ReceivedDate { get; set; }
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SelectedOptionId { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = "CHO_XU_LY";
        public DateTimeOffset? SignedDate { get; set; }
        public int? RatingScore { get; set; }
        public bool IsGoldSample { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public string SummaryDataJson { get; set; } = string.Empty;
        public string LegalBasesUsedJson { get; set; } = string.Empty;
        public string? ResultDataJson { get; set; }
        public string? DraftContentHtml { get; set; }
        public string? ExportedDocxPath { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }
        public bool HasStoredFile { get; set; }
        public string? TrackingId { get; set; }
        public string? OutputFileName { get; set; }
        public string? OutputFilePath { get; set; }
        public string? StoredFilePath { get; set; }
        public bool IsCustomOutput { get; set; }
        public string? SignerAuthority { get; set; }
        public string? RecipientsJson { get; set; }
        public string? DocDateStr { get; set; }
        public bool HasOutputFile => !string.IsNullOrEmpty(OutputFilePath) || !string.IsNullOrEmpty(OutputFileName);
    }

    public class UserListItemDto
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public string Department { get; set; } = string.Empty;
        public string? Email { get; set; }
        public bool IsActive { get; set; } = true;
        public string? AiProvider { get; set; }
        public string? AiModel { get; set; }
        public bool HasCustomApiKey { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? PasswordChangedAt { get; set; }
    }

    public class CreateUserRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public string Department { get; set; } = string.Empty;
        public string? Email { get; set; }
    }

    public class UpdateUserRequestDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER";
        public string Department { get; set; } = string.Empty;
        public string? Email { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class AdminResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    // ──────────────────────── Phase 1.5 DTOs ────────────────────────

    public class ApiKeyVaultItemDto
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N");
        public string Label { get; set; } = string.Empty;
        public string Provider { get; set; } = "GEMINI"; // GEMINI, OPENAI, ANTHROPIC, OPENROUTER
        public string? Model { get; set; }
        public string MaskedKey { get; set; } = string.Empty;
        public string? EncryptedKey { get; set; } // Mã hóa AES-256 lưu nội bộ
        public bool IsActive { get; set; }
        public string Status { get; set; } = "UNCHECKED"; // HEALTHY, ERROR, UNCHECKED
        public long? LatencyMs { get; set; }
        public DateTimeOffset? LastTestedAt { get; set; }
        public string? LastErrorReason { get; set; }
    }

    public class AddApiKeyRequestDto
    {
        public string? Label { get; set; }
        public string Provider { get; set; } = "GEMINI";
        public string? Model { get; set; }
        public string ApiKey { get; set; } = string.Empty;
        public bool AutoTestAndActivate { get; set; } = false;
    }

    public class UpdateApiKeyLabelRequestDto
    {
        public string Label { get; set; } = string.Empty;
    }

    public class TestAllApiKeysResponseDto
    {
        public int TotalKeys { get; set; }
        public int HealthyKeys { get; set; }
        public int ErrorKeys { get; set; }
        public List<ApiKeyVaultItemDto> Items { get; set; } = new();
        public string SummaryMessage { get; set; } = string.Empty;
    }

    public class UserAiConfigDto
    {
        public string? Provider { get; set; }
        public string? Model { get; set; }
        public string EffectiveModel { get; set; } = string.Empty;
        public bool HasApiKey { get; set; }
        public string? MaskedApiKey { get; set; }
        public string Department { get; set; } = string.Empty;
        public string? CustomPrompt { get; set; }
        public string? EnabledSkillsJson { get; set; }
        public string? NotificationPreferencesJson { get; set; }
        public List<ApiKeyVaultItemDto> ApiKeysVault { get; set; } = new();
    }

    public class UpdateUrgencySlaRequestDto
    {
        public string? UrgencyLevel { get; set; }
        public DateTimeOffset? SlaDeadline { get; set; }
    }

    public class UpdateUserAiConfigRequestDto
    {
        public string? Provider { get; set; }
        public string? Model { get; set; }
        public string? ApiKey { get; set; }
        public string? CustomPrompt { get; set; }
        public string? EnabledSkillsJson { get; set; }
        public string? NotificationPreferencesJson { get; set; }
        public List<ApiKeyVaultItemDto>? ApiKeysVault { get; set; }
    }

    public class DailyChartPointDto
    {
        public string Label { get; set; } = string.Empty; // e.g. "Thứ 2 (20/10)" or "Tuần 1"
        public string DateKey { get; set; } = string.Empty; // "2026-10-20"
        public int ReceivedCount { get; set; }
        public int ProcessedCount { get; set; }
        public int SignedCount { get; set; }
        public int OverdueCount { get; set; }
    }

    public class DocumentStatisticsDto
    {
        public int TotalReceived { get; set; }
        public int ChoXuLy { get; set; }
        public int DangXuLy { get; set; }
        public int DaXuLy { get; set; }
        public int DaKy { get; set; }
        public int OverdueSla { get; set; }
        public double OnTimeRate { get; set; } = 100.0;
        public string PeriodType { get; set; } = "all"; // week, month, quarter, custom, all
        public string PeriodLabel { get; set; } = "Toàn bộ thời gian";
        public Dictionary<string, int> StatusDistribution { get; set; } = new();
        public Dictionary<string, int> FieldCategoryDistribution { get; set; } = new();
        public Dictionary<string, int> UrgencyDistribution { get; set; } = new();
        public List<DailyChartPointDto> TimelineBreakdown { get; set; } = new();
    }

    public class DocumentTemplateDto
    {
        public string ParentAgency { get; set; } = "ỦY BAN NHÂN DÂN TỈNH";
        public string IssuingAgency { get; set; } = "VĂN PHÒNG";
        public string DocCodeTemplate { get; set; } = ".../VP-UBND";
        public string ProvinceCity { get; set; } = "Quảng Trị";
        public string SignerPosition { get; set; } = "CHÁNH VĂN PHÒNG";
        public string SignerName { get; set; } = "";
        public string RecipientDefault { get; set; } = "Như trên; Lưu: VT, TH";
    }

    public class TestApiKeyRequestDto
    {
        public string? Provider { get; set; }
        public string? Model { get; set; }
        public string? ApiKey { get; set; }
        public string? Prompt { get; set; }
    }

    public class TestApiKeyResponseDto
    {
        public bool Success { get; set; }
        public string? Reply { get; set; }
        public long LatencyMs { get; set; }
        public string Provider { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string Status { get; set; } = "HEALTHY";
        public string? ErrorMessage { get; set; }
        public string? DetailedError { get; set; }
        public string? Recommendation { get; set; }
    }

    public class UpdateSignedDateRequestDto
    {
        public DateTimeOffset SignedDate { get; set; }
    }

    public class SaveDraftRequestDto
    {
        public string DraftContentHtml { get; set; } = string.Empty;
        public string? SubjectTitle { get; set; }
        public string? SelectedOptionId { get; set; }
        public string? IssuerParent { get; set; }
        public string? IssuerName { get; set; }
        public string? DocCode { get; set; }
        public string? Location { get; set; }
        public string? DocDateStr { get; set; }
        public string? SignerAuthority { get; set; } // TM. UBND, KT. CHỦ TỊCH,...
        public string? SignerTitle { get; set; }
        public string? SignerName { get; set; }
        public List<string>? RecipientsList { get; set; }
    }

    public class UploadCustomOutputResponseDto
    {
        public Guid ProcessingLogId { get; set; }
        public string OutputFileName { get; set; } = string.Empty;
        public string OutputFilePath { get; set; } = string.Empty;
        public string PreviewUrl { get; set; } = string.Empty;
        public string DraftContentHtml { get; set; } = string.Empty;
        public string CurrentStatus { get; set; } = "DA_XU_LY";
        public bool IsCustomOutput { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public string? DetectedSubjectTitle { get; set; }
        public string? DetectedDocCode { get; set; }
        public string? DetectedIssuer { get; set; }
        public List<string>? DetectedLegalBases { get; set; }
        public List<string>? DetectedRecipients { get; set; }
    }

    public class RateDocumentRequestDto
    {
        public int Rating { get; set; } // 1 for Like (helpful), -1 for Dislike
        public string? FinalContentHtml { get; set; } // Nội dung chốt để tính toán tỷ lệ giữ lại của AI
    }

    public class QueueTaskItemDto
    {
        public string TrackingId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string Status { get; set; } = "QUEUED"; // QUEUED, PROCESSING, COMPLETED, FAILED
        public string? ErrorMessage { get; set; }
        public Guid? ProcessingLogId { get; set; }
        public ProcessIncomingResultDto? Result { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public class BatchUploadResponseDto
    {
        public string BatchId { get; set; } = string.Empty;
        public int TotalFiles { get; set; }
        public List<QueueTaskItemDto> Tasks { get; set; } = new();
    }

    /// <summary>
    /// Thông tin chi tiết một bảng phụ thuộc khóa ngoại (Foreign Key Dependency)
    /// </summary>
    public class ForeignKeyDependencyDto
    {
        public string TableName { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    /// <summary>
    /// Kết quả kiểm tra tác động xóa và yêu cầu xác nhận lần 2 (Smart Cascade Deletion)
    /// </summary>
    public class DeleteImpactResultDto
    {
        public bool HasForeignKeys { get; set; }
        public bool RequiresCascadeConfirmation { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<ForeignKeyDependencyDto> Dependencies { get; set; } = new();
    }

    /// <summary>
    /// Thông tin đăng ký Push Notification của trình duyệt Web / Thiết bị di động
    /// </summary>
    public class PushSubscriptionDto
    {
        public string Endpoint { get; set; } = string.Empty;
        public string? P256dh { get; set; }
        public string? Auth { get; set; }
        public string? DeviceName { get; set; }
    }

    /// <summary>
    /// Bản ghi thông báo công vụ gửi đến cán bộ (Real-time / Push Notification)
    /// </summary>
    public class NotificationItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string Type { get; set; } = "SYSTEM"; // URGENT_DOC, SLA_WARNING, SIGNED, SYSTEM
        public string UrgencyLevel { get; set; } = "THƯỜNG"; // HỎA TỐC, THƯỢNG KHẨN, KHẨN, THƯỜNG
        public string? TargetUrl { get; set; }
        public string? DocumentCode { get; set; }
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? SlaDeadline { get; set; }
    }

    /// <summary>
    /// Yêu cầu gửi thử nghiệm thông báo đẩy (Test Push Notification)
    /// </summary>
    public class SendPushNotificationRequestDto
    {
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string Type { get; set; } = "URGENT_DOC";
        public string UrgencyLevel { get; set; } = "HỎA TỐC";
        public string? DocumentCode { get; set; }
        public string? TargetUrl { get; set; }
    }

    /// <summary>
    /// DTO Báo cáo nhanh cho giao diện Mobile (Quick Executive Summary)
    /// </summary>
    public class MobileQuickReportDto
    {
        public string TimeFilter { get; set; } = "all";
        public int TotalReceived { get; set; }
        public int ChoXuLy { get; set; }
        public int DangXuLy { get; set; }
        public int DaXuLy { get; set; }
        public int DaKy { get; set; }
        public int OverdueSla { get; set; }
        public int UrgentCount { get; set; }
        public int ExpiringSoonSla { get; set; }
        public double Decree30ComplianceRate { get; set; }
        public double OnTimeRate { get; set; }
        public Dictionary<string, int> UrgencyBreakdown { get; set; } = new();
        public List<NotificationItemDto> UrgentAlerts { get; set; } = new();
    }

    /// <summary>
    /// DTO yêu cầu AI phân tích và xử lý lại văn bản chuyên sâu
    /// </summary>
    public class ReprocessAiRequestDto
    {
        public string? Directive { get; set; } // Chỉ đạo bổ sung của cán bộ (tùy chọn)
    }

    /// <summary>
    /// DTO kết quả sau khi AI xử lý lại văn bản
    /// </summary>
    public class ReprocessAiResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public string DraftContentHtml { get; set; } = string.Empty;
        public DocumentSummaryDto Summary { get; set; } = new();
        public List<ActionOptionDto> ActionOptions { get; set; } = new();
        public List<string> LegalAlerts { get; set; } = new();
    }
}
