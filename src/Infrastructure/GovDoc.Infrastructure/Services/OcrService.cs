using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using GovDoc.Application.Common.Interfaces;
using UglyToad.PdfPig;

namespace GovDoc.Infrastructure.Services
{
    public class OcrService : IOcrService
    {
        public async Task<OcrExtractionResult> ExtractDocumentTextAsync(Stream fileStream, string fileName)
        {
            var result = new OcrExtractionResult();
            string rawText = string.Empty;

            try
            {
                if (fileStream.CanSeek)
                {
                    fileStream.Seek(0, SeekOrigin.Begin);
                }

                var ext = Path.GetExtension(fileName).ToLowerInvariant();

                if (ext == ".pdf")
                {
                    rawText = ExtractTextFromPdf(fileStream);
                    if (string.IsNullOrWhiteSpace(rawText) && fileStream.CanSeek)
                    {
                        fileStream.Seek(0, SeekOrigin.Begin);
                        using var reader = new StreamReader(fileStream, Encoding.UTF8, leaveOpen: true);
                        rawText = await reader.ReadToEndAsync();
                    }
                }
                else if (ext == ".docx")
                {
                    rawText = ExtractTextFromDocx(fileStream);
                    if (string.IsNullOrWhiteSpace(rawText) && fileStream.CanSeek)
                    {
                        fileStream.Seek(0, SeekOrigin.Begin);
                        using var reader = new StreamReader(fileStream, Encoding.UTF8, leaveOpen: true);
                        rawText = await reader.ReadToEndAsync();
                    }
                }
                else if (ext == ".txt")
                {
                    using var reader = new StreamReader(fileStream, Encoding.UTF8, leaveOpen: true);
                    rawText = await reader.ReadToEndAsync();
                }
                else
                {
                    // Fallback thử đọc buffer UTF-8
                    byte[] buffer = new byte[Math.Min(fileStream.Length, 65536)];
                    await fileStream.ReadAsync(buffer, 0, buffer.Length);
                    rawText = Encoding.UTF8.GetString(buffer);
                }
            }
            catch
            {
                rawText = string.Empty;
            }

            // Nếu trích xuất được nội dung thật có nghĩa
            if (!string.IsNullOrWhiteSpace(rawText) && rawText.Any(char.IsLetterOrDigit))
            {
                ParseAdministrativeCues(rawText, result, fileName);
            }
            else
            {
                // Xử lý tệp thực tế chưa có lớp chữ số OCR (không tự động điền bừa số văn bản)
                result.DetectedIssuer = "Chưa nhận diện";
                result.DetectedCodeNumber = "Chưa có số";
                result.DetectedIssuedDate = DateTime.Now.Date;
                result.DetectedUrgency = "THƯỜNG";
                result.CalculatedSlaDeadline = CalculateBusinessSla(5);
                result.SubjectTitle = $"Tiếp nhận tài liệu: {fileName}";
                result.CoreProblem = "Tệp công văn dạng scan/hình ảnh chưa nhận dạng được lớp văn bản điện tử.";
                result.SubmittedBasis = "Tệp công văn thực tế tải lên từ người dùng.";
                result.RequestedAction = "Yêu cầu cung cấp bản số hóa có lớp văn bản điện tử để thẩm định.";
                result.ExtractedText = string.Empty;
            }

            return result;
        }

        private static string ExtractTextFromPdf(Stream stream)
        {
            var sb = new StringBuilder();
            try
            {
                using var document = PdfDocument.Open(stream);
                foreach (var page in document.GetPages())
                {
                    var pageText = page.Text;
                    if (!string.IsNullOrWhiteSpace(pageText))
                    {
                        sb.AppendLine(pageText);
                    }
                    else
                    {
                        var words = page.GetWords();
                        if (words != null && words.Any())
                        {
                            sb.AppendLine(string.Join(" ", words.Select(w => w.Text)));
                        }
                    }
                }
            }
            catch
            {
                // Bỏ qua lỗi parsing nếu file pdf hỏng
            }
            return sb.ToString();
        }

        private static string ExtractTextFromDocx(Stream stream)
        {
            var sb = new StringBuilder();
            try
            {
                using var wordDoc = WordprocessingDocument.Open(stream, false);

                // 1. Kiểm tra HeaderParts nếu văn bản chèn thông tin thể thức ở trang đầu
                if (wordDoc.MainDocumentPart?.HeaderParts != null)
                {
                    foreach (var headerPart in wordDoc.MainDocumentPart.HeaderParts)
                    {
                        if (headerPart.Header != null)
                        {
                            foreach (var p in headerPart.Header.Descendants<Paragraph>())
                            {
                                var text = p.InnerText;
                                if (!string.IsNullOrWhiteSpace(text))
                                {
                                    sb.AppendLine(text);
                                }
                            }
                        }
                    }
                }

                // 2. Toàn bộ thân văn bản (bao gồm Table 2 cột chứa Quốc hiệu/Cơ quan/Số hiệu)
                var body = wordDoc.MainDocumentPart?.Document?.Body;
                if (body != null)
                {
                    foreach (var p in body.Descendants<Paragraph>())
                    {
                        var text = p.InnerText;
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            sb.AppendLine(text);
                        }
                    }
                }
            }
            catch
            {
                // Bỏ qua lỗi parsing nếu file word hỏng
            }
            return sb.ToString();
        }

        private static void ParseAdministrativeCues(string raw, OcrExtractionResult result, string fileName)
        {
            result.ExtractedText = raw.Trim();

            // 1. Nhận diện Mức độ khẩn & Tính hạn SLA
            if (raw.Contains("HỎA TỐC", StringComparison.OrdinalIgnoreCase))
            {
                result.DetectedUrgency = "HỎA TỐC";
                result.CalculatedSlaDeadline = CalculateBusinessSla(2);
            }
            else if (raw.Contains("THƯỢNG KHẨN", StringComparison.OrdinalIgnoreCase) || raw.Contains("KHẨN", StringComparison.OrdinalIgnoreCase))
            {
                result.DetectedUrgency = "KHẨN";
                result.CalculatedSlaDeadline = CalculateBusinessSla(3);
            }
            else
            {
                result.DetectedUrgency = "THƯỜNG";
                result.CalculatedSlaDeadline = CalculateBusinessSla(5);
            }

            // 2. Nhận diện Số ký hiệu văn bản (theo chuẩn thể thức Nghị định 30/2020/NĐ-CP)
            result.DetectedCodeNumber = ExtractCodeNumber(raw);

            // 3. Nhận diện Cơ quan ban hành
            var issuerMatch = Regex.Match(raw, @"((?:ỦY BAN NHÂN DÂN|SỞ|BỘ|VĂN PHÒNG|BAN QUẢN LÝ|CÔNG TY)[^\r\n,;]+)", RegexOptions.IgnoreCase);
            if (issuerMatch.Success)
            {
                result.DetectedIssuer = CleanIssuer(issuerMatch.Groups[1].Value);
            }
            else
            {
                result.DetectedIssuer = "Cơ quan hành chính nhà nước";
            }

            // 4. Nhận diện Ngày tháng năm ban hành
            var dateMatch = Regex.Match(raw, @"ngày\s+([0-9]{1,2})\s+tháng\s+([0-9]{1,2})\s+năm\s+([0-9]{4})", RegexOptions.IgnoreCase);
            if (dateMatch.Success &&
                int.TryParse(dateMatch.Groups[1].Value, out int d) &&
                int.TryParse(dateMatch.Groups[2].Value, out int m) &&
                int.TryParse(dateMatch.Groups[3].Value, out int y))
            {
                try
                {
                    result.DetectedIssuedDate = new DateTime(y, m, d);
                }
                catch
                {
                    result.DetectedIssuedDate = DateTime.Now.Date;
                }
            }
            else
            {
                result.DetectedIssuedDate = DateTime.Now.Date;
            }

            // 5. Nhận diện Trích yếu nội dung (V/v...)
            var subjectMatch = Regex.Match(raw, @"(V/v|về việc|N/v|V/V)\s*([^\r\n]+)", RegexOptions.IgnoreCase);
            if (subjectMatch.Success)
            {
                result.SubjectTitle = subjectMatch.Groups[2].Value.Trim();
            }
            else
            {
                // Tìm dòng tiêu đề (như TỜ TRÌNH, BÁO CÁO, CÔNG VĂN)
                var titleDocMatch = Regex.Match(raw, @"(TỜ TRÌNH|BÁO CÁO|CÔNG VĂN|ĐƠN KHIẾU NẠI)\s*([^\r\n]*)", RegexOptions.IgnoreCase);
                if (titleDocMatch.Success)
                {
                    result.SubjectTitle = titleDocMatch.Value.Trim();
                }
                else
                {
                    result.SubjectTitle = $"Xử lý văn bản {result.DetectedCodeNumber}";
                }
            }

            // 6. Nhận diện Nơi nhận chính (Kính gửi)
            var recipientMatch = Regex.Match(raw, @"Kính gửi:\s*([^\r\n\.]+)", RegexOptions.IgnoreCase);
            if (recipientMatch.Success)
            {
                result.Recipients = recipientMatch.Groups[1].Value.Trim();
            }

            // 7. Nhận diện Căn cứ viện dẫn đã nêu
            var bases = new List<string>();
            var baseMatches = Regex.Matches(raw, @"(Căn cứ\s+[^\r\n;]+|Theo báo cáo\s+[^\r\n;]+)", RegexOptions.IgnoreCase);
            foreach (Match bMatch in baseMatches.Take(3))
            {
                bases.Add(bMatch.Value.Trim());
            }
            result.SubmittedBasis = bases.Count > 0
                ? string.Join("; ", bases)
                : "Căn cứ theo văn bản đề nghị và hồ sơ thực địa gửi kèm.";

            // 8. Nhận diện Vấn đề cốt lõi & Hành động đề nghị
            var requestMatches = Regex.Matches(raw, @"((?:kính đề nghị|đề nghị|xin gia hạn|xin chủ trương|khiếu nại|báo cáo xin ý kiến|đề xuất)[^\r\n\.]+)", RegexOptions.IgnoreCase);
            if (requestMatches.Count > 0)
            {
                result.RequestedAction = requestMatches[0].Value.Trim();
                result.CoreProblem = $"Đơn vị gửi văn bản về việc: {result.SubjectTitle}. Nội dung đề xuất: {result.RequestedAction}.";
            }
            else
            {
                result.CoreProblem = $"Giải quyết nội dung: {result.SubjectTitle} do {result.DetectedIssuer} ban hành.";
                result.RequestedAction = $"Xem xét và ban hành văn bản phúc đáp theo thẩm quyền.";
            }

            // 9. Nhận diện Người ký và Chức vụ (Thường nằm ở cuối văn bản, là dòng độc lập)
            var signerMatches = Regex.Matches(raw, @"^\s*(?:KT\.\s*|TM\.\s*)?(?:CHỦ TỊCH|GIÁM ĐỐC|CHÁNH VĂN PHÒNG|PHÓ CHỦ TỊCH|PHÓ GIÁM ĐỐC|TRƯỞNG PHÒNG)\b[^\r\n]*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            if (signerMatches.Count > 0)
            {
                var signerMatch = signerMatches[signerMatches.Count - 1];
                result.SignerTitle = signerMatch.Value.Trim();

                // Lấy các dòng phía sau chức danh để nhận diện tên người ký
                var remaining = raw.Substring(signerMatch.Index + signerMatch.Length);
                var lines = remaining.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                                     .Select(l => l.Trim())
                                     .Where(l => !string.IsNullOrWhiteSpace(l) && !l.Contains("(đã ký)") && !l.Contains("(Ký tên)") && !l.StartsWith("Dấu") && !l.StartsWith("-"))
                                     .ToList();
                if (lines.Count > 0)
                {
                    result.SignerName = lines[0];
                }
            }
        }

        private static string CleanIssuer(string raw)
        {
            var cleaned = raw.Trim('-', ' ', ':', ';', '.');
            if (cleaned.Length > 80)
            {
                cleaned = cleaned.Substring(0, 80).Trim();
            }
            return cleaned;
        }

        private static DateTimeOffset CalculateBusinessSla(int businessDays)
        {
            var current = DateTimeOffset.Now;
            int added = 0;
            while (added < businessDays)
            {
                current = current.AddDays(1);
                if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
                {
                    added++;
                }
            }
            return current;
        }

        private static string ExtractCodeNumber(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "Chưa có số";

            // Giới hạn tìm kiếm trong 2500 ký tự đầu tiên của văn bản (khu vực thể thức NĐ 30)
            string headerSection = raw.Length > 2500 ? raw.Substring(0, 2500) : raw;

            // Pattern 1: Bắt đầu bằng tiền tố "Số:" hoặc "Số :" hoặc "Số" hoặc "So:" (kèm dấu : hoặc khoảng trắng)
            // Ví dụ: "Số: 245/STC-QLG", "Số : 142/UBND-KT", "Số: 18/2025/QĐ-UBND", "Số 99/UBND-VP", "Số: 15/GD&ĐT-TCCB"
            var explicitMatch = Regex.Match(
                headerSection,
                @"(?:Số\s*:?|So\s*:?)\s*([0-9]{1,5}\s*/\s*(?:[0-9]{4}\s*/\s*)?[A-Za-zÀ-ỹĐđ0-9\-_&]+(?:\s*[-/]\s*[A-Za-zÀ-ỹĐđ0-9\-_&]+)*)",
                RegexOptions.IgnoreCase);

            if (explicitMatch.Success)
            {
                string candidate = explicitMatch.Groups[1].Value.Replace(" ", "").Trim();
                candidate = candidate.TrimEnd('.', ',', ';', ':', '-');
                if (IsValidAdministrativeCode(candidate))
                {
                    return candidate;
                }
            }

            // Pattern 2: Dòng riêng biệt có định dạng số hiệu hành chính chuẩn nằm ở các dòng đầu
            var lines = headerSection.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in lines.Take(15))
            {
                var trimmedLine = line.Trim();
                var lineMatch = Regex.Match(
                    trimmedLine,
                    @"^(?:Số\s*:?\s*)?([0-9]{1,5}\s*/\s*(?:[0-9]{4}\s*/\s*)?[A-Za-zÀ-ỹĐđ0-9\-_&]+(?:\s*[-/]\s*[A-Za-zÀ-ỹĐđ0-9\-_&]+)*)$",
                    RegexOptions.IgnoreCase);

                if (lineMatch.Success)
                {
                    string candidate = lineMatch.Groups[1].Value.Replace(" ", "").Trim().TrimEnd('.', ',', ';', ':');
                    if (IsValidAdministrativeCode(candidate))
                    {
                        return candidate;
                    }
                }
            }

            // Pattern 3: Tìm số hiệu chuẩn ở phần đầu, LOẠI TRỪ nếu đứng sau chữ "Căn cứ" hoặc "Theo Quyết định"
            var docCodePattern = new Regex(@"\b([0-9]{1,5}/(?:[0-9]{4}/)?[A-Za-zÀ-ỹĐđ0-9\-_&]{2,10}(?:[-/][A-Za-zÀ-ỹĐđ0-9\-_&]{2,10})+)\b");
            var matches = docCodePattern.Matches(headerSection);
            foreach (Match m in matches)
            {
                int index = m.Index;
                string before = headerSection.Substring(Math.Max(0, index - 50), Math.Min(index, 50));
                if (Regex.IsMatch(before, @"(?:Căn cứ|Theo|tại|theo)\s+(?:Quyết định|Nghị định|Luật|Thông tư|Nghị quyết)?\s*$", RegexOptions.IgnoreCase))
                {
                    continue;
                }

                string candidate = m.Groups[1].Value.Trim().TrimEnd('.', ',', ';', ':');
                if (IsValidAdministrativeCode(candidate))
                {
                    return candidate;
                }
            }

            // Tuyệt đối không tự động điền tên tệp hoặc số lung tung khi không tìm thấy
            return "Chưa có số";
        }

        private static bool IsValidAdministrativeCode(string code)
        {
            if (string.IsNullOrWhiteSpace(code) || !code.Contains('/')) return false;

            // Phải bắt đầu bằng chữ số (Điều 8 Nghị định 30/2020/NĐ-CP)
            if (!char.IsDigit(code[0])) return false;

            // Phải có ít nhất 1 chữ cái sau dấu gạch chéo
            bool hasLetter = code.Any(char.IsLetter);
            if (!hasLetter) return false;

            // Không được có định dạng ngày tháng như dd/MM/yyyy hoặc d/M/yyyy
            if (Regex.IsMatch(code, @"^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2,4}$")) return false;

            return true;
        }
    }
}
