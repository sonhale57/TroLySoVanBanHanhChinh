using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class AdaptiveOcrSpatialSlicingTests
    {
        private readonly OcrService _ocrService;

        public AdaptiveOcrSpatialSlicingTests()
        {
            _ocrService = new OcrService();
        }

        [Fact]
        public async Task ExtractDocumentText_DocxWithTwoColumnHeaderTable_ShouldExtractLeftThenRightColumn()
        {
            // Arrange: create an in-memory Docx with a 2-cell table header (Decree 30 layout)
            using var ms = new MemoryStream();
            using (var wordDoc = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document, true))
            {
                var mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                var body = new Body();

                // 2-column header table
                var table = new Table();
                var row = new TableRow();

                var cellLeft = new TableCell(
                    new Paragraph(new Run(new Text("UBND TỈNH ĐỒNG NAI"))),
                    new Paragraph(new Run(new Text("SỞ TƯ PHÁP"))),
                    new Paragraph(new Run(new Text("Số: 145/STP-HCTP")))
                );

                var cellRight = new TableCell(
                    new Paragraph(new Run(new Text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"))),
                    new Paragraph(new Run(new Text("Độc lập - Tự do - Hạnh phúc"))),
                    new Paragraph(new Run(new Text("Đồng Nai, ngày 20 tháng 10 năm 2026")))
                );

                row.Append(cellLeft, cellRight);
                table.Append(row);
                body.Append(table);

                // Body text
                body.Append(
                    new Paragraph(new Run(new Text("V/v: Tham mưu phương án xử lý hồ sơ hành chính"))),
                    new Paragraph(new Run(new Text("Kính gửi: Ủy ban nhân dân tỉnh Đồng Nai."))),
                    new Paragraph(new Run(new Text("Căn cứ Luật Tổ chức chính quyền địa phương năm 2015...")))
                );

                mainPart.Document.Append(body);
                mainPart.Document.Save();
            }

            ms.Position = 0;

            // Act
            var result = await _ocrService.ExtractDocumentTextAsync(ms, "CongVan145.docx");

            // Assert
            Assert.NotNull(result);
            Assert.False(string.IsNullOrWhiteSpace(result.ExtractedText));

            // Verify Left Column extracted cleanly before Right Column
            int idxLeftAgency = result.ExtractedText.IndexOf("SỞ TƯ PHÁP", StringComparison.OrdinalIgnoreCase);
            int idxRightMotto = result.ExtractedText.IndexOf("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", StringComparison.OrdinalIgnoreCase);
            int idxBody = result.ExtractedText.IndexOf("Tham mưu phương án xử lý", StringComparison.OrdinalIgnoreCase);

            Assert.True(idxLeftAgency >= 0, "Left agency must be found");
            Assert.True(idxRightMotto >= 0, "Right motto must be found");
            Assert.True(idxLeftAgency < idxRightMotto, "Left cell content must appear before right cell content in sequential flow");
            Assert.True(idxRightMotto < idxBody, "Header content must appear before body paragraph content");
        }

        [Fact]
        public async Task ExtractDocumentText_TxtFile_ShouldExtractCleanUtf8()
        {
            // Arrange
            string sample = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\nSố: 99/UBND-VP\nVề việc tiếp nhận xử lý văn bản công vụ.";
            using var ms = new MemoryStream(Encoding.UTF8.GetBytes(sample));

            // Act
            var result = await _ocrService.ExtractDocumentTextAsync(ms, "Sample.txt");

            // Assert
            Assert.NotNull(result);
            Assert.Contains("99/UBND-VP", result.ExtractedText);
            Assert.Contains("Độc lập - Tự do - Hạnh phúc", result.ExtractedText);
        }

        [Fact]
        public void VietnameseFontConverter_Tcvn3Conversion_ShouldConvertAccurately()
        {
            // Arrange: "céng hoµ" in TCVN3 is "cộng hoà"
            string tcvn3 = "Céng hoµ x· héi chñ nghÜa ViÖt Nam";

            // Act
            string unicode = VietnameseFontConverter.ConvertTcvn3ToUnicode(tcvn3);

            // Assert
            Assert.Contains("Việt Nam", unicode);
            Assert.Contains("Cộng hoà", unicode);
        }
    }
}
