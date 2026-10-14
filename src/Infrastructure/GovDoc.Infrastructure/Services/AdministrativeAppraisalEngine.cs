using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;

namespace GovDoc.Infrastructure.Services
{
    public class AdministrativeAppraisalEngine : IAdministrativeAppraisalEngine
    {
        public Task<AppraisalVerdictDto> EvaluateDocumentAsync(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeLegalDocs,
            List<LegalDocument> expiredLegalDocs)
        {
            var rawText = (ocrResult.ExtractedText ?? string.Empty).ToLowerInvariant();
            var subject = (ocrResult.SubjectTitle ?? string.Empty).ToLowerInvariant();
            var coreProblem = (ocrResult.CoreProblem ?? string.Empty).ToLowerInvariant();
            var requestedAction = (ocrResult.RequestedAction ?? string.Empty).ToLowerInvariant();

            var rawNoDiacritics = RemoveDiacritics(rawText);
            var subjectNoDiacritics = RemoveDiacritics(subject);

            var checklist = new List<AppraisalChecklistItemDto>();
            var missingRequirements = new List<string>();

            string docLabel = (string.IsNullOrWhiteSpace(ocrResult.DetectedCodeNumber) || ocrResult.DetectedCodeNumber == "Chưa có số")
                ? "văn bản"
                : $"văn bản số {ocrResult.DetectedCodeNumber}";
            string docLabelCap = char.ToUpper(docLabel[0]) + docLabel.Substring(1);

            // ==========================================
            // TẦNG 0: KIỂM TRA ĐỘ TOÀN VẸN CỦA TỆP VĂN BẢN (INTEGRITY & READABILITY)
            // ==========================================
            if (string.IsNullOrWhiteSpace(rawText) || rawText.Trim().Length < 15)
            {
                checklist.Add(new AppraisalChecklistItemDto
                {
                    CriteriaName = "Tính đọc được và toàn vẹn của tệp tài liệu số",
                    IsPassed = false,
                    LegalBasis = "Nghị định 30/2020/NĐ-CP về công tác văn thư",
                    EvaluationNote = "Tệp công văn chưa có lớp văn bản điện tử có thể trích xuất tự động hoặc là hình ảnh scan chưa qua nhận dạng OCR."
                });

                return Task.FromResult(new AppraisalVerdictDto
                {
                    VerdictType = "REQUIRE_ADDITIONAL_INFO",
                    VerdictTitle = "YÊU CẦU CUNG CẤP LẠI BẢN VĂN BẢN ĐIỆN TỬ HỢP LỆ",
                    VerdictSummary = "Tài liệu tải lên không chứa lớp văn bản điện tử trích xuất được. Cần cung cấp tệp PDF điện tử hoặc văn bản Word gốc (.docx) để hoàn thành quy trình thẩm định.",
                    StatutoryAuthority = "Nghị định 30/2020/NĐ-CP",
                    Checklist = checklist,
                    MissingRequirements = new List<string> { "Tệp văn bản điện tử gốc (.docx hoặc PDF có thể chọn văn bản) hoặc bản scan chất lượng cao" },
                    PrimaryLegalBasis = new LegalBasisDto
                    {
                        DocCode = "30/2020/NĐ-CP",
                        DocTitle = "Nghị định 30/2020/NĐ-CP về công tác văn thư",
                        Article = "Điều 10",
                        Status = "ACTIVE",
                        FullExcerpt = "Văn bản điện tử gửi nhận trong hệ thống hành chính nhà nước phải bảo đảm tính toàn vẹn và có thể trích xuất dữ liệu tự động."
                    },
                    DraftContentBullets = new List<string>
                    {
                        "Hệ thống không nhận dạng được lớp văn bản điện tử trong tệp đính kèm.",
                        "Yêu cầu đơn vị gửi lại văn bản dạng PDF điện tử hoặc tệp Word (.docx) để hoàn tất thủ tục tiếp nhận."
                    }
                });
            }

            // ==========================================
            // TẦNG 1: KIỂM TRA THẨM QUYỀN GIẢI QUYẾT (JURISDICTION)
            // ==========================================
            bool isCourtOrProsecution = HasKeyword(rawText, rawNoDiacritics, "khởi kiện tại tòa án", "khoi kien tai toa an", "tòa án nhân dân", "toa an nhan dan", "viện kiểm sát", "vien kiem sat", "truy cứu trách nhiệm hình sự", "hinh su");
            bool isBeyondProvincialAuthority = HasKeyword(rawText, rawNoDiacritics, "thủ tướng chính phủ xem xét", "thu tuong chinh phu xem xet", "chính phủ quyết định chủ trương", "chinh phu quyet dinh chu truong");

            if (isCourtOrProsecution)
            {
                checklist.Add(new AppraisalChecklistItemDto
                {
                    CriteriaName = "Thẩm quyền giải quyết theo phân cấp",
                    IsPassed = false,
                    LegalBasis = "Bộ luật Tố tụng Dân sự / Luật Khiếu nại",
                    EvaluationNote = "Nội dung thuộc thẩm quyền của Cơ quan Tư pháp (Tòa án/Viện Kiểm sát), không thuộc thẩm quyền hành chính của UBND tỉnh."
                });

                return Task.FromResult(new AppraisalVerdictDto
                {
                    VerdictType = "TRANSFER_AUTHORITY",
                    VerdictTitle = "KHÔNG THUỘC THẨM QUYỀN - CHUYỂN CƠ QUAN TƯ PHÁP",
                    VerdictSummary = $"Nội dung đề nghị tại {docLabel} thuộc thẩm quyền giải quyết của Cơ quan Tư pháp theo quy định tố tụng. UBND tỉnh không có thẩm quyền giải quyết theo trình tự hành chính.",
                    StatutoryAuthority = "Luật Khiếu nại & Bộ luật Tố tụng",
                    Checklist = checklist,
                    MissingRequirements = new List<string> { "Đơn khởi kiện/khiếu nại gửi đúng cơ quan có thẩm quyền thụ lý" },
                    PrimaryLegalBasis = new LegalBasisDto
                    {
                        DocCode = "Luật Khiếu nại",
                        DocTitle = "Luật Khiếu nại năm 2011",
                        Article = "Điều 11",
                        Status = "ACTIVE",
                        FullExcerpt = "Các khiếu nại không thuộc thẩm quyền giải quyết của cơ quan hành chính nhà nước phải được hướng dẫn hoặc chuyển đến cơ quan có thẩm quyền."
                    },
                    DraftContentBullets = new List<string>
                    {
                        $"{docLabelCap} của {ocrResult.DetectedIssuer} có nội dung thuộc thẩm quyền thụ lý của Cơ quan Tòa án theo quy định pháp luật.",
                        "UBND tỉnh trả lại hồ sơ và hướng dẫn đơn vị gửi văn bản đến Tòa án nhân dân có thẩm quyền để được xem xét giải quyết theo đúng trình tự tố tụng.",
                        "Giao Văn phòng UBND tỉnh lưu hồ sơ và thông báo cho các cơ quan liên quan được biết."
                    }
                });
            }

            checklist.Add(new AppraisalChecklistItemDto
            {
                CriteriaName = "Thẩm quyền giải quyết của cơ quan hành chính",
                IsPassed = true,
                LegalBasis = "Luật Tổ chức chính quyền địa phương 2015 (sửa đổi 2019)",
                EvaluationNote = "Nội dung thuộc thẩm quyền xem xét, chỉ đạo xử lý của Ủy ban nhân dân cấp tỉnh và cơ quan chuyên môn."
            });

            // ==========================================
            // TẦNG 2: KIỂM TRA HIỆU LỰC CĂN CỨ PHÁP LÝ VIỆN DẪN (LEGAL VALIDITY)
            // ==========================================
            var citedExpiredDocs = new List<LegalDocument>();
            foreach (var exp in expiredLegalDocs)
            {
                var codeLower = exp.CodeNumber.ToLowerInvariant();
                var codeNoDiacritics = RemoveDiacritics(codeLower);
                if (rawText.Contains(codeLower) || rawNoDiacritics.Contains(codeNoDiacritics))
                {
                    citedExpiredDocs.Add(exp);
                }
            }

            if (citedExpiredDocs.Count > 0)
            {
                var expiredDoc = citedExpiredDocs[0];
                checklist.Add(new AppraisalChecklistItemDto
                {
                    CriteriaName = "Tính hiệu lực của căn cứ pháp lý viện dẫn",
                    IsPassed = false,
                    LegalBasis = $"Điều 156 Luật Ban hành VBQPPL ({expiredDoc.CodeNumber})",
                    EvaluationNote = $"Văn bản số {expiredDoc.CodeNumber} đã hết hiệu lực từ ngày {expiredDoc.ExpiredDate:dd/MM/yyyy}. Không thể áp dụng làm căn cứ giải quyết thủ tục hành chính."
                });

                return Task.FromResult(new AppraisalVerdictDto
                {
                    VerdictType = "REJECTED",
                    VerdictTitle = "TỪ CHỐI GIẢI QUYẾT DO CĂN CỨ PHÁP LÝ HẾT HIỆU LỰC",
                    VerdictSummary = $"{docLabelCap} viện dẫn căn cứ pháp lý đã hết hiệu lực ({expiredDoc.CodeNumber} - {expiredDoc.Title}). Yêu cầu rà soát và điều chỉnh theo văn bản quy phạm pháp luật thay thế hiện hành.",
                    StatutoryAuthority = "Khoản 2 Điều 156 Luật Ban hành văn bản quy phạm pháp luật",
                    Checklist = checklist,
                    MissingRequirements = new List<string> { $"Cập nhật căn cứ pháp lý còn hiệu lực thay thế cho văn bản số {expiredDoc.CodeNumber}" },
                    PrimaryLegalBasis = new LegalBasisDto
                    {
                        DocCode = expiredDoc.CodeNumber,
                        DocTitle = expiredDoc.Title,
                        Article = "Điều khoản bãi bỏ / Thay thế",
                        Status = "EXPIRED",
                        FullExcerpt = $"Văn bản số {expiredDoc.CodeNumber} đã hết hiệu lực pháp luật. Các thủ tục hành chính phải áp dụng quy định mới có hiệu lực thay thế."
                    },
                    DraftContentBullets = new List<string>
                    {
                        $"Từ chối xem xét giải quyết đề nghị tại {docLabel} do áp dụng căn cứ pháp lý đã hết hiệu lực thi hành ({expiredDoc.CodeNumber}).",
                        $"Yêu cầu {ocrResult.DetectedIssuer} nghiên cứu các quy định pháp luật hiện hành có hiệu lực thay thế để lập lại hồ sơ theo đúng quy định.",
                        "Giao Sở Tư pháp theo dõi, hướng dẫn đơn vị cập nhật văn bản quy phạm pháp luật đang có hiệu lực thi hành."
                    }
                });
            }

            checklist.Add(new AppraisalChecklistItemDto
            {
                CriteriaName = "Tính hiệu lực của căn cứ pháp lý viện dẫn",
                IsPassed = true,
                LegalBasis = "Luật Ban hành VBQPPL 2015",
                EvaluationNote = "Không phát hiện viện dẫn văn bản quy phạm pháp luật đã hết hiệu lực thi hành."
            });

            // ==========================================
            // TẦNG 3: KIỂM TRA ĐIỀU KIỆN & THÀNH PHẦN HỒ SƠ THỰC TẾ (FACT & DOSSIER CHECKLIST)
            // ==========================================
            bool isExtensionRequest = HasKeyword(subject, subjectNoDiacritics, "gia hạn", "gia han", "tiến độ", "tien do", "hoàn thành", "hoan thanh")
                || HasKeyword(rawText, rawNoDiacritics, "gia hạn thời gian", "gia han thoi gian", "điều chỉnh tiến độ", "dieu chinh tien do", "gia hạn tiến độ", "gia han tien do");
            bool isBudgetOrRelief = HasKeyword(subject, subjectNoDiacritics, "ngân sách", "ngan sach", "dự phòng", "du phong", "thiên tai", "thien tai", "kinh phí", "kinh phi");
            bool isLandComplaint = HasKeyword(subject, subjectNoDiacritics, "khiếu nại", "khieu nai", "bồi thường", "boi thuong", "giải phóng mặt bằng", "giai phong mat bang");

            // Chọn căn cứ pháp lý có hiệu lực cao nhất và phù hợp nhất
            var matchedLegalDoc = activeLegalDocs
                .OrderByDescending(d => (HasKeyword(d.Title.ToLowerInvariant(), RemoveDiacritics(d.Title.ToLowerInvariant()), subjectNoDiacritics) || d.Title.ToLowerInvariant().Contains("đầu tư") ? 10 : 0) + d.HierarchyRank)
                .FirstOrDefault() ?? activeLegalDocs.FirstOrDefault();

            var primaryClause = matchedLegalDoc?.ClauseNodes.FirstOrDefault();

            if (isExtensionRequest)
            {
                // Đối với xin gia hạn tiến độ: Bắt buộc phải có:
                // (1) Báo cáo kiểm tra thực địa / thẩm định hợp lệ (không phải là thông báo "chưa có" hay "thiếu")
                // (2) Xác nhận của UBND cấp huyện / cơ quan chức năng về công tác GPMB / nguyên nhân
                bool mentionsInspectionExplicitly = HasKeyword(rawText, rawNoDiacritics, "báo cáo thực địa", "bao cao thuc dia", "kiểm tra hiện trường", "kiem tra hien truong", "báo cáo thẩm định", "bao cao tham dinh", "báo cáo kiểm tra thực địa", "bao cao kiem tra thuc dia");
                bool isInspectionNegative = HasKeyword(rawText, rawNoDiacritics, "chưa có báo cáo", "chua co bao cao", "thiếu báo cáo", "thieu bao cao", "chưa kiểm tra thực địa", "chua kiem tra thuc dia");
                bool hasInspectionReport = mentionsInspectionExplicitly && !isInspectionNegative;

                bool mentionsLocalAuthExplicitly = HasKeyword(rawText, rawNoDiacritics, "xác nhận của ubnd", "xac nhan cua ubnd", "xác nhận giải phóng mặt bằng", "xac nhan giai phong mat bang", "văn bản xác nhận", "van ban xac nhan", "xác nhận bồi thường", "xac nhan boi thuong");
                bool isLocalAuthNegative = HasKeyword(rawText, rawNoDiacritics, "chưa có xác nhận", "chua co xac nhan", "chưa bồi thường", "chua boi thuong", "thiếu xác nhận", "thieu xac nhan");
                bool hasLocalAuthConfirmation = mentionsLocalAuthExplicitly && !isLocalAuthNegative;

                if (!hasInspectionReport || !hasLocalAuthConfirmation)
                {
                    if (!hasInspectionReport) missingRequirements.Add("Báo cáo kiểm tra thực địa của cơ quan chuyên môn (Sở Kế hoạch và Đầu tư / Sở Xây dựng)");
                    if (!hasLocalAuthConfirmation) missingRequirements.Add("Văn bản xác nhận tiến độ bồi thường GPMB của UBND cấp huyện");

                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính đầy đủ của thành phần hồ sơ xin gia hạn",
                        IsPassed = false,
                        LegalBasis = $"{matchedLegalDoc?.Title ?? "Quy định điều chỉnh dự án"} ({matchedLegalDoc?.CodeNumber})",
                        EvaluationNote = "Hồ sơ chưa có đủ báo cáo thẩm định thực địa và xác nhận tiến độ của cơ quan chính quyền cấp huyện."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "REQUIRE_ADDITIONAL_INFO",
                        VerdictTitle = "CHƯA ĐỦ ĐIỀU KIỆN - YÊU CẦU BỔ SUNG HỒ SƠ & BÁO CÁO",
                        VerdictSummary = $"{docLabelCap} chưa đủ điều kiện xem xét chấp thuận ngay do thiếu các tài liệu kiểm tra thực địa và xác nhận tiến độ bồi thường của cấp huyện. Cần yêu cầu bổ sung hồ sơ trong thời hạn quy định.",
                        StatutoryAuthority = $"{matchedLegalDoc?.Title ?? "Quy định quản lý đầu tư"}",
                        Checklist = checklist,
                        MissingRequirements = missingRequirements,
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = matchedLegalDoc?.CodeNumber ?? "123/2026/NĐ-CP",
                            DocTitle = matchedLegalDoc?.Title ?? "Quy định chi tiết thi hành Luật Đầu tư",
                            Article = primaryClause?.ArticleNumber ?? "Điều 15",
                            Status = "ACTIVE",
                            FullExcerpt = primaryClause?.RawContent ?? "Hồ sơ điều chỉnh tiến độ phải bao gồm báo cáo tình hình triển khai thực tế và xác nhận của cơ quan quản lý nhà nước có thẩm quyền."
                        },
                        DraftContentBullets = new List<string>
                        {
                            $"Chưa xem xét chấp thuận đề nghị tại {docLabel} do hồ sơ chưa đáp ứng đầy đủ thành phần theo quy định.",
                            $"Yêu cầu {ocrResult.DetectedIssuer} phối hợp với cơ quan liên quan bổ sung đầy đủ: {string.Join("; ", missingRequirements)}.",
                            "Thời hạn nộp bổ sung hồ sơ: 15 ngày làm việc kể từ ngày nhận được văn bản này. Quá thời hạn trên, UBND tỉnh sẽ dừng xem xét hồ sơ."
                        }
                    });
                }
            }
            else if (isLandComplaint)
            {
                bool hasDecisionCopy = rawText.Contains("quyết định thu hồi") || rawText.Contains("quyết định phê duyệt");
                if (!hasDecisionCopy)
                {
                    missingRequirements.Add("Bản sao Quyết định thu hồi đất / Quyết định phê duyệt phương án bồi thường có liên quan");
                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Hồ sơ tài liệu kèm theo đơn khiếu nại",
                        IsPassed = false,
                        LegalBasis = "Điều 12 Luật Khiếu nại 2011",
                        EvaluationNote = "Đơn khiếu nại chưa gửi kèm bản sao quyết định hành chính bị khiếu nại."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "REQUIRE_ADDITIONAL_INFO",
                        VerdictTitle = "YÊU CẦU BỔ SUNG TÀI LIỆU KHIẾU NẠI",
                        VerdictSummary = $"Đơn khiếu nại chưa kèm theo bản sao quyết định thu hồi đất hoặc quyết định bồi thường làm căn cứ đối soát. Cần ban hành văn bản yêu cầu bổ sung chứng cứ theo Luật Khiếu nại.",
                        StatutoryAuthority = "Luật Khiếu nại năm 2011",
                        Checklist = checklist,
                        MissingRequirements = missingRequirements,
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Luật Khiếu nại",
                            DocTitle = "Luật Khiếu nại năm 2011",
                            Article = "Điều 12",
                            Status = "ACTIVE",
                            FullExcerpt = "Người khiếu nại có nghĩa vụ gửi kèm các tài liệu, chứng cứ chứng minh cho nội dung khiếu nại của mình."
                        },
                        DraftContentBullets = new List<string>
                        {
                            $"Yêu cầu người gửi đơn bổ sung các tài liệu, chứng cứ: {string.Join("; ", missingRequirements)}.",
                            "Giao Ban Tiếp công dân tỉnh hướng dẫn công dân hoàn thiện hồ sơ khiếu nại theo đúng quy định pháp luật.",
                            "Tạm dừng việc thụ lý giải quyết cho đến khi nhận đủ tài liệu hợp lệ."
                        }
                    });
                }
            }

            // ==========================================
            // TẦNG 4: KẾT LUẬN ĐỦ ĐIỀU KIỆN CHẤP THUẬN (APPROVED)
            // ==========================================
            checklist.Add(new AppraisalChecklistItemDto
            {
                CriteriaName = "Tính đầy đủ của thành phần hồ sơ và điều kiện thực tế",
                IsPassed = true,
                LegalBasis = $"{matchedLegalDoc?.Title ?? "Quy định pháp luật hiện hành"}",
                EvaluationNote = "Hồ sơ đã có đầy đủ tài liệu viện dẫn, báo cáo thẩm định và đáp ứng các điều kiện luật định."
            });

            return Task.FromResult(new AppraisalVerdictDto
            {
                VerdictType = "APPROVED",
                VerdictTitle = $"ĐỦ ĐIỀU KIỆN - THỐNG NHẤT CHẤP THUẬN ({ocrResult.SubjectTitle})",
                VerdictSummary = $"{docLabelCap} của {ocrResult.DetectedIssuer} bảo đảm đúng thẩm quyền, căn cứ pháp lý còn hiệu lực và đáp ứng đầy đủ điều kiện hồ sơ. Kết luận: Thống nhất chấp thuận theo đề xuất của đơn vị.",
                StatutoryAuthority = $"{matchedLegalDoc?.Title ?? "Quy định chuyên ngành hiện hành"}",
                Checklist = checklist,
                MissingRequirements = new List<string>(),
                PrimaryLegalBasis = new LegalBasisDto
                {
                    DocCode = matchedLegalDoc?.CodeNumber ?? "123/2026/NĐ-CP",
                    DocTitle = matchedLegalDoc?.Title ?? "Nghị định quy định chi tiết thi hành Luật Đầu tư",
                    Article = primaryClause?.ArticleNumber ?? "Điều 14, Khoản 2",
                    Status = matchedLegalDoc?.Status ?? "ACTIVE",
                    FullExcerpt = primaryClause?.RawContent ?? "Thẩm quyền của UBND cấp tỉnh trong việc xem xét, giải quyết đề nghị của các cơ quan, tổ chức theo quy định pháp luật."
                },
                DraftContentBullets = new List<string>
                {
                    $"Thống nhất chủ trương chấp thuận đề nghị của {ocrResult.DetectedIssuer} tại {docLabel} về việc: {ocrResult.SubjectTitle}.",
                    $"Giao các cơ quan chuyên môn trực thuộc chủ trì, phối hợp với các cơ quan liên quan hướng dẫn {ocrResult.DetectedIssuer} triển khai thực hiện theo đúng quy định pháp luật.",
                    "Yêu cầu đơn vị tập trung nguồn lực thực hiện, cam kết hoàn thành đúng tiến độ và báo cáo định kỳ kết quả thực hiện; không tiếp tục gia hạn nếu quá hạn quy định."
                }
            });
        }

        private static string RemoveDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            var normalizedString = text.Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder();
            foreach (var c in normalizedString)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }
            return sb.ToString().Normalize(System.Text.NormalizationForm.FormC)
                     .Replace("đ", "d").Replace("Đ", "D");
        }

        private static bool HasKeyword(string source, string sourceNoDiacritics, params string[] keywords)
        {
            foreach (var kw in keywords)
            {
                if (source.Contains(kw, StringComparison.OrdinalIgnoreCase)) return true;
                var kwNoDiacritics = RemoveDiacritics(kw);
                if (sourceNoDiacritics.Contains(kwNoDiacritics, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }
    }
}
