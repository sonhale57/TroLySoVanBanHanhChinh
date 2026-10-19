using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace GovDoc.Infrastructure.Services
{
    /// <summary>
    /// Bộ chuyển đổi mã hóa phông chữ tiếng Việt (TCVN3/ABC, VNI-Windows) sang Unicode dựng sẵn (UTF-8)
    /// và kiểm tra độ toàn vẹn, tính đọc được của văn bản bóc tách.
    /// </summary>
    public static class VietnameseFontConverter
    {
        // Bảng ánh xạ TCVN3 (1-byte char) sang Unicode
        private static readonly Dictionary<char, char> Tcvn3ToUnicodeMap = new()
        {
            { '\u00B8', 'á' }, { '\u00B5', 'à' }, { '\u00B6', 'ả' }, { '\u00B7', 'ã' }, { '\u00B9', 'ạ' },
            { '\u00A8', 'ă' }, { '\u00BE', 'ắ' }, { '\u00BB', 'ằ' }, { '\u00BC', 'ẳ' }, { '\u00BD', 'ẵ' }, { '\u00C6', 'ặ' },
            { '\u00A9', 'â' }, { '\u00CA', 'ấ' }, { '\u00C7', 'ầ' }, { '\u00C8', 'ẩ' }, { '\u00C9', 'ẫ' }, { '\u00CB', 'ậ' },
            { '\u00D0', 'é' }, { '\u00CC', 'è' }, { '\u00CE', 'ẻ' }, { '\u00CF', 'ẽ' }, { '\u00D1', 'ẹ' },
            { '\u00AA', 'ê' }, { '\u00D5', 'ế' }, { '\u00D2', 'ề' }, { '\u00D3', 'ể' }, { '\u00D4', 'ễ' }, { '\u00D6', 'ệ' },
            { '\u00DD', 'í' }, { '\u00D7', 'ì' }, { '\u00D8', 'ỉ' }, { '\u00DC', 'ĩ' }, { '\u00DE', 'ị' },
            { '\u00DF', 'ó' }, { '\u00E1', 'ò' }, { '\u00E2', 'ỏ' }, { '\u00E3', 'õ' }, { '\u00E4', 'ọ' },
            { '\u00AB', 'ô' }, { '\u00E8', 'ố' }, { '\u00E5', 'ồ' }, { '\u00E6', 'ổ' }, { '\u00E7', 'ỗ' }, { '\u00E9', 'ộ' },
            { '\u00AC', 'ơ' }, { '\u00ED', 'ớ' }, { '\u00EA', 'ờ' }, { '\u00EB', 'ở' }, { '\u00EC', 'ỡ' }, { '\u00EE', 'ợ' },
            { '\u00F3', 'ú' }, { '\u00EF', 'ù' }, { '\u00F1', 'ủ' }, { '\u00F2', 'ũ' }, { '\u00F4', 'ụ' },
            { '\u00AD', 'ư' }, { '\u00F8', 'ứ' }, { '\u00F5', 'ừ' }, { '\u00F6', 'ử' }, { '\u00F7', 'ữ' }, { '\u00F9', 'ự' },
            { '\u00FD', 'ý' }, { '\u00FA', 'ỳ' }, { '\u00FB', 'ỷ' }, { '\u00FC', 'ỹ' }, { '\u00FE', 'ỵ' },
            { '\u00AE', 'đ' }, { '\u00A7', 'Đ' }
        };

        // Ký tự chỉ có trong bảng mã TCVN3 (không bao giờ xuất hiện trong văn bản tiếng Việt Unicode chuẩn)
        private static readonly HashSet<char> ExclusiveTcvn3Markers = new()
        {
            '\u00A7', // Đ (section sign)
            '\u00AE', // đ (registered sign)
            '\u00B8', // á (cedilla)
            '\u00B5', // à (micro sign)
            '\u00B6', // ả (pilcrow)
            '\u00B7', // ã (middle dot)
            '\u00B9', // ạ (superscript 1)
            '\u00A8', // ă (diaeresis)
            '\u00A9', // â (copyright)
            '\u00AA', // ê (feminine ordinal)
            '\u00AB', // ô (left-pointing double angle)
            '\u00AC', // ơ (not sign)
            '\u00AD'  // ư (soft hyphen)
        };

        /// <summary>
        /// Tự động phát hiện và chuyển đổi chuỗi văn bản nếu chứa mã hóa TCVN3 sang Unicode chuẩn
        /// </summary>
        public static string ConvertTcvn3ToUnicode(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;

            // Nếu văn bản đã chứa các ký tự Unicode tiếng Việt mở rộng (1EA0-1EF9 hoặc Đ/đ), thì chắc chắn đã là Unicode chuẩn!
            bool alreadyUnicode = input.Any(c => (c >= 0x1EA0 && c <= 0x1EF9) || c == '\u0110' || c == '\u0111');
            if (alreadyUnicode)
            {
                return input;
            }

            // Chỉ kích hoạt nếu có các ký tự đặc trưng riêng biệt của TCVN3
            int exclusiveMarkers = input.Count(c => ExclusiveTcvn3Markers.Contains(c));
            if (exclusiveMarkers < 2)
            {
                return input; // Không phải văn bản TCVN3
            }

            var sb = new StringBuilder(input.Length);
            foreach (char c in input)
            {
                if (Tcvn3ToUnicodeMap.TryGetValue(c, out char uniChar))
                {
                    sb.Append(uniChar);
                }
                else
                {
                    sb.Append(c);
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Kiểm tra tính toàn vẹn và mức độ lỗi font / lỗi nhị phân của văn bản
        /// </summary>
        public static (bool IsCorrupted, string Reason) DetectCorruptionOrEncodingError(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return (true, "Tệp tài liệu hoàn toàn trống hoặc không chứa lớp văn bản.");
            }

            string trimmed = text.Trim();
            if (trimmed.Length < 15)
            {
                return (true, "Nội dung văn bản quá ngắn (dưới 15 ký tự), không đủ cấu trúc để thẩm định.");
            }

            // Đếm ký tự nhị phân / không in được / ký tự lỗi thay thế UTF-8
            int nullBytes = text.Count(c => c == '\0');
            int replacementChars = text.Count(c => c == '\uFFFD');
            int controlChars = text.Count(c => c < 32 && c != '\r' && c != '\n' && c != '\t');

            if (nullBytes > 5 || replacementChars > 5)
            {
                return (true, "Văn bản bị lỗi mã hóa font hoặc chứa dữ liệu nhị phân không thể giải mã (chứa ký tự null/replacement).");
            }

            int letterOrDigit = text.Count(c => char.IsLetterOrDigit(c));
            double readabilityRatio = (double)letterOrDigit / text.Length;

            if (readabilityRatio < 0.35 && text.Length > 50)
            {
                return (true, "Tệp tài liệu có tỷ lệ chữ cái đọc được quá thấp (< 35%), nghi ngờ tệp bị mã hóa hỏng hoặc lỗi font nhị phân.");
            }

            return (false, string.Empty);
        }
    }
}
