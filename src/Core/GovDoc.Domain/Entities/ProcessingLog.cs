using System;
using GovDoc.Domain.Common;
using GovDoc.Domain.Enums;

namespace GovDoc.Domain.Entities
{
    public class ProcessingLog : BaseEntity
    {
        public Guid UserId { get; set; }
        public string? IncomingDocCode { get; set; }
        public string? IncomingIssuer { get; set; }
        public string? SubjectTitle { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string? StoredFilePath { get; set; }
        public string UrgencyLevel { get; set; } = Enums.UrgencyLevel.Thuong; // HOA_TOC, THUONG_KHAN, KHAN, THUONG
        public DateTimeOffset ReceivedDate { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SummaryDataJson { get; set; } = string.Empty;
        public string SelectedOptionId { get; set; } = string.Empty;
        public string LegalBasesUsedJson { get; set; } = string.Empty;
        public string? ResultDataJson { get; set; }
        public string? DraftContentHtml { get; set; } // Nội dung văn bản chốt lưu trong Editor
        public string? ExportedDocxPath { get; set; }
        public string? OutputFileName { get; set; } // Tên tệp văn bản đầu ra đã xử lý thực tế do người dùng tải lên
        public string? OutputFilePath { get; set; } // Đường dẫn lưu trữ tệp văn bản đầu ra thực tế
        public bool IsCustomOutput { get; set; } = false; // Đánh dấu đã dùng văn bản đầu ra của người dùng thay thế AI
        public string? SignerAuthority { get; set; } // Quyền hạn người ký (TM. UBND, KT. CHỦ TỊCH,...)
        public string? RecipientsJson { get; set; } // Danh sách nơi nhận tùy chỉnh JSON
        public string? DocDateStr { get; set; } // Chuỗi ngày tháng năm tùy chỉnh
        public string? LearnedKeywordsJson { get; set; } // Từ khóa và cấu trúc học hỏi cho các văn bản sau
        public string CurrentStatus { get; set; } = DocumentCurrentStatus.ChoXuLy; // CHO_XU_LY, DANG_XU_LY, DA_XU_LY, DA_KY
        public DateTimeOffset? SignedDate { get; set; } // Ngày ký duyệt được cập nhật
        public int? RatingScore { get; set; } // 1: Hữu ích (Like), -1: Không thích
        public bool IsGoldSample { get; set; } = false; // Đánh dấu mẫu chuẩn vàng
        public DateTimeOffset? CompletedAt { get; set; } // Thời điểm chốt dự thảo
        public string? TrackingId { get; set; } // Mã theo dõi hàng đợi tuần tự
        public string? ErrorMessage { get; set; } // Lỗi nếu có trong quá trình xử lý ngầm
        public string? ClientIp { get; set; }
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }

        // Navigation
        public User? User { get; set; }
    }
}
