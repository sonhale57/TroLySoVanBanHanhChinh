using System.Collections.Generic;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;

namespace GovDoc.Application.Common.Interfaces
{
    public interface IDepartmentSkillService
    {
        /// <summary>
        /// Sinh bản thảo ban đầu chuẩn thể thức Nghị định 30 (dạng HTML) phân hóa theo Kỹ năng phòng ban (Department Skill)
        /// </summary>
        string GenerateInitialDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            List<string>? goldPhrases = null);

        /// <summary>
        /// Sinh bản thảo ban đầu có học hỏi từ các cặp văn bản vào - ra thực tế của người dùng
        /// </summary>
        string GenerateLearnedDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            List<ProcessingLog>? exemplarLogs,
            out string? learningSourceNote);

        /// <summary>
        /// Sinh bản thảo chuyên sâu, chi tiết hóa từng điều khoản chỉ đạo thực tế (khắc phục văn bản chung chung)
        /// </summary>
        string GenerateDeepDetailedDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            string? userDirective = null);

        /// <summary>
        /// Tính toán tỷ lệ phần trăm nội dung do AI sinh ra được giữ lại trong bản thảo chốt của cán bộ
        /// </summary>
        double CalculateRetentionRate(string originalAiDraft, string finalUserDraft);

        /// <summary>
        /// Tự động nhận diện lĩnh vực chuyên ngành (FieldCategory) dựa trên nội dung văn bản và thông tin phòng ban
        /// </summary>
        string DetermineCategory(string text, string department);
    }
}
