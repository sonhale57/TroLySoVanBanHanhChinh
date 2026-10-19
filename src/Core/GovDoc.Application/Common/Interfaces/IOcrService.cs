using System;
using System.IO;
using System.Threading.Tasks;

namespace GovDoc.Application.Common.Interfaces
{
    public class OcrExtractionResult
    {
        public string ExtractedText { get; set; } = string.Empty;
        public string DetectedIssuer { get; set; } = string.Empty;
        public string DetectedCodeNumber { get; set; } = string.Empty;
        public DateTime? DetectedIssuedDate { get; set; }
        public string DetectedUrgency { get; set; } = "THUONG"; // THUONG, KHAN, HOA_TOC
        public DateTimeOffset? CalculatedSlaDeadline { get; set; }
        public string SubjectTitle { get; set; } = string.Empty;
        public string CoreProblem { get; set; } = string.Empty;
        public string SubmittedBasis { get; set; } = string.Empty;
        public string RequestedAction { get; set; } = string.Empty;
        public string Recipients { get; set; } = string.Empty;
        public string SignerTitle { get; set; } = string.Empty;
        public string SignerName { get; set; } = string.Empty;
        public string DocumentCategory { get; set; } = "CONG_VAN"; // CONG_VAN, DANG_KY_DOANH_NGHIEP, GIAY_UY_QUYEN, DON_THU
        public bool HasFontOrEncodingError { get; set; } = false;
        public string ExtractionNote { get; set; } = string.Empty;
    }

    public interface IOcrService
    {
        Task<OcrExtractionResult> ExtractDocumentTextAsync(Stream fileStream, string fileName);
    }
}
