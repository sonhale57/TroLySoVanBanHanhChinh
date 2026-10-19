using System;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Infrastructure.WordEngine;
using Xunit;

namespace GovDoc.Tests
{
    public class Decree30DocxBuilderTests
    {
        [Fact]
        public void GenerateOfficialDispatch_ShouldCreateValidDocx_WithExactDecree30Margins()
        {
            // Arrange
            var model = new OfficialDispatchDraftModel
            {
                IssuerParent = "ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG",
                IssuerName = "VĂN PHÒNG",
                DocCode = "142/VP-KT",
                Location = "Bình Dương",
                DocDateStr = "12 tháng 10 năm 2026",
                SubjectTitle = "Gia hạn tiến độ dự án Cụm công nghiệp X",
                RecipientMain = "Sở Kế hoạch và Đầu tư tỉnh Bình Dương",
                LegalBases = new() { "Nghị định số 123/2026/NĐ-CP ngày 15/01/2026 của Chính phủ" },
                ContentParagraphs = new() { "Chấp thuận gia hạn tiến độ thực hiện dự án thêm 06 tháng." },
                RecipientsList = new() { "Như trên", "Chủ tịch UBND tỉnh", "Lưu: VT" },
                SignerTitle = "CHÁNH VĂN PHÒNG",
                SignerName = "Nguyễn Văn An"
            };

            var builder = new Decree30DocxBuilder();

            // Act
            byte[] docxBytes = builder.GenerateOfficialDispatch(model);

            // Assert
            Assert.NotNull(docxBytes);
            Assert.True(docxBytes.Length > 0);

            // Validate OpenXML structure and Page Setup margins
            using var stream = new MemoryStream(docxBytes);
            using var wordDoc = WordprocessingDocument.Open(stream, false);

            Assert.NotNull(wordDoc.MainDocumentPart);
            Assert.NotNull(wordDoc.MainDocumentPart.Document);
            var body = wordDoc.MainDocumentPart.Document.Body;
            Assert.NotNull(body);

            var sectionProps = body!.Elements<SectionProperties>().LastOrDefault();
            Assert.NotNull(sectionProps);

            var pageMargin = sectionProps.Elements<PageMargin>().FirstOrDefault();
            Assert.NotNull(pageMargin);

            // Căn lề chuẩn Nghị định 30:
            // Top: 20mm = 1134 dxa
            // Bottom: 20mm = 1134 dxa
            // Left: 30mm = 1701 dxa
            // Right: 15mm = 850 dxa
            Assert.Equal(1134, (int)pageMargin.Top!.Value);
            Assert.Equal(1134, (int)pageMargin.Bottom!.Value);
            Assert.Equal(1701, (int)pageMargin.Left!.Value);
            Assert.Equal(850, (int)pageMargin.Right!.Value);

            // Validate tables (Header table and Footer table)
            var tables = body.Elements<Table>().ToList();
            Assert.True(tables.Count >= 2, "Văn bản phải có bảng tiêu ngữ và bảng chân trang");

            // Validate no table borders
            var headerTable = tables[0];
            var borders = headerTable.GetFirstChild<TableProperties>()?.GetFirstChild<TableBorders>();
            Assert.NotNull(borders);
            Assert.Equal(BorderValues.None, borders.TopBorder?.Val?.Value);
            Assert.Equal(BorderValues.None, borders.LeftBorder?.Val?.Value);
        }

        [Fact]
        public void GenerateOfficialDispatch_CustomProvinceHanoi_ShouldNotContainBinhDuong()
        {
            // Arrange
            var model = new OfficialDispatchDraftModel
            {
                IssuerParent = "ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI",
                IssuerName = "VĂN PHÒNG",
                DocCode = "105/VP-UBND",
                Location = "Hà Nội",
                DocDateStr = "16 tháng 10 năm 2026",
                SubjectTitle = "Phúc đáp văn bản về quy hoạch chi tiết",
                RecipientMain = "Sở Quy hoạch - Kiến trúc Hà Nội",
                LegalBases = new() { "Luật Thủ đô ngày 28/06/2024" },
                ContentParagraphs = new() { "UBND thành phố chấp thuận phương án theo đề xuất." },
                RecipientsList = new() { "Như trên", "Chủ tịch UBND TP", "Lưu: VT" },
                SignerTitle = "CHÁNH VĂN PHÒNG",
                SignerName = "Trần Thị Mai"
            };

            var builder = new Decree30DocxBuilder();

            // Act
            byte[] docxBytes = builder.GenerateOfficialDispatch(model);

            // Assert
            using var stream = new MemoryStream(docxBytes);
            using var wordDoc = WordprocessingDocument.Open(stream, false);
            var fullDocxText = wordDoc.MainDocumentPart?.Document.Body?.InnerText ?? string.Empty;

            Assert.DoesNotContain("Bình Dương", fullDocxText);
            Assert.Contains("HÀ NỘI", fullDocxText);
            Assert.Contains("Trần Thị Mai", fullDocxText);
            Assert.Contains("105/VP-UBND", fullDocxText);
        }
    }
}
