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
    }
}
