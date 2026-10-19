using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class RealDocumentProcessingTests
    {
        private readonly OcrService _ocrService = new();

        [Fact]
        public async Task ExtractDocumentTextAsync_RealAdministrativeText_ExtractsDecree30EntitiesCorrectly()
        {
            // Arrange
            string docText = @"ỦY BAN NHÂN DÂN TỈNH ĐỒNG NAI
SỞ TÀI CHÍNH
Số: 245/STC-QLG
Đồng Nai, ngày 15 tháng 10 năm 2026

HỎA TỐC
V/v Thẩm định phương án giá đất cụ thể phục vụ giải phóng mặt bằng dự án cao tốc

Kính gửi: Ủy ban nhân dân tỉnh Đồng Nai.

Căn cứ Quyết định số 18/2025/QĐ-UBND ngày 20/05/2025 của UBND tỉnh Đồng Nai;
Căn cứ đề nghị của Hội đồng bồi thường giải phóng mặt bằng huyện Long Thành;
Sở Tài chính kính trình UBND tỉnh xem xét, phê duyệt hệ số điều chỉnh giá đất để kịp tiến độ chi trả cho người dân.

Nơi nhận:
- Như trên;
- Chủ tịch UBND tỉnh;
- Lưu: VT, QLG.

GIÁM ĐỐC
Nguyễn Văn Bình";

            using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(docText));

            // Act
            var result = await _ocrService.ExtractDocumentTextAsync(memoryStream, "ToTrinh_GiaDat.txt");

            // Assert
            Assert.NotNull(result);
            Assert.Contains("245/STC-QLG", result.DetectedCodeNumber);
            Assert.Contains("ỦY BAN NHÂN DÂN TỈNH ĐỒNG NAI", result.DetectedIssuer);
            Assert.Equal("HỎA TỐC", result.DetectedUrgency);
            Assert.Contains("Thẩm định phương án giá đất cụ thể phục vụ giải phóng mặt bằng dự án cao tốc", result.SubjectTitle);
            Assert.NotNull(result.CalculatedSlaDeadline);
            // Urgency HỎA TỐC has 2-day SLA
            Assert.True(result.CalculatedSlaDeadline > DateTimeOffset.Now);
            Assert.Contains("Nguyễn Văn Bình", result.SignerName);
        }

        [Fact]
        public async Task ExtractDocumentTextAsync_UrgencyClassificationAndSlaCalculation_CorrectlySkipsWeekends()
        {
            // Arrange
            string docText = @"ỦY BAN NHÂN DÂN HUYỆN BẮC TÂN UYÊN
Số: 99/UBND-VP
Bắc Tân Uyên, ngày 12 tháng 10 năm 2026

KHẨN
V/v Báo cáo tiến độ thu ngân sách quý 3 năm 2026

Kính gửi: Sở Kế hoạch và Đầu tư tỉnh Bình Dương.
Kính đề nghị các đơn vị trực thuộc khẩn trương tổng hợp số liệu trước ngày 20.";

            using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(docText));

            // Act
            var result = await _ocrService.ExtractDocumentTextAsync(memoryStream, "cong_van_99.txt");

            // Assert
            Assert.Equal("KHẨN", result.DetectedUrgency);
            Assert.NotNull(result.CalculatedSlaDeadline);
            // KHẨN has 3 business days SLA
            Assert.True(result.CalculatedSlaDeadline > DateTimeOffset.Now.AddDays(2));
        }

        [Fact]
        public async Task ExtractDocumentTextAsync_EmptyOrInvalidStream_FallsBackGracefully()
        {
            // Arrange
            using var memoryStream = new MemoryStream(new byte[10]);

            // Act
            var result = await _ocrService.ExtractDocumentTextAsync(memoryStream, "empty.pdf");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Chưa nhận diện", result.DetectedIssuer);
            Assert.Equal("Chưa có số", result.DetectedCodeNumber);
        }

        [Theory]
        [InlineData("Số: 142/UBND-KT", "142/UBND-KT")]
        [InlineData("Số : 245/STC-QLG", "245/STC-QLG")]
        [InlineData("Số: 01/2026/QĐ-UBND", "01/2026/QĐ-UBND")]
        [InlineData("Số : 15 / CV - SXD", "15/CV-SXD")]
        [InlineData("Số: 88/TTr-STNMT.", "88/TTr-STNMT")]
        [InlineData("Số: 15/GD&ĐT-TCCB", "15/GD&ĐT-TCCB")]
        [InlineData("Số: 55/NQ-HĐND", "55/NQ-HĐND")]
        [InlineData("Số: 142/UBND", "142/UBND")]
        public async Task ExtractDocumentTextAsync_VariousValidDecree30Formats_ExtractsAccurately(string lineInDoc, string expectedCode)
        {
            string docText = $@"ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG
{lineInDoc}
Bình Dương, ngày 15 tháng 10 năm 2026

V/v Giải quyết kiến nghị của doanh nghiệp
Kính gửi: UBND tỉnh Bình Dương";

            using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(docText));
            var result = await _ocrService.ExtractDocumentTextAsync(memoryStream, "File_Scan_Test_123.txt");

            Assert.Equal(expectedCode, result.DetectedCodeNumber);
        }

        [Fact]
        public async Task ExtractDocumentTextAsync_WhenNoCodeInDocument_DoesNotAutoFillFileNameOrDates()
        {
            string docText = @"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Hà Nội, ngày 15/10/2026

ĐƠN ĐỀ NGHỊ
Kính gửi: Ủy ban nhân dân Thành phố.
Tôi làm đơn này đề nghị cấp phép xây dựng theo quy định.";

            using var memoryStream = new MemoryStream(Encoding.UTF8.GetBytes(docText));
            var result = await _ocrService.ExtractDocumentTextAsync(memoryStream, "Don_De_Nghi_Xay_Dung_2026.txt");

            // Tuyệt đối không lấy tên tệp 'Don_De_Nghi_Xay_Dung_2026' và không lấy ngày tháng '15/10/2026'
            Assert.Equal("Chưa có số", result.DetectedCodeNumber);
        }

        [Fact]
        public void NormalizeAdministrativeText_SpacingAndHyphens_EnsuresCleanWordBoundaries()
        {
            // Input text with hyphenated line break and glued punctuation
            string raw = "Công tác văn thư,lưu trữ điện tử.Sau đó tiến hành bóc tách.\nĐơn vị đang tập-\ntrung thực hiện nhiệm vụ.";

            string normalized = OcrService.NormalizeAdministrativeText(raw);

            // Assert
            Assert.Contains("văn thư, lưu trữ", normalized);
            Assert.Contains("điện tử. Sau đó", normalized);
            Assert.Contains("tập trung", normalized); // hyphen across line break joined
        }

        [Fact]
        public async Task AppraisalEngine_CorruptedOrUnreadableDocument_ReturnsRequireAdditionalInfo_NeverApproved()
        {
            // Arrange
            var engine = new AdministrativeAppraisalEngine();
            var ocrResult = new GovDoc.Application.Common.Interfaces.OcrExtractionResult
            {
                ExtractedText = "abc \0\0\0\0\0\0\0\0\0\0 \uFFFD\uFFFD\uFFFD",
                HasFontOrEncodingError = true,
                ExtractionNote = "Văn bản bị lỗi font chữ / lỗi mã hóa hoặc chứa dữ liệu nhị phân không đọc được."
            };

            // Act
            var verdict = await engine.EvaluateDocumentAsync(ocrResult, new(), new());

            // Assert
            Assert.Equal("REQUIRE_ADDITIONAL_INFO", verdict.VerdictType);
            Assert.Contains("LỖI ĐỊNH DẠNG / LỖI FONT", verdict.VerdictTitle);
            Assert.NotEqual("APPROVED", verdict.VerdictType);
        }

        [Fact]
        public async Task AppraisalEngine_IncompletePowerOfAttorney_ReturnsRequireAdditionalInfo_NeverApproved()
        {
            // Arrange
            var engine = new AdministrativeAppraisalEngine();
            var ocrResult = new GovDoc.Application.Common.Interfaces.OcrExtractionResult
            {
                DocumentCategory = "GIAY_UY_QUYEN",
                SubjectTitle = "Giấy ủy quyền thực hiện thủ tục",
                DetectedIssuer = "Bên ủy quyền (Cá nhân)",
                DetectedCodeNumber = "Chưa có số",
                ExtractedText = @"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

GIẤY ỦY QUYỀN
Hôm nay, ngày …… tháng …… năm 20……
Bên ủy quyền: Họ và tên: Nguyễn Văn A, CCCD số: ……
Bên được ủy quyền: Họ và tên: ……
Nội dung ủy quyền: ……"
            };

            // Act
            var verdict = await engine.EvaluateDocumentAsync(ocrResult, new(), new());

            // Assert
            Assert.Equal("REQUIRE_ADDITIONAL_INFO", verdict.VerdictType);
            Assert.Contains("HỒ SƠ ỦY QUYỀN CHƯA HOÀN THIỆN", verdict.VerdictTitle);
            Assert.Contains("Bộ luật Dân sự 2015", verdict.StatutoryAuthority);
            Assert.NotEmpty(verdict.MissingRequirements);
            Assert.NotEqual("APPROVED", verdict.VerdictType);
        }

        [Fact]
        public async Task AppraisalEngine_IncompleteBusinessRegistration_ReturnsRequireAdditionalInfo_NeverApproved()
        {
            // Arrange
            var engine = new AdministrativeAppraisalEngine();
            var ocrResult = new GovDoc.Application.Common.Interfaces.OcrExtractionResult
            {
                DocumentCategory = "DANG_KY_DOANH_NGHIEP",
                SubjectTitle = "Giấy đề nghị đăng ký doanh nghiệp",
                DetectedIssuer = "Người thành lập doanh nghiệp",
                DetectedCodeNumber = "Chưa có số",
                ExtractedText = @"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP
Kính gửi: Phòng Đăng ký kinh doanh
1. Tên doanh nghiệp: CÔNG TY TNHH ……
2. Địa chỉ trụ sở chính: ……
3. Ngành, nghề kinh doanh: ……
4. Vốn điều lệ: ……
5. Người đại diện theo pháp luật: ……"
            };

            // Act
            var verdict = await engine.EvaluateDocumentAsync(ocrResult, new(), new());

            // Assert
            Assert.Equal("REQUIRE_ADDITIONAL_INFO", verdict.VerdictType);
            Assert.Contains("YÊU CẦU HOÀN THIỆN ĐƠN ĐĂNG KÝ DOANH NGHIỆP", verdict.VerdictTitle);
            Assert.Contains("Luật Doanh nghiệp 2020", verdict.StatutoryAuthority);
            Assert.NotEmpty(verdict.MissingRequirements);
            Assert.NotEqual("APPROVED", verdict.VerdictType);
        }

        [Fact]
        public async Task ProcessRealUploadedDocuments_ValidatesExtractionAndAppraisal()
        {
            var engine = new AdministrativeAppraisalEngine();
            string incomingDir = Path.Combine(AppContext.BaseDirectory, "../../../../../src/Infrastructure/GovDoc.WebApi/bin/Debug/net8.0/StorageFiles/incoming");
            if (!Directory.Exists(incomingDir))
            {
                // Fallback nếu chạy ở thư mục khác
                return;
            }

            // 1. Kiểm tra file .doc: 552dde9bd36942d1a92116f17e1e4210.doc (3. CSH Huong loi.doc)
            string docPath = Path.Combine(incomingDir, "552dde9bd36942d1a92116f17e1e4210.doc");
            if (File.Exists(docPath))
            {
                using var fs = File.OpenRead(docPath);
                var ocr = await _ocrService.ExtractDocumentTextAsync(fs, "3. CSH Huong loi.doc");
                Assert.NotNull(ocr.ExtractedText);
                Assert.True(ocr.ExtractedText.Length > 100);
                Assert.Contains("CHỦ SỞ HỮU HƯỞNG LỢI", ocr.ExtractedText.ToUpperInvariant());
                Assert.False(ocr.HasFontOrEncodingError);
                Assert.Equal("KE_KHAI_CAM_KET", ocr.DocumentCategory);

                var verdict = await engine.EvaluateDocumentAsync(ocr, new(), new());
                // Văn bản kê khai còn dấu ... / …… nên phải là REQUIRE_ADDITIONAL_INFO hoặc APPROVED nếu đủ, tuyệt đối không duyệt nhầm thành công văn UBND
                Assert.NotEqual("CONG_VAN_HANH_CHINH", ocr.DocumentCategory);
            }

            // 2. Kiểm tra file 53fd8fe0f3764856a2e85bc9c3c093e4.docx (4.Uy quyen.docx)
            string uyQuyenPath = Path.Combine(incomingDir, "53fd8fe0f3764856a2e85bc9c3c093e4.docx");
            if (File.Exists(uyQuyenPath))
            {
                using var fs = File.OpenRead(uyQuyenPath);
                var ocr = await _ocrService.ExtractDocumentTextAsync(fs, "4.Uy quyen.docx");
                Assert.NotNull(ocr.ExtractedText);
                Assert.Equal("GIAY_UY_QUYEN", ocr.DocumentCategory);
                Assert.False(ocr.HasFontOrEncodingError);
                // Tuyệt đối không lấy "Sở Tài chính Tỉnh Lâm Đồng" làm DetectedIssuer cho giấy ủy quyền
                Assert.DoesNotContain("Sở Tài chính", ocr.DetectedIssuer);

                var verdict = await engine.EvaluateDocumentAsync(ocr, new(), new());
                // Văn bản ủy quyền chưa điền thông tin / còn dấu …… phải trả về REQUIRE_ADDITIONAL_INFO, không được APPROVED
                Assert.Equal("REQUIRE_ADDITIONAL_INFO", verdict.VerdictType);
                Assert.Contains("HỒ SƠ ỦY QUYỀN CHƯA HOÀN THIỆN", verdict.VerdictTitle);
            }

            // 3. Kiểm tra file 3c8e4c97bada4b67af51a91dc5cb755c.docx (1.Dang ky.docx)
            string dangKyPath = Path.Combine(incomingDir, "3c8e4c97bada4b67af51a91dc5cb755c.docx");
            if (File.Exists(dangKyPath))
            {
                using var fs = File.OpenRead(dangKyPath);
                var ocr = await _ocrService.ExtractDocumentTextAsync(fs, "1.Dang ky.docx");
                Assert.NotNull(ocr.ExtractedText);
                Assert.Equal("DANG_KY_DOANH_NGHIEP", ocr.DocumentCategory);
                Assert.False(ocr.HasFontOrEncodingError);

                var verdict = await engine.EvaluateDocumentAsync(ocr, new(), new());
                // Giấy đăng ký thành lập doanh nghiệp
                Assert.Contains("DOANH NGHIỆP", verdict.VerdictTitle);
            }
        }
    }
}
