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
        public DateTime EffectiveDate { get; set; }
        public string? ReplacesDocCode { get; set; }
        public string? ReplacesDocTitle { get; set; }
        public string SuggestedAction { get; set; } = "NONE"; // INVALIDATE_OLD_DOC, AMEND_DOC
        public string ExtractedSummary { get; set; } = string.Empty;
        public Guid? ExistingTargetDocId { get; set; }
    }

    public class ManualLegalDocDto
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = "Chính phủ";
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public string? Notes { get; set; }
    }

    public class UpdateLegalDocDto
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = "NGHI_DINH";
        public string Issuer { get; set; } = string.Empty;
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
    }

    public class LegalSearchResultDto
    {
        public Guid DocId { get; set; }
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = string.Empty;
        public int HierarchyRank { get; set; }
        public string Issuer { get; set; } = string.Empty;
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
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SelectedOptionId { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; }
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public bool HasStoredFile { get; set; }
    }

    public class ProcessedRecordDetailDto
    {
        public Guid Id { get; set; }
        public string? IncomingDocCode { get; set; }
        public string? IncomingIssuer { get; set; }
        public string? SubjectTitle { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string UrgencyLevel { get; set; } = "THUONG";
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SelectedOptionId { get; set; } = string.Empty;
        public string SummaryDataJson { get; set; } = string.Empty;
        public string LegalBasesUsedJson { get; set; } = string.Empty;
        public string? ResultDataJson { get; set; }
        public string? ExportedDocxPath { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }
        public bool HasStoredFile { get; set; }
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
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? PasswordChangedAt { get; set; }
    }

    public class CreateUserRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER"; // USER hoặc ADMIN
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
}
