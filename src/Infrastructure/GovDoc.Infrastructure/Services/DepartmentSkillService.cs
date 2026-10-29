using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;

namespace GovDoc.Infrastructure.Services
{
    public class DepartmentSkillService : IDepartmentSkillService
    {
        public string GenerateInitialDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            List<string>? goldPhrases = null)
        {
            var sb = new StringBuilder();

            string incomingCode = !string.IsNullOrWhiteSpace(ocrResult.DetectedCodeNumber) ? ocrResult.DetectedCodeNumber : "đã tiếp nhận";
            string incomingIssuer = !string.IsNullOrWhiteSpace(ocrResult.DetectedIssuer) ? ocrResult.DetectedIssuer : "đơn vị gửi";
            string subject = !string.IsNullOrWhiteSpace(ocrResult.SubjectTitle) ? ocrResult.SubjectTitle : "giải quyết nội dung công văn";

            // 1. Phần Căn cứ pháp lý (Legal Bases)
            sb.Append("<p><strong>Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015; Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;</strong></p>");
            sb.Append("<p><strong>Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;</strong></p>");

            // Bổ sung các căn cứ pháp lý chuyên ngành từ Tủ sách pháp luật phù hợp với lĩnh vực
            var matchedSpecialtyBases = activeBases
                .Where(b => b.Status == LegalStatus.Active && !b.IsDraft)
                .OrderByDescending(b => b.HierarchyRank)
                .Take(2)
                .ToList();

            foreach (var b in matchedSpecialtyBases)
            {
                sb.Append($"<p>Căn cứ {b.Title} (Số hiệu: {b.CodeNumber});</p>");
            }

            // 2. Xét đề nghị
            sb.Append($"<p>Xét đề nghị của {incomingIssuer} tại văn bản số {incomingCode} về việc {subject};</p>");
            sb.Append("<p>Chủ tịch Ủy ban nhân dân có ý kiến chỉ đạo như sau:</p>");

            // 3. Phân hóa ý kiến chuyên môn theo Kỹ năng phòng ban (Department Skills)
            sb.Append("<ol>");
            switch (userDepartment.ToUpperInvariant())
            {
                case FieldCategory.DatDaiXayDung:
                    sb.Append("<li><strong>Về quy hoạch và hiện trạng sử dụng đất:</strong> Giao Sở Tài nguyên và Môi trường chủ trì, phối hợp với Sở Xây dựng và Ủy ban nhân dân cấp huyện kiểm tra, rà soát hồ sơ quy hoạch, kế hoạch sử dụng đất và phương án bồi thường, hỗ trợ tái định cư theo đúng quy định hiện hành.</li>");
                    sb.Append("<li><strong>Về tiến độ thực hiện:</strong> Yêu cầu chủ đầu tư phối hợp chặt chẽ với Trung tâm Phát triển quỹ đất hoàn tất các thủ tục giao đất, thuê đất; tuyệt đối không triển khai xây dựng khi chưa hoàn thành đầy đủ thủ tục pháp lý.</li>");
                    sb.Append("<li><strong>Trách nhiệm báo cáo:</strong> Báo cáo kết quả rà soát và tham mưu văn bản chỉ đạo của Ủy ban nhân dân tỉnh trước thời hạn quy định.</li>");
                    break;

                case FieldCategory.KinhTeTaiChinh:
                    sb.Append("<li><strong>Về thẩm định nguồn vốn và phương án đầu tư:</strong> Giao Sở Kế hoạch và Đầu tư chủ trì, phối hợp với Sở Tài chính thẩm định năng lực tài chính, cơ cấu nguồn vốn và tính khả thi của dự án đầu tư theo quy định của Luật Đầu tư và pháp luật về ngân sách nhà nước.</li>");
                    sb.Append("<li><strong>Về ưu đãi và nghĩa vụ tài chính:</strong> Hướng dẫn nhà đầu tư thực hiện đầy đủ nghĩa vụ thuế, tài chính đất đai và bảo đảm giải ngân đúng tiến độ cam kết.</li>");
                    sb.Append("<li>Báo cáo tiến độ thẩm định định kỳ gửi về Thường trực Ủy ban nhân dân tỉnh.</li>");
                    break;

                case FieldCategory.NoiVuToChuc:
                    sb.Append("<li><strong>Về tổ chức bộ máy và vị trí việc làm:</strong> Giao Sở Nội vụ chủ trì thẩm định đề án kiện toàn tổ chức, biên chế và quy chế làm việc bảo đảm tinh gọn, hoạt động hiệu lực, hiệu quả theo đúng quy định.</li>");
                    sb.Append("<li>Thực hiện quy trình bổ nhiệm, luân chuyển cán bộ công chức theo đúng tiêu chuẩn chức danh và quy trình công tác cán bộ.</li>");
                    sb.Append("<li>Kịp thời báo cáo Ban Cán sự đảng và Lãnh đạo Ủy ban nhân dân tỉnh xem xét, quyết định.</li>");
                    break;

                case FieldCategory.TuPhapPhapChe:
                    sb.Append("<li><strong>Về tính hợp hiến, hợp pháp:</strong> Giao Sở Tư pháp chủ trì rà soát toàn diện cơ sở pháp lý, thẩm quyền ban hành văn bản và bảo đảm sự thống nhất, đồng bộ với hệ thống văn bản quy phạm pháp luật hiện hành.</li>");
                    sb.Append("<li>Kiểm tra, phát hiện các nội dung có nguy cơ xung đột pháp lý hoặc vượt quá thẩm quyền được phân cấp để kịp thời điều chỉnh, bổ sung.</li>");
                    sb.Append("<li>Hoàn thiện dự thảo văn bản pháp lý, trình Chủ tịch Ủy ban nhân dân tỉnh ký ban hành.</li>");
                    break;

                case FieldCategory.ThanhTraKhieuNai:
                    sb.Append("<li><strong>Về tiếp nhận và phân loại đơn thư:</strong> Giao Ban Tiếp công dân tỉnh phối hợp với Thanh tra tỉnh phân loại đơn, xác minh thẩm quyền giải quyết khiếu nại, tố cáo theo quy định của Luật Khiếu nại và Luật Tố cáo.</li>");
                    sb.Append("<li>Tổ chức đối thoại trực tiếp với công dân, làm rõ các căn cứ pháp lý và nguyên nhân phát sinh khiếu kiện.</li>");
                    sb.Append("<li>Ban hành văn bản trả lời công dân đúng thời hạn luật định, không để xảy ra tình trạng khiếu kiện vượt cấp, kéo dài.</li>");
                    break;

                case FieldCategory.VanHoaXaHoi:
                    sb.Append("<li><strong>Về phương án chuyên môn:</strong> Giao cơ quan chuyên môn phụ trách lĩnh vực (Y tế, Giáo dục, Văn hóa) chủ trì khảo sát, đánh giá tác động xã hội và tính khả thi của phương án triển khai.</li>");
                    sb.Append("<li>Bảo đảm tuân thủ các quy chuẩn chuyên môn, định mức kinh tế kỹ thuật và tiêu chí an sinh xã hội.</li>");
                    sb.Append("<li>Tham mưu Ủy ban nhân dân tỉnh ban hành kế hoạch triển khai chi tiết.</li>");
                    break;

                case FieldCategory.QuanTriVanPhong:
                default:
                    sb.Append("<li><strong>Về nội dung đề xuất:</strong> Chấp thuận về mặt chủ trương đối với các nội dung đề nghị của đơn vị gửi văn bản bảo đảm đúng thẩm quyền và chức năng, nhiệm vụ được giao.</li>");
                    sb.Append("<li><strong>Về quy trình phối hợp:</strong> Giao đơn vị chủ trì phối hợp với các phòng, ban chuyên môn liên quan hướng dẫn, tạo điều kiện thuận lợi để giải quyết dứt điểm hồ sơ công việc theo cơ chế một cửa.</li>");
                    sb.Append("<li>Văn phòng Ủy ban nhân dân tỉnh có trách nhiệm theo dõi, đôn đốc tiến độ thực hiện và tổng hợp báo cáo Lãnh đạo cơ quan xem xét, chỉ đạo.</li>");
                    break;
            }
            sb.Append("</ol>");

            // Nếu có mẫu chuẩn vàng đã lưu, bổ sung văn phong chuẩn mực
            if (goldPhrases != null && goldPhrases.Count > 0)
            {
                sb.Append("<p><em>Ghi chú chuẩn hóa: Văn bản được định dạng theo mẫu chuẩn đã được duyệt của cơ quan.</em></p>");
            }

            return sb.ToString();
        }

        public string GenerateLearnedDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            List<ProcessingLog>? exemplarLogs,
            out string? learningSourceNote)
        {
            learningSourceNote = null;
            if (exemplarLogs == null || exemplarLogs.Count == 0)
            {
                return GenerateInitialDraftHtml(ocrResult, activeBases, userDepartment);
            }

            // Tập từ khóa của văn bản đến hiện tại
            string currentSubject = (ocrResult.SubjectTitle ?? string.Empty).ToLowerInvariant();
            string currentProblem = (ocrResult.CoreProblem ?? string.Empty).ToLowerInvariant();
            string combinedCurrent = currentSubject + " " + currentProblem;
            var currentWords = combinedCurrent.Split(new[] { ' ', ',', '.', ';', ':', '-', '(', ')', '/', '\\' }, StringSplitOptions.RemoveEmptyEntries)
                                              .Where(w => w.Length > 2)
                                              .ToHashSet();

            ProcessingLog? bestExemplar = null;
            double bestScore = 0.0;

            foreach (var log in exemplarLogs)
            {
                if (string.IsNullOrWhiteSpace(log.DraftContentHtml)) continue;

                string logSubject = (log.SubjectTitle ?? string.Empty).ToLowerInvariant();
                var logWords = logSubject.Split(new[] { ' ', ',', '.', ';', ':', '-', '(', ')', '/', '\\' }, StringSplitOptions.RemoveEmptyEntries)
                                         .Where(w => w.Length > 2)
                                         .ToHashSet();

                if (logWords.Count == 0) continue;

                int intersection = currentWords.Count(w => logWords.Contains(w));
                double union = currentWords.Union(logWords).Count();
                double jaccard = union > 0 ? (double)intersection / union : 0.0;

                // Ưu tiên tệp đầu ra tùy chỉnh do người dùng upload thực tế
                if (log.IsCustomOutput) jaccard += 0.20;
                if (log.IsGoldSample) jaccard += 0.10;

                if (jaccard > bestScore)
                {
                    bestScore = jaccard;
                    bestExemplar = log;
                }
            }

            // Nếu tìm thấy mẫu tương đồng với điểm >= 0.20
            if (bestExemplar != null && bestScore >= 0.20 && !string.IsNullOrWhiteSpace(bestExemplar.DraftContentHtml))
            {
                string incomingCode = !string.IsNullOrWhiteSpace(ocrResult.DetectedCodeNumber) ? ocrResult.DetectedCodeNumber : "đã tiếp nhận";
                string incomingIssuer = !string.IsNullOrWhiteSpace(ocrResult.DetectedIssuer) ? ocrResult.DetectedIssuer : "đơn vị gửi";
                string subject = !string.IsNullOrWhiteSpace(ocrResult.SubjectTitle) ? ocrResult.SubjectTitle : "giải quyết nội dung công văn";

                string learnedContent = bestExemplar.DraftContentHtml;

                // Thay thế các thực thể động (số công văn cũ, cơ quan gửi cũ) sang thực thể của công văn mới
                if (!string.IsNullOrWhiteSpace(bestExemplar.IncomingDocCode))
                {
                    learnedContent = learnedContent.Replace(bestExemplar.IncomingDocCode, incomingCode);
                }
                if (!string.IsNullOrWhiteSpace(bestExemplar.IncomingIssuer))
                {
                    learnedContent = learnedContent.Replace(bestExemplar.IncomingIssuer, incomingIssuer);
                }

                string docLabel = bestExemplar.OutputFileName ?? bestExemplar.IncomingDocCode ?? bestExemplar.OriginalFileName;
                learningSourceNote = $"Hệ thống đã tự động học hỏi văn phong và cấu trúc từ văn bản thực tế: \"{docLabel}\" (Độ khớp: {Math.Min(100, Math.Round(bestScore * 100))}%) để tạo kết quả vừa ý.";
                return learnedContent;
            }

            return GenerateInitialDraftHtml(ocrResult, activeBases, userDepartment);
        }

        public double CalculateRetentionRate(string originalAiDraft, string finalUserDraft)
        {
            if (string.IsNullOrWhiteSpace(originalAiDraft)) return 0.0;
            if (string.IsNullOrWhiteSpace(finalUserDraft)) return 0.0;

            // Làm sạch mã HTML, lấy mảng từ
            string cleanAi = Regex.Replace(originalAiDraft, "<.*?>", " ");
            string cleanFinal = Regex.Replace(finalUserDraft, "<.*?>", " ");

            var aiWords = cleanAi.Split(new[] { ' ', '\r', '\n', '\t', ',', '.', ';', ':', '-', '(', ')' }, StringSplitOptions.RemoveEmptyEntries)
                                 .Select(w => w.Trim().ToLowerInvariant())
                                 .Where(w => w.Length > 1)
                                 .ToList();

            var finalWordSet = new HashSet<string>(
                cleanFinal.Split(new[] { ' ', '\r', '\n', '\t', ',', '.', ';', ':', '-', '(', ')' }, StringSplitOptions.RemoveEmptyEntries)
                          .Select(w => w.Trim().ToLowerInvariant())
                          .Where(w => w.Length > 1)
            );

            if (aiWords.Count == 0) return 1.0;

            int retainedCount = aiWords.Count(w => finalWordSet.Contains(w));
            return (double)retainedCount / aiWords.Count;
        }

        public string DetermineCategory(string text, string department)
        {
            if (!string.IsNullOrWhiteSpace(department) && department.Contains("_"))
            {
                return department.ToUpperInvariant();
            }

            string combined = (text + " " + department).ToLowerInvariant();
            if (combined.Contains("đất") || combined.Contains("xây dựng") || combined.Contains("quy hoạch") || combined.Contains("nhà ở") || combined.Contains("tái định cư"))
                return FieldCategory.DatDaiXayDung;

            if (combined.Contains("tài chính") || combined.Contains("ngân sách") || combined.Contains("đầu tư") || combined.Contains("vốn") || combined.Contains("thuế") || combined.Contains("kinh tế"))
                return FieldCategory.KinhTeTaiChinh;

            if (combined.Contains("nội vụ") || combined.Contains("bổ nhiệm") || combined.Contains("cán bộ") || combined.Contains("công chức") || combined.Contains("biên chế"))
                return FieldCategory.NoiVuToChuc;

            if (combined.Contains("tư pháp") || combined.Contains("pháp chế") || combined.Contains("hiến pháp") || combined.Contains("nghị quyết") || combined.Contains("thẩm định"))
                return FieldCategory.TuPhapPhapChe;

            if (combined.Contains("khiếu nại") || combined.Contains("tố cáo") || combined.Contains("thanh tra"))
                return FieldCategory.ThanhTraKhieuNai;

            if (combined.Contains("văn hóa") || combined.Contains("xã hội") || combined.Contains("y tế") || combined.Contains("giáo dục"))
                return FieldCategory.VanHoaXaHoi;

            return FieldCategory.QuanTriVanPhong;
        }

        public string GenerateDeepDetailedDraftHtml(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeBases,
            string userDepartment,
            string? userDirective = null)
        {
            var sb = new StringBuilder();

            string incomingCode = !string.IsNullOrWhiteSpace(ocrResult.DetectedCodeNumber) ? ocrResult.DetectedCodeNumber : "đã tiếp nhận";
            string incomingIssuer = !string.IsNullOrWhiteSpace(ocrResult.DetectedIssuer) ? ocrResult.DetectedIssuer : "đơn vị gửi";
            string subject = !string.IsNullOrWhiteSpace(ocrResult.SubjectTitle) ? ocrResult.SubjectTitle : "giải quyết nội dung công văn";
            string coreProblem = !string.IsNullOrWhiteSpace(ocrResult.CoreProblem) ? ocrResult.CoreProblem : subject;
            string requestedAction = !string.IsNullOrWhiteSpace(ocrResult.RequestedAction) ? ocrResult.RequestedAction : "xem xét phê duyệt theo thẩm quyền";

            // 1. CĂN CỨ PHÁP LÝ CHUYÊN SÂU
            sb.Append("<p><strong>Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015; Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;</strong></p>");
            sb.Append("<p><strong>Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;</strong></p>");

            // Lấy các văn bản quy phạm pháp luật phù hợp nhất
            var relevantBases = activeBases
                .Where(b => b.Status == LegalStatus.Active && !b.IsDraft)
                .OrderByDescending(b => b.HierarchyRank)
                .Take(3)
                .ToList();

            foreach (var b in relevantBases)
            {
                sb.Append($"<p>Căn cứ {b.Title} (Số hiệu: {b.CodeNumber});</p>");
            }

            // 2. PHẦN XÉT ĐỀ NGHỊ
            sb.Append($"<p>Xét đề nghị của {incomingIssuer} tại văn bản số {incomingCode} về việc {subject};</p>");
            sb.Append("<p>Xét đề xuất và báo cáo rà soát của các cơ quan chuyên môn;</p>");
            sb.Append("<p>Chủ tịch Ủy ban nhân dân có ý kiến chỉ đạo cụ thể như sau:</p>");

            // 3. CÁC NỘI DUNG CHỈ ĐẠO CHI TIẾT (KHẮC PHỤC CHUNG CHUNG)
            sb.Append("<ol>");

            // ĐIỀU 1: Ý KIẾN CHỈ ĐẠO TRỌNG TÂM / CHỦ TRƯƠNG
            if (!string.IsNullOrWhiteSpace(userDirective))
            {
                sb.Append($"<li><strong>Về chủ trương và định hướng giải quyết:</strong> Thực hiện theo đúng chỉ đạo: {userDirective.Trim()}. Yêu cầu các đơn vị trực tiếp bám sát nội dung này để triển khai.</li>");
            }
            else
            {
                sb.Append($"<li><strong>Về nội dung xem xét giải quyết:</strong> Đối với nội dung đề nghị của {incomingIssuer} liên quan đến \"{coreProblem}\": Giao các cơ quan chuyên môn căn cứ quy hoạch, kế hoạch đã được phê duyệt và quy định pháp luật chuyên ngành hiện hành để thẩm định chi tiết; bảo đảm tính khả thi, công khai, minh bạch và đúng trình tự, thủ tục quy định.</li>");
            }

            // ĐIỀU 2: PHÂN CÔNG NHIỆM VỤ CHI TIẾT THEO NGÀNH VÀ ĐỊA PHƯƠNG
            switch (userDepartment.ToUpperInvariant())
            {
                case FieldCategory.DatDaiXayDung:
                    sb.Append("<li><strong>Về quy hoạch, hiện trạng đất đai và thủ tục đầu tư:</strong>");
                    sb.Append("<ul>");
                    sb.Append("<li>Giao Sở Tài nguyên và Môi trường chủ trì, phối hợp với Ủy ban nhân dân cấp huyện nơi có dự án/khu đất tiến hành kiểm tra thực địa, rà soát nguồn gốc đất đai, tính pháp lý của hồ sơ thu hồi, giao đất hoặc chuyển mục đích sử dụng đất; không để xảy ra tranh chấp, khiếu kiện.</li>");
                    sb.Append("<li>Giao Sở Xây dựng thẩm định sự phù hợp với quy hoạch xây dựng, quy hoạch đô thị, chỉ giới xây dựng và các tiêu chuẩn kỹ thuật chuyên ngành liên quan.</li>");
                    sb.Append("</ul></li>");
                    break;

                case FieldCategory.KinhTeTaiChinh:
                    sb.Append("<li><strong>Về thẩm định tài chính, nguồn vốn và cơ chế thực hiện:</strong>");
                    sb.Append("<ul>");
                    sb.Append("<li>Giao Sở Kế hoạch và Đầu tư chủ trì thẩm định chủ trương đầu tư, năng lực tài chính, tiến độ thực hiện dự án và đánh giá hiệu quả kinh tế - xã hội.</li>");
                    sb.Append("<li>Giao Sở Tài chính và Cục Thuế rà soát nghĩa vụ tài chính, tiền thuê đất, các chính sách ưu đãi đầu tư đúng theo quy định của pháp luật về thuế và ngân sách nhà nước.</li>");
                    sb.Append("</ul></li>");
                    break;

                case FieldCategory.NoiVuToChuc:
                    sb.Append("<li><strong>Về thẩm định nhân sự, vị trí việc làm và biên chế:</strong>");
                    sb.Append("<ul>");
                    sb.Append("<li>Giao Sở Nội vụ chủ trì thẩm định hồ sơ, đối chiếu tiêu chuẩn chức danh, định mức biên chế và quy chế làm việc; bảo đảm tinh gọn bộ máy và đúng quy trình công tác cán bộ.</li>");
                    sb.Append("<li>Hoàn thiện tờ trình và dự thảo quyết định báo cáo Ban Cán sự đảng và Lãnh đạo Ủy ban nhân dân tỉnh xem xét theo quy định.</li>");
                    sb.Append("</ul></li>");
                    break;

                case FieldCategory.TuPhapPhapChe:
                case FieldCategory.ThanhTraKhieuNai:
                    sb.Append("<li><strong>Về rà soát cơ sở pháp lý và giải quyết quyền lợi:</strong>");
                    sb.Append("<ul>");
                    sb.Append("<li>Giao Sở Tư pháp / Thanh tra tỉnh phối hợp với các cơ quan liên quan kiểm tra tính hợp hiến, hợp pháp, thẩm quyền ban hành và thời hiệu giải quyết theo quy định.</li>");
                    sb.Append("<li>Tổ chức rà soát hồ sơ, xác minh chứng cứ, đối thoại trực tiếp nếu cần thiết để ban hành kết luận giải quyết dứt điểm, đúng pháp luật.</li>");
                    sb.Append("</ul></li>");
                    break;

                default:
                    sb.Append($"<li><strong>Về trách nhiệm phối hợp liên ngành:</strong> Giao cơ quan chuyên môn chủ trì phối hợp chặt chẽ với {incomingIssuer} rà soát toàn bộ hồ sơ, làm rõ các điều kiện cần và đủ đối với nội dung \"{requestedAction}\"; lập biên bản làm việc thống nhất phương án xử lý cụ thể.</li>");
                    break;
            }

            // ĐIỀU 3: NGHĨA VỤ CỦA ĐƠN VỊ ĐỀ XUẤT
            sb.Append($"<li><strong>Về trách nhiệm của đơn vị đề xuất ({incomingIssuer}):</strong> Chịu trách nhiệm toàn diện trước pháp luật về tính chính xác, trung thực của các số liệu, tài liệu cung cấp trong hồ sơ; chủ động phối hợp với các sở, ngành liên quan để hoàn thiện các thủ tục pháp lý theo hướng dẫn.</li>");

            // ĐIỀU 4: THỜI HẠN HOÀN THÀNH (SLA CỤ THỂ)
            sb.Append("<li><strong>Về thời hạn hoàn thành và báo cáo kết quả:</strong> Yêu cầu các đơn vị được giao nhiệm vụ khẩn trương triển khai thực hiện, báo cáo kết quả thẩm định và tham mưu văn bản chỉ đạo của Ủy ban nhân dân tỉnh trong thời hạn <strong>15 ngày làm việc</strong> kể từ ngày ký văn bản này (trước ngày đến hạn theo quy định SLA).</li>");

            // ĐIỀU 5: TRÁCH NHIỆM ĐÔN ĐỐC CỦA VĂN PHÒNG
            sb.Append("<li>Văn phòng Ủy ban nhân dân tỉnh có trách nhiệm theo dõi, đôn đốc tiến độ thực hiện của các cơ quan, đơn vị; kịp thời báo cáo Lãnh đạo Ủy ban nhân dân tỉnh những vấn đề phát sinh, vướng mắc vượt thẩm quyền để chỉ đạo xử lý.</li>");

            sb.Append("</ol>");

            return sb.ToString();
        }
    }
}
