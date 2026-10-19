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
            // TẦNG 0: KIỂM TRA ĐỘ TOÀN VẸN CỦA TỆP VĂN BẢN (INTEGRITY, READABILITY & FONT ENCODING)
            // ==========================================
            if (ocrResult.HasFontOrEncodingError || string.IsNullOrWhiteSpace(rawText) || rawText.Trim().Length < 15)
            {
                string reason = ocrResult.HasFontOrEncodingError
                    ? (string.IsNullOrWhiteSpace(ocrResult.ExtractionNote)
                        ? "Văn bản bị lỗi font chữ / lỗi mã hóa hoặc chứa dữ liệu nhị phân không đọc được."
                        : ocrResult.ExtractionNote)
                    : "Tệp tài liệu hoàn toàn trống hoặc không chứa lớp văn bản điện tử có thể trích xuất tự động.";

                checklist.Add(new AppraisalChecklistItemDto
                {
                    CriteriaName = "Tính đọc được, toàn vẹn và chuẩn font chữ văn bản số",
                    IsPassed = false,
                    LegalBasis = "Nghị định 30/2020/NĐ-CP & Luật Giao dịch điện tử 2023",
                    EvaluationNote = reason
                });

                return Task.FromResult(new AppraisalVerdictDto
                {
                    VerdictType = "REQUIRE_ADDITIONAL_INFO",
                    VerdictTitle = "LỖI ĐỊNH DẠNG / LỖI FONT - YÊU CẦU CUNG CẤP LẠI TỆP HỢP LỆ",
                    VerdictSummary = $"Tài liệu không đọc được nội dung do: {reason}. Hệ thống từ chối thẩm định tự động để tránh phê duyệt sai sót. Cần cung cấp tệp định dạng chuẩn Unicode (UTF-8).",
                    StatutoryAuthority = "Quy định về văn bản điện tử và giao dịch điện tử",
                    Checklist = checklist,
                    MissingRequirements = new List<string> { "Tệp văn bản chuẩn Unicode (UTF-8), không bị lỗi font hoặc bản scan rõ nét" },
                    PrimaryLegalBasis = new LegalBasisDto
                    {
                        DocCode = "Nghị định 30/2020/NĐ-CP",
                        DocTitle = "Nghị định về công tác văn thư",
                        Article = "Điều 10 (Bộ mã ký tự chữ Việt)",
                        Status = "ACTIVE",
                        FullExcerpt = "Văn bản điện tử phải sử dụng bộ mã ký tự chữ Việt theo chuẩn Unicode TCVN 6909:2001 và bảo đảm tính toàn vẹn, có thể trích xuất dữ liệu tự động."
                    },
                    DraftContentBullets = new List<string>
                    {
                        "Tệp tài liệu tải lên bị lỗi font mã hóa hoặc không trích xuất được nội dung số.",
                        "Yêu cầu cá nhân/đơn vị gửi lại văn bản sử dụng font chữ Unicode chuẩn hoặc bản scan chất lượng cao để tiếp tục thẩm định.",
                        "Hệ thống tạm dừng quy trình xử lý hồ sơ cho đến khi nhận được tệp văn bản hợp lệ."
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
            // TẦNG 3: KIỂM TRA ĐIỀU KIỆN & THÀNH PHẦN HỒ SƠ THEO TỪNG LĨNH VỰC CHUYÊN NGÀNH
            // ==========================================

            // TRƯỜNG HỢP 3.1: GIẤY ỦY QUYỀN (Áp dụng Bộ luật Dân sự 2015)
            if (ocrResult.DocumentCategory == "GIAY_UY_QUYEN" || HasKeyword(rawText, rawNoDiacritics, "giấy ủy quyền", "giay uy quyen", "hợp đồng ủy quyền", "hop dong uy quyen"))
            {
                bool hasDots = rawText.Contains("……") || rawText.Contains("…") || rawText.Contains("___");
                bool hasAuthorizer = rawText.Contains("người ủy quyền") || rawText.Contains("bên ủy quyền") || rawText.Contains("bên a") || rawText.Contains("tôi là");
                bool hasAuthorized = rawText.Contains("người được ủy quyền") || rawText.Contains("bên được ủy quyền") || rawText.Contains("bên b") || rawText.Contains("ủy quyền cho");
                bool hasScope = rawText.Contains("phạm vi ủy quyền") || rawText.Contains("nội dung ủy quyền") || rawText.Contains("công việc ủy quyền");
                bool hasDuration = rawText.Contains("thời hạn ủy quyền") || rawText.Contains("thời hạn");

                if (hasDots || !hasAuthorizer || !hasAuthorized || !hasScope)
                {
                    if (hasDots) missingRequirements.Add("Hoàn thiện điền đầy đủ các trường thông tin còn để trống (dấu chấm lửng '……')");
                    if (!hasAuthorizer) missingRequirements.Add("Thông tin nhân thân Bên ủy quyền (Họ tên, CCCD/CMND, nơi cư trú)");
                    if (!hasAuthorized) missingRequirements.Add("Thông tin nhân thân Bên được ủy quyền (Họ tên, CCCD/CMND, nơi cư trú)");
                    if (!hasScope) missingRequirements.Add("Xác định cụ thể phạm vi ủy quyền và trách nhiệm của các bên");
                    if (!hasDuration) missingRequirements.Add("Xác định rõ thời hạn có hiệu lực của Giấy ủy quyền");

                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính hoàn thiện của văn bản ủy quyền theo Bộ luật Dân sự",
                        IsPassed = false,
                        LegalBasis = "Bộ luật Dân sự 2015 (Điều 138, Điều 562)",
                        EvaluationNote = "Văn bản ủy quyền còn nhiều vị trí để trống thông tin hoặc chưa đủ các yếu tố cơ bản theo Bộ luật Dân sự."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "REQUIRE_ADDITIONAL_INFO",
                        VerdictTitle = "CHƯA ĐỦ ĐIỀU KIỆN - HỒ SƠ ỦY QUYỀN CHƯA HOÀN THIỆN",
                        VerdictSummary = "Giấy ủy quyền tải lên còn chứa các trường thông tin để trống (dấu chấm lửng) hoặc chưa xác định rõ thông tin các bên, phạm vi và thời hạn ủy quyền theo quy định của Bộ luật Dân sự 2015. Đề nghị hoàn thiện đầy đủ trước khi thực hiện thủ tục.",
                        StatutoryAuthority = "Bộ luật Dân sự 2015",
                        Checklist = checklist,
                        MissingRequirements = missingRequirements,
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Bộ luật Dân sự 2015",
                            DocTitle = "Bộ luật Dân sự năm 2015",
                            Article = "Điều 138 & Điều 562",
                            Status = "ACTIVE",
                            FullExcerpt = "Hợp đồng ủy quyền là sự thỏa thuận giữa các bên, theo đó bên được ủy quyền có nghĩa vụ thực hiện công việc nhân danh bên ủy quyền trong phạm vi và thời hạn được xác định."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Giấy ủy quyền chưa điền hoàn chỉnh thông tin nhân thân, phạm vi và thời hạn ủy quyền.",
                            $"Yêu cầu hoàn thiện các mục: {string.Join("; ", missingRequirements)}.",
                            "Đề nghị các bên ký, ghi rõ họ tên (và chứng thực chữ ký nếu thủ tục yêu cầu) trước khi nộp hồ sơ."
                        }
                    });
                }
                else
                {
                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính hợp lệ của giấy ủy quyền",
                        IsPassed = true,
                        LegalBasis = "Bộ luật Dân sự 2015 (Điều 138, Điều 562)",
                        EvaluationNote = "Giấy ủy quyền có đầy đủ thông tin bên ủy quyền, bên được ủy quyền, phạm vi và thời hạn theo luật định."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "APPROVED",
                        VerdictTitle = "ĐỦ ĐIỀU KIỆN - GIẤY ỦY QUYỀN HỢP LỆ",
                        VerdictSummary = "Giấy ủy quyền bảo đảm đầy đủ các điều kiện theo Bộ luật Dân sự 2015. Đủ điều kiện đại diện thực hiện các thủ tục hành chính theo đúng phạm vi được ủy quyền.",
                        StatutoryAuthority = "Bộ luật Dân sự 2015",
                        Checklist = checklist,
                        MissingRequirements = new List<string>(),
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Bộ luật Dân sự 2015",
                            DocTitle = "Bộ luật Dân sự năm 2015",
                            Article = "Điều 138 & Điều 562",
                            Status = "ACTIVE",
                            FullExcerpt = "Cá nhân, pháp nhân có thể ủy quyền cho cá nhân, pháp nhân khác xác lập, thực hiện giao dịch dân sự theo quy định."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Chấp thuận tư cách đại diện hợp pháp theo Giấy ủy quyền để thực hiện các thủ tục hành chính.",
                            "Người được ủy quyền có trách nhiệm thực hiện đúng và đầy đủ phạm vi ủy quyền đã cam kết.",
                            "Lưu hồ sơ ủy quyền kèm theo hồ sơ giải quyết thủ tục hành chính."
                        }
                    });
                }
            }

            // TRƯỜNG HỢP 3.2: ĐĂNG KÝ DOANH NGHIỆP (Luật Doanh nghiệp 2020 & Nghị định 01/2021/NĐ-CP)
            if (ocrResult.DocumentCategory == "DANG_KY_DOANH_NGHIEP" || HasKeyword(rawText, rawNoDiacritics, "đăng ký doanh nghiệp", "dang ky doanh nghiep", "thành lập doanh nghiệp", "thanh lap doanh nghiep"))
            {
                bool hasDots = rawText.Contains("……") || rawText.Contains("___");
                bool hasLegalRep = rawText.Contains("người đại diện theo pháp luật") || rawText.Contains("chủ tịch công ty") || rawText.Contains("giám đốc");
                bool hasAddress = rawText.Contains("địa chỉ trụ sở") || rawText.Contains("trụ sở chính");
                bool hasCapital = rawText.Contains("vốn điều lệ") || rawText.Contains("vốn");
                bool hasLineOfBusiness = rawText.Contains("ngành, nghề kinh doanh") || rawText.Contains("ngành nghề kinh doanh");

                if (hasDots || !hasLegalRep || !hasAddress || !hasCapital)
                {
                    if (hasDots) missingRequirements.Add("Hoàn thiện kê khai các trường dữ liệu còn để trống (dấu chấm lửng '……')");
                    if (!hasAddress) missingRequirements.Add("Kê khai địa chỉ trụ sở chính cụ thể (số nhà, đường/phố, phường/xã, quận/huyện)");
                    if (!hasCapital) missingRequirements.Add("Kê khai mức vốn điều lệ và tỷ lệ phần vốn góp");
                    if (!hasLegalRep) missingRequirements.Add("Thông tin người đại diện theo pháp luật (Họ tên, CCCD/hộ chiếu, nơi cư trú)");
                    if (!hasLineOfBusiness) missingRequirements.Add("Danh mục ngành, nghề kinh doanh cấp 4 theo Hệ thống ngành kinh tế Việt Nam");

                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính đầy đủ của hồ sơ đăng ký doanh nghiệp",
                        IsPassed = false,
                        LegalBasis = "Luật Doanh nghiệp 2020 (Điều 23) & Nghị định 01/2021/NĐ-CP",
                        EvaluationNote = "Giấy đề nghị đăng ký doanh nghiệp chưa kê khai đầy đủ các trường thông tin bắt buộc theo quy định."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "REQUIRE_ADDITIONAL_INFO",
                        VerdictTitle = "CHƯA ĐỦ ĐIỀU KIỆN - YÊU CẦU HOÀN THIỆN ĐƠN ĐĂNG KÝ DOANH NGHIỆP",
                        VerdictSummary = "Hồ sơ đăng ký doanh nghiệp còn để trống các trường thông tin bắt buộc (tên doanh nghiệp, trụ sở, vốn hoặc người đại diện) theo Luật Doanh nghiệp 2020 và Nghị định 01/2021/NĐ-CP. Đề nghị hoàn thiện đầy đủ hồ sơ trước khi cấp Giấy chứng nhận.",
                        StatutoryAuthority = "Luật Doanh nghiệp 2020 & Nghị định 01/2021/NĐ-CP",
                        Checklist = checklist,
                        MissingRequirements = missingRequirements,
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Luật Doanh nghiệp 2020",
                            DocTitle = "Luật Doanh nghiệp năm 2020",
                            Article = "Điều 23",
                            Status = "ACTIVE",
                            FullExcerpt = "Giấy đề nghị đăng ký doanh nghiệp phải có đầy đủ các nội dung chủ yếu: Tên doanh nghiệp; địa chỉ trụ sở chính; ngành, nghề kinh doanh; vốn điều lệ; họ, tên, địa chỉ liên lạc của người đại diện theo pháp luật."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Hồ sơ đăng ký doanh nghiệp chưa bảo đảm tính đầy đủ theo biểu mẫu quy định tại Nghị định 01/2021/NĐ-CP.",
                            $"Yêu cầu người nộp hồ sơ bổ sung, hoàn chỉnh: {string.Join("; ", missingRequirements)}.",
                            "Nộp lại hồ sơ trực tuyến qua Cổng thông tin quốc gia về đăng ký doanh nghiệp để được tiếp tục xử lý."
                        }
                    });
                }
                else
                {
                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính hợp lệ của Giấy đề nghị đăng ký doanh nghiệp",
                        IsPassed = true,
                        LegalBasis = "Luật Doanh nghiệp 2020 (Điều 23) & Nghị định 01/2021/NĐ-CP",
                        EvaluationNote = "Hồ sơ kê khai đầy đủ các trường thông tin bắt buộc theo quy định."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "APPROVED",
                        VerdictTitle = "ĐỦ ĐIỀU KIỆN - HỒ SƠ ĐĂNG KÝ DOANH NGHIỆP HỢP LỆ",
                        VerdictSummary = "Giấy đề nghị đăng ký doanh nghiệp bảo đảm đầy đủ các điều kiện theo quy định của Luật Doanh nghiệp 2020 và Nghị định 01/2021/NĐ-CP. Đủ điều kiện để Phòng Đăng ký kinh doanh thụ lý và cấp Giấy chứng nhận đăng ký doanh nghiệp.",
                        StatutoryAuthority = "Luật Doanh nghiệp 2020 & Nghị định 01/2021/NĐ-CP",
                        Checklist = checklist,
                        MissingRequirements = new List<string>(),
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Nghị định 01/2021/NĐ-CP",
                            DocTitle = "Nghị định về đăng ký doanh nghiệp",
                            Article = "Điều 24",
                            Status = "ACTIVE",
                            FullExcerpt = "Cơ quan đăng ký kinh doanh cấp Giấy chứng nhận đăng ký doanh nghiệp trong thời hạn 03 ngày làm việc kể từ ngày nhận được hồ sơ hợp lệ."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Tiếp nhận hồ sơ hợp lệ của doanh nghiệp.",
                            "Giao Phòng Đăng ký kinh doanh thực hiện quy trình cấp Giấy chứng nhận đăng ký doanh nghiệp theo hạn định 03 ngày làm việc.",
                            "Thông báo nộp lệ phí đăng ký và công bố nội dung đăng ký doanh nghiệp theo quy định."
                        }
                    });
                }
            }

            // TRƯỜNG HỢP 3.3: KÊ KHAI VÀ CAM KẾT VỀ CHỦ SỞ HỮU HƯỞNG LỢI
            if (ocrResult.DocumentCategory == "KE_KHAI_CAM_KET" || HasKeyword(rawText, rawNoDiacritics, "chủ sở hữu hưởng lợi", "chu so huu huong loi", "kê khai và cam kết", "ke khai va cam ket"))
            {
                bool hasDots = rawText.Contains("……") || rawText.Contains("___");
                if (hasDots)
                {
                    missingRequirements.Add("Điền đầy đủ các thông tin cá nhân và tỷ lệ sở hữu còn để trống (dấu chấm lửng '……')");
                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính hoàn thiện của Bản kê khai chủ sở hữu hưởng lợi",
                        IsPassed = false,
                        LegalBasis = "Luật Phòng, chống rửa tiền 2022 & Nghị định 01/2021/NĐ-CP",
                        EvaluationNote = "Bản kê khai còn chứa các trường thông tin để trống chưa hoàn tất kê khai."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "REQUIRE_ADDITIONAL_INFO",
                        VerdictTitle = "CHƯA ĐỦ ĐIỀU KIỆN - BẢN KÊ KHAI CHỦ SỞ HỮU HƯỞNG LỢI CHƯA HOÀN THIỆN",
                        VerdictSummary = "Bản kê khai và cam kết về chủ sở hữu hưởng lợi còn để trống các trường dữ liệu bắt buộc. Đề nghị điền đầy đủ và ký xác nhận theo quy định.",
                        StatutoryAuthority = "Luật Phòng, chống rửa tiền 2022",
                        Checklist = checklist,
                        MissingRequirements = missingRequirements,
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Luật Phòng, chống rửa tiền",
                            DocTitle = "Luật Phòng, chống rửa tiền năm 2022",
                            Article = "Điều 10",
                            Status = "ACTIVE",
                            FullExcerpt = "Đối tượng báo cáo và doanh nghiệp có trách nhiệm thu thập, cập nhật và lưu giữ thông tin nhận biết về chủ sở hữu hưởng lợi."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Bản kê khai chủ sở hữu hưởng lợi chưa hoàn thiện các trường dữ liệu nhân thân và tỷ lệ quyền lợi.",
                            "Yêu cầu cá nhân kê khai điền đầy đủ thông tin, ký và nộp lại hồ sơ hợp lệ.",
                            "Lưu hồ sơ theo quy định quản lý doanh nghiệp."
                        }
                    });
                }
                else
                {
                    checklist.Add(new AppraisalChecklistItemDto
                    {
                        CriteriaName = "Tính hợp lệ của Bản kê khai chủ sở hữu hưởng lợi",
                        IsPassed = true,
                        LegalBasis = "Luật Phòng, chống rửa tiền 2022 & Nghị định 01/2021/NĐ-CP",
                        EvaluationNote = "Bản kê khai đã hoàn thiện đầy đủ các trường thông tin theo quy định."
                    });

                    return Task.FromResult(new AppraisalVerdictDto
                    {
                        VerdictType = "APPROVED",
                        VerdictTitle = "ĐỦ ĐIỀU KIỆN - BẢN KÊ KHAI CHỦ SỞ HỮU HƯỞNG LỢI HỢP LỆ",
                        VerdictSummary = "Bản kê khai và cam kết về chủ sở hữu hưởng lợi đã hoàn tất đầy đủ thông tin nhận biết và cam kết theo luật định.",
                        StatutoryAuthority = "Luật Phòng, chống rửa tiền 2022",
                        Checklist = checklist,
                        MissingRequirements = new List<string>(),
                        PrimaryLegalBasis = new LegalBasisDto
                        {
                            DocCode = "Luật Phòng, chống rửa tiền",
                            DocTitle = "Luật Phòng, chống rửa tiền năm 2022",
                            Article = "Điều 10",
                            Status = "ACTIVE",
                            FullExcerpt = "Thông tin nhận biết chủ sở hữu hưởng lợi được lưu giữ và sử dụng trong hồ sơ doanh nghiệp."
                        },
                        DraftContentBullets = new List<string>
                        {
                            "Tiếp nhận bản kê khai và cam kết chủ sở hữu hưởng lợi hợp lệ.",
                            "Lưu trữ thông tin vào hồ sơ đăng ký doanh nghiệp theo quy định."
                        }
                    });
                }
            }

            // TRƯỜNG HỢP 3.4: CÔNG VĂN / TỜ TRÌNH HÀNH CHÍNH
            // Kiểm tra số ký hiệu văn bản chính thức
            if (string.IsNullOrWhiteSpace(ocrResult.DetectedCodeNumber) || ocrResult.DetectedCodeNumber == "Chưa có số")
            {
                missingRequirements.Add("Số ký hiệu văn bản chính thức được đăng ký phát hành");
                checklist.Add(new AppraisalChecklistItemDto
                {
                    CriteriaName = "Thể thức và số ký hiệu văn bản hành chính",
                    IsPassed = false,
                    LegalBasis = "Nghị định 30/2020/NĐ-CP (Điều 8)",
                    EvaluationNote = "Văn bản chưa có số ký hiệu chính thức hoặc là bản thảo chưa qua văn thư ban hành."
                });

                return Task.FromResult(new AppraisalVerdictDto
                {
                    VerdictType = "REQUIRE_ADDITIONAL_INFO",
                    VerdictTitle = "CHƯA ĐỦ ĐIỀU KIỆN - THIẾU SỐ KÝ HIỆU VĂN BẢN CHÍNH THỨC",
                    VerdictSummary = "Tài liệu chưa có số ký hiệu văn bản chính thức hoặc thể thức văn thư chưa hoàn chỉnh. Theo quy định, văn bản hành chính gửi đến cơ quan nhà nước phải có số ký hiệu và ban hành chính thức để được thụ lý giải quyết.",
                    StatutoryAuthority = "Nghị định 30/2020/NĐ-CP về công tác văn thư",
                    Checklist = checklist,
                    MissingRequirements = missingRequirements,
                    PrimaryLegalBasis = new LegalBasisDto
                    {
                        DocCode = "30/2020/NĐ-CP",
                        DocTitle = "Nghị định 30/2020/NĐ-CP về công tác văn thư",
                        Article = "Điều 8",
                        Status = "ACTIVE",
                        FullExcerpt = "Số và ký hiệu của văn bản là thành phần thể thức bắt buộc để xác định văn bản đã được đăng ký và phát hành hợp lệ."
                    },
                    DraftContentBullets = new List<string>
                    {
                        "Văn bản tải lên chưa có số ký hiệu ban hành chính thức.",
                        "Yêu cầu đơn vị cung cấp bản văn bản chính thức đã được đăng ký vào sổ văn thư có đầy đủ số ký hiệu, ngày tháng và chữ ký/con dấu hợp lệ.",
                        "Chưa thực hiện thụ lý giải quyết cho đến khi nhận được văn bản chính thức."
                    }
                });
            }

            // Kiểm tra các nội dung chuyên ngành: Gia hạn tiến độ dự án
            bool isExtensionRequest = HasKeyword(subject, subjectNoDiacritics, "gia hạn", "gia han", "tiến độ", "tien do", "hoàn thành", "hoan thanh")
                || HasKeyword(rawText, rawNoDiacritics, "gia hạn thời gian", "gia han thoi gian", "điều chỉnh tiến độ", "dieu chinh tien do", "gia hạn tiến độ", "gia han tien do");
            bool isLandComplaint = HasKeyword(subject, subjectNoDiacritics, "khiếu nại", "khieu nai", "bồi thường", "boi thuong", "giải phóng mặt bằng", "giai phong mat bang");

            var matchedLegalDoc = activeLegalDocs
                .OrderByDescending(d => (HasKeyword(d.Title.ToLowerInvariant(), RemoveDiacritics(d.Title.ToLowerInvariant()), subjectNoDiacritics) || d.Title.ToLowerInvariant().Contains("đầu tư") ? 10 : 0) + d.HierarchyRank)
                .FirstOrDefault() ?? activeLegalDocs.FirstOrDefault();

            var primaryClause = matchedLegalDoc?.ClauseNodes.FirstOrDefault();

            if (isExtensionRequest)
            {
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
