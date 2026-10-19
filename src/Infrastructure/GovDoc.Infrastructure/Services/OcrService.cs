using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using GovDoc.Application.Common.Interfaces;
using UglyToad.PdfPig;

namespace GovDoc.Infrastructure.Services
{
    public class OcrService : IOcrService
    {
        static OcrService()
        {
            try
            {
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            }
            catch
            {
                // Fallback nếu đã được đăng ký
            }
        }

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
                else if (ext == ".doc")
                {
                    rawText = ExtractTextFromDoc(fileStream);
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
            catch (Exception ex)
            {
                rawText = string.Empty;
                result.ExtractionNote = $"Lỗi đọc tệp: {ex.Message}";
            }

            // 1. Tự động chuyển đổi TCVN3 sang Unicode nếu phát hiện font cũ (ABC, .VnTime,...)
            if (!string.IsNullOrWhiteSpace(rawText))
            {
                rawText = VietnameseFontConverter.ConvertTcvn3ToUnicode(rawText);
            }

            // 2. Kiểm tra tính toàn vẹn, lỗi font, mã hóa nhị phân
            var (isCorrupted, corruptReason) = VietnameseFontConverter.DetectCorruptionOrEncodingError(rawText);
            if (isCorrupted)
            {
                result.HasFontOrEncodingError = true;
                result.ExtractionNote = corruptReason;
            }

            // 3. Phân loại và trích xuất thực thể
            if (!string.IsNullOrWhiteSpace(rawText) && rawText.Any(char.IsLetterOrDigit) && !result.HasFontOrEncodingError)
            {
                ParseAdministrativeCues(rawText, result, fileName);
            }
            else
            {
                // Xử lý tệp bị lỗi font / không đọc được / hình ảnh scan chưa có lớp text
                result.DetectedIssuer = "Chưa nhận diện";
                result.DetectedCodeNumber = "Chưa có số";
                result.DetectedIssuedDate = DateTime.Now.Date;
                result.DetectedUrgency = "THƯỜNG";
                result.CalculatedSlaDeadline = CalculateBusinessSla(5);
                result.SubjectTitle = $"Tiếp nhận tài liệu: {fileName}";
                result.CoreProblem = string.IsNullOrWhiteSpace(result.ExtractionNote)
                    ? "Tệp công văn dạng scan/hình ảnh chưa nhận dạng được lớp văn bản điện tử."
                    : result.ExtractionNote;
                result.SubmittedBasis = "Tệp công văn thực tế tải lên từ người dùng.";
                result.RequestedAction = "Yêu cầu cung cấp tệp định dạng chuẩn Unicode (UTF-8) hoặc văn bản rõ nét.";
                result.ExtractedText = rawText ?? string.Empty;
                result.DocumentCategory = "KHONG_XAC_DINH";
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
                    var words = page.GetWords()?.ToList();
                    if (words != null && words.Count > 0)
                    {
                        // Sắp xếp và gom nhóm các từ thành từng dòng dựa trên tọa độ Y và X
                        // Trong PDF, tọa độ Y gốc từ đáy trang, nên Y lớn hơn là ở phía trên
                        var lines = new List<List<UglyToad.PdfPig.Content.Word>>();
                        var sortedWords = words.OrderByDescending(w => w.BoundingBox.Bottom).ThenBy(w => w.BoundingBox.Left).ToList();

                        foreach (var word in sortedWords)
                        {
                            var matchedLine = lines.FirstOrDefault(l =>
                            {
                                var refWord = l[0];
                                var yDiff = Math.Abs(refWord.BoundingBox.Bottom - word.BoundingBox.Bottom);
                                var avgHeight = (refWord.BoundingBox.Height + word.BoundingBox.Height) / 2.0;
                                return yDiff <= Math.Max(3.0, avgHeight * 0.5);
                            });

                            if (matchedLine != null)
                            {
                                matchedLine.Add(word);
                            }
                            else
                            {
                                lines.Add(new List<UglyToad.PdfPig.Content.Word> { word });
                            }
                        }

                        // Sắp xếp các dòng từ trên xuống dưới
                        var orderedLines = lines
                            .OrderByDescending(l => l.Average(w => w.BoundingBox.Bottom))
                            .ToList();

                        foreach (var line in orderedLines)
                        {
                            var lineWords = line.OrderBy(w => w.BoundingBox.Left).Select(w => w.Text);
                            var lineStr = string.Join(" ", lineWords).Trim();
                            if (!string.IsNullOrWhiteSpace(lineStr))
                            {
                                sb.AppendLine(lineStr);
                            }
                        }
                    }
                    else
                    {
                        var fallbackText = page.Text;
                        if (!string.IsNullOrWhiteSpace(fallbackText))
                        {
                            sb.AppendLine(fallbackText);
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
                            ExtractElementsWithSpacing(headerPart.Header, sb);
                        }
                    }
                }

                // 2. Toàn bộ thân văn bản (bao gồm Table 2 cột chứa Quốc hiệu/Cơ quan/Số hiệu)
                var body = wordDoc.MainDocumentPart?.Document?.Body;
                if (body != null)
                {
                    ExtractElementsWithSpacing(body, sb);
                }
            }
            catch
            {
                // Bỏ qua lỗi parsing nếu file word hỏng
            }
            return sb.ToString();
        }

        private static string ExtractTextFromDoc(Stream stream)
        {
            var sb = new StringBuilder();
            try
            {
                byte[] bytes;
                using (var ms = new MemoryStream())
                {
                    if (stream.CanSeek) stream.Seek(0, SeekOrigin.Begin);
                    stream.CopyTo(ms);
                    bytes = ms.ToArray();
                }

                // 1. Quét tìm các chuỗi UTF-16LE liên tục (Word 97-2003 lưu văn bản tiếng Việt Unicode 16-bit)
                var utf16Chars = new List<char>();
                for (int i = 0; i < bytes.Length - 1; i += 2)
                {
                    ushort code = (ushort)(bytes[i] | (bytes[i + 1] << 8));
                    // Chỉ nhận diện các ký tự thuộc bảng chữ cái Latin, Tiếng Việt, dấu câu, số (bỏ qua ký tự CJK/tiếng Trung nhị phân)
                    bool isPrintable = (code >= 32 && code <= 0x024F) || // ASCII + Latin-1 + Latin Extended A/B
                                       (code >= 0x1EA0 && code <= 0x1EF9) || // Vietnamese Unicode Precomposed
                                       (code >= 0x2000 && code <= 0x206F) || // General Punctuation (quotes, dashes, ellipsis)
                                       code == 9 || code == 10 || code == 13;

                    if (isPrintable)
                    {
                        utf16Chars.Add((char)code);
                    }
                    else
                    {
                        if (utf16Chars.Count >= 4)
                        {
                            string segment = new string(utf16Chars.ToArray()).Trim();
                            if (segment.Length >= 4 && segment.Any(char.IsLetterOrDigit))
                            {
                                sb.AppendLine(segment);
                            }
                        }
                        utf16Chars.Clear();
                    }
                }
                if (utf16Chars.Count >= 4)
                {
                    string segment = new string(utf16Chars.ToArray()).Trim();
                    if (segment.Length >= 4 && segment.Any(char.IsLetterOrDigit))
                    {
                        sb.AppendLine(segment);
                    }
                }

                string result = sb.ToString();

                // 2. Nếu UTF-16LE không thu được văn bản có nghĩa (dưới 50 ký tự), thử quét 8-bit ANSI / TCVN3
                if (result.Length < 50)
                {
                    var ansiSb = new StringBuilder();
                    var byteRun = new List<byte>();
                    for (int i = 0; i < bytes.Length; i++)
                    {
                        byte b = bytes[i];
                        if ((b >= 32 && b <= 254) || b == 9 || b == 10 || b == 13)
                        {
                            byteRun.Add(b);
                        }
                        else
                        {
                            if (byteRun.Count >= 5)
                            {
                                string segment = Encoding.GetEncoding("windows-1258").GetString(byteRun.ToArray()).Trim();
                                if (segment.Length >= 5 && segment.Any(char.IsLetterOrDigit))
                                {
                                    ansiSb.AppendLine(segment);
                                }
                            }
                            byteRun.Clear();
                        }
                    }
                    if (ansiSb.Length > result.Length)
                    {
                        result = ansiSb.ToString();
                    }
                }

                return result;
            }
            catch
            {
                return string.Empty;
            }
        }

        private static void ExtractElementsWithSpacing(OpenXmlElement container, StringBuilder sb)
        {
            foreach (var p in container.Descendants<Paragraph>())
            {
                var pSb = new StringBuilder();
                foreach (var child in p.Elements())
                {
                    if (child is Run r)
                    {
                        // Bỏ qua các thành phần đồ họa / Shape / Drawing tránh rác tọa độ VML (center2921000)
                        if (r.Elements<Drawing>().Any() || r.Elements().Any(e => e.LocalName == "pict" || e.LocalName == "shape"))
                        {
                            continue;
                        }

                        foreach (var runChild in r.Elements())
                        {
                            if (runChild is Text t)
                            {
                                string textVal = t.Text;
                                if (!string.IsNullOrEmpty(textVal))
                                {
                                    if (pSb.Length > 0 &&
                                        !char.IsWhiteSpace(pSb[pSb.Length - 1]) &&
                                        !char.IsWhiteSpace(textVal[0]) &&
                                        !IsPunctuationChar(textVal[0]) &&
                                        !IsPunctuationChar(pSb[pSb.Length - 1]))
                                    {
                                        pSb.Append(" ");
                                    }
                                    pSb.Append(textVal);
                                }
                            }
                            else if (runChild is TabChar)
                            {
                                pSb.Append("   ");
                            }
                            else if (runChild is Break)
                            {
                                pSb.Append("\n");
                            }
                        }
                    }
                    else if (child is Break)
                    {
                        pSb.Append("\n");
                    }
                }

                var pText = pSb.ToString().Trim();
                // Tuyệt đối không fallback gọi p.InnerText vì sẽ nuốt toàn bộ tọa độ vector vml
                if (!string.IsNullOrWhiteSpace(pText) && !IsGarbageVmlLine(pText))
                {
                    sb.AppendLine(pText);
                }
            }
        }

        private static bool IsPunctuationChar(char c)
        {
            return c == '.' || c == ',' || c == ';' || c == ':' || c == '/' || c == '-' || c == ')' || c == ']' || c == '(' || c == '[';
        }

        private static bool IsGarbageVmlLine(string text)
        {
            return Regex.IsMatch(text, @"^(?:center\d+|stroke\w*|from\d+|to\d+|strokecolor|fillcolor)", RegexOptions.IgnoreCase);
        }

        public static string NormalizeAdministrativeText(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

            // 1. Chuẩn hóa xuống dòng và ký tự khoảng trắng đặc biệt (NBSP, zero-width space)
            raw = raw.Replace("\r\n", "\n").Replace('\r', '\n');
            raw = raw.Replace('\u00A0', ' ').Replace('\u200B', ' ');

            // 2. Nối từ bị ngắt dòng bởi dấu gạch nối (ví dụ: "nghiệp-\nvụ" -> "nghiệp vụ", "xây-\ndựng" -> "xây dựng")
            raw = Regex.Replace(raw, @"(\p{L}+)\s*-\s*\n\s*(\p{L}+)", "$1 $2");

            // 3. Đảm bảo có ngắt nghỉ giữa các chữ: thêm khoảng trắng sau các dấu ngắt câu (, ; :) nếu bị dính chữ
            raw = Regex.Replace(raw, @"(?<=[a-zA-ZÀ-ỹĐđ])([,;:])(?=[a-zA-ZÀ-ỹĐđ0-9])", "$1 ");
            // Thêm khoảng trắng sau dấu chấm nếu theo sau là chữ cái tiếng Việt (tránh số thập phân và chữ số)
            raw = Regex.Replace(raw, @"(?<=[a-zA-ZÀ-ỹĐđ])(\.)(?=[a-zA-ZÀ-ỹĐđ])", "$1 ");

            // 4. Chuẩn hóa khoảng trắng trong mỗi dòng
            var lines = raw.Split('\n');
            var cleanedLines = new List<string>();
            foreach (var line in lines)
            {
                var cleaned = Regex.Replace(line, @"[ \t]+", " ").Trim();
                cleanedLines.Add(cleaned);
            }

            // 5. Gộp các dòng rỗng liên tiếp
            var result = string.Join("\n", cleanedLines);
            result = Regex.Replace(result, @"\n{3,}", "\n\n");
            return result.Trim();
        }

        private static void ParseAdministrativeCues(string raw, OcrExtractionResult result, string fileName)
        {
            raw = NormalizeAdministrativeText(raw);
            result.ExtractedText = raw;

            string headerArea = raw.Length > 1500 ? raw.Substring(0, 1500) : raw;
            string headerUpper = headerArea.ToUpperInvariant();

            // 1. Phân loại Loại hình văn bản dựa trên Tiêu đề / Phần đầu văn bản
            if (headerUpper.Contains("GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP") ||
                headerUpper.Contains("ĐĂNG KÝ DOANH NGHIỆP") ||
                headerUpper.Contains("ĐĂNG KÝ HOẠT ĐỘNG"))
            {
                result.DocumentCategory = "DANG_KY_DOANH_NGHIEP";
            }
            else if (headerUpper.Contains("CHỦ SỞ HỮU HƯỞNG LỢI") || headerUpper.Contains("HƯỞNG LỢI"))
            {
                result.DocumentCategory = "KE_KHAI_CAM_KET";
            }
            else if (headerUpper.Contains("GIẤY ỦY QUYỀN") || headerUpper.Contains("HỢP ĐỒNG ỦY QUYỀN") || headerUpper.Contains("GIẤY UỶ QUYỀN") || headerUpper.Contains("ỦY QUYỀN") || headerUpper.Contains("UỶ QUYỀN"))
            {
                result.DocumentCategory = "GIAY_UY_QUYEN";
            }
            else if (headerUpper.Contains("ĐƠN KHIẾU NẠI") || headerUpper.Contains("ĐƠN TỐ CÁO") || headerUpper.Contains("ĐƠN KIẾN NGHỊ") || headerUpper.Contains("ĐƠN ĐỀ NGHỊ"))
            {
                result.DocumentCategory = "DON_THU";
            }
            else
            {
                result.DocumentCategory = "CONG_VAN_HANH_CHINH";
            }

            // 2. Nhận diện Mức độ khẩn & Tính hạn SLA
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

            // 3. Nhận diện Số ký hiệu văn bản (chỉ áp dụng cho công văn / quyết định)
            if (result.DocumentCategory == "CONG_VAN_HANH_CHINH")
            {
                result.DetectedCodeNumber = ExtractCodeNumber(raw);
            }
            else
            {
                result.DetectedCodeNumber = "Chưa có số";
            }

            // 4. Nhận diện Ngày tháng năm
            var dateMatch = Regex.Match(raw, @"(?:ngày|ngay)\s+([0-9]{1,2})\s+tháng\s+([0-9]{1,2})\s+năm\s+([0-9]{4})", RegexOptions.IgnoreCase);
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

            // 5. Trích xuất Chủ thể ban hành & Trích yếu theo từng loại hình văn bản
            if (result.DocumentCategory == "GIAY_UY_QUYEN")
            {
                result.SubjectTitle = "Giấy ủy quyền thực hiện thủ tục hành chính";
                var authorizerMatch = Regex.Match(raw, @"(?:BÊN ỦY QUYỀN|NGƯỜI ỦY QUYỀN|Bên A|Tôi là|Họ và tên)[:\s]*([^\r\n,;]+)", RegexOptions.IgnoreCase);
                if (authorizerMatch.Success)
                {
                    result.DetectedIssuer = $"Bên ủy quyền: {authorizerMatch.Groups[1].Value.Trim()}";
                }
                else
                {
                    result.DetectedIssuer = "Người ủy quyền (Cá nhân / Tổ chức)";
                }
                result.RequestedAction = "Ủy quyền đại diện thực hiện nộp hồ sơ, tiếp nhận kết quả và các thủ tục liên quan.";
                result.CoreProblem = "Ủy quyền cá nhân/tổ chức thực hiện thay mặt các thủ tục hành chính theo phạm vi ủy quyền.";
            }
            else if (result.DocumentCategory == "DANG_KY_DOANH_NGHIEP")
            {
                var compMatch = Regex.Match(raw, @"(?:Tên công ty viết bằng tiếng Việt|Tên doanh nghiệp)[:\s]*([^\r\n]+)", RegexOptions.IgnoreCase);
                string compRaw = compMatch.Success ? compMatch.Groups[1].Value : string.Empty;
                compRaw = Regex.Replace(compRaw, @"\((?:ghi bằng|viết bằng)[^\)]*\):?", "").Trim();

                if (!string.IsNullOrWhiteSpace(compRaw) && !compRaw.Contains("……") && !compRaw.Contains("…") && compRaw.Length > 3)
                {
                    result.SubjectTitle = $"Đăng ký thành lập doanh nghiệp: {compRaw}";
                    result.DetectedIssuer = compRaw;
                }
                else
                {
                    var directCompMatch = Regex.Match(raw, @"(CÔNG TY\s+(?:TNHH|CỔ PHẦN|HỢP DANH)[^\r\n\.]+)", RegexOptions.IgnoreCase);
                    if (directCompMatch.Success && !directCompMatch.Groups[1].Value.Contains("……") && !directCompMatch.Groups[1].Value.Contains("…"))
                    {
                        string cName = directCompMatch.Groups[1].Value.Trim();
                        result.SubjectTitle = $"Đăng ký thành lập: {cName}";
                        result.DetectedIssuer = cName;
                    }
                    else
                    {
                        result.SubjectTitle = "Giấy đề nghị đăng ký doanh nghiệp";
                        result.DetectedIssuer = "Người thành lập doanh nghiệp";
                    }
                }
                result.RequestedAction = "Đăng ký thành lập doanh nghiệp mới và cấp Giấy chứng nhận đăng ký doanh nghiệp.";
                result.CoreProblem = $"Đề nghị Phòng Đăng ký kinh doanh tiếp nhận và cấp Giấy chứng nhận đăng ký doanh nghiệp.";
            }
            else if (result.DocumentCategory == "KE_KHAI_CAM_KET")
            {
                result.SubjectTitle = "Kê khai và cam kết về chủ sở hữu hưởng lợi của doanh nghiệp";
                var declarantMatch = Regex.Match(raw, @"(?:Họ và tên người kê khai|Người kê khai|Tôi là)[:\s]*([^\r\n,;]+)", RegexOptions.IgnoreCase);
                if (declarantMatch.Success && !declarantMatch.Groups[1].Value.Contains("……") && !declarantMatch.Groups[1].Value.Contains("…") && declarantMatch.Groups[1].Value.Trim().Length > 2)
                {
                    result.DetectedIssuer = $"Người kê khai: {declarantMatch.Groups[1].Value.Trim()}";
                }
                else
                {
                    result.DetectedIssuer = "Người kê khai chủ sở hữu hưởng lợi";
                }
                result.RequestedAction = "Kê khai thông tin chủ sở hữu hưởng lợi theo quy định đăng ký doanh nghiệp.";
                result.CoreProblem = "Kê khai danh tính và tỷ lệ lợi ích của chủ sở hữu hưởng lợi trong doanh nghiệp.";
            }
            else
            {
                // Công văn / Tờ trình hành chính
                var issuerMatch = Regex.Match(headerArea, @"((?:ỦY BAN NHÂN DÂN|SỞ|BỘ|VĂN PHÒNG|BAN QUẢN LÝ|CÔNG TY)[^\r\n,;]+)", RegexOptions.IgnoreCase);
                if (issuerMatch.Success)
                {
                    result.DetectedIssuer = CleanIssuer(issuerMatch.Groups[1].Value);
                }
                else
                {
                    result.DetectedIssuer = "Cơ quan hành chính nhà nước";
                }

                var subjectMatch = Regex.Match(headerArea, @"(?:V/v|về việc|N/v|V/V)\s*([^\r\n]+)", RegexOptions.IgnoreCase);
                if (subjectMatch.Success)
                {
                    result.SubjectTitle = subjectMatch.Groups[1].Value.Trim();
                }
                else
                {
                    var titleDocMatch = Regex.Match(headerArea, @"(TỜ TRÌNH|BÁO CÁO|CÔNG VĂN|ĐƠN KHIẾU NẠI)\s*([^\r\n]*)", RegexOptions.IgnoreCase);
                    if (titleDocMatch.Success)
                    {
                        result.SubjectTitle = titleDocMatch.Value.Trim();
                    }
                    else
                    {
                        result.SubjectTitle = $"Xử lý văn bản {result.DetectedCodeNumber}";
                    }
                }

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

            // 8. Nhận diện Người ký và Chức vụ (Thường nằm ở cuối văn bản)
            var signerMatches = Regex.Matches(raw, @"^\s*(?:KT\.\s*|TM\.\s*)?(?:CHỦ TỊCH|GIÁM ĐỐC|CHÁNH VĂN PHÒNG|PHÓ CHỦ TỊCH|PHÓ GIÁM ĐỐC|TRƯỞNG PHÒNG)\b[^\r\n]*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            if (signerMatches.Count > 0)
            {
                var signerMatch = signerMatches[signerMatches.Count - 1];
                result.SignerTitle = signerMatch.Value.Trim();

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
