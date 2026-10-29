using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class Decree30ExcelExportTests
    {
        private readonly Decree30ExcelExportService _exportService;

        public Decree30ExcelExportTests()
        {
            _exportService = new Decree30ExcelExportService();
        }

        [Fact]
        public void GenerateDocumentLogbookExcel_WithRecords_ShouldCreateValidSpreadsheet()
        {
            // Arrange
            var records = new List<ProcessedRecordListItemDto>
            {
                new ProcessedRecordListItemDto
                {
                    Id = Guid.NewGuid(),
                    ReceivedDate = new DateTimeOffset(2026, 4, 15, 8, 30, 0, TimeSpan.FromHours(7)),
                    IncomingDocCode = "45/UBND-VP",
                    IncomingIssuer = "UBND Tỉnh Đồng Nai",
                    SubjectTitle = "V/v phê duyệt đề án chuyển đổi số công tác văn thư lưu trữ",
                    UrgencyLevel = "THUONG",
                    UserName = "Nguyễn Văn A",
                    Department = "Phòng Hành chính - Tư pháp",
                    SlaDeadline = new DateTimeOffset(2026, 4, 25, 17, 0, 0, TimeSpan.FromHours(7)),
                    CurrentStatus = DocumentCurrentStatus.DaXuLy,
                    SignedDate = null
                },
                new ProcessedRecordListItemDto
                {
                    Id = Guid.NewGuid(),
                    ReceivedDate = new DateTimeOffset(2026, 4, 16, 9, 15, 0, TimeSpan.FromHours(7)),
                    IncomingDocCode = "88/STP-VB",
                    IncomingIssuer = "Sở Tư pháp",
                    SubjectTitle = "Báo cáo rà soát văn bản quy phạm pháp luật quý 1",
                    UrgencyLevel = "HOA_TOC",
                    UserName = "Trần Thị B",
                    Department = "Phòng Tư pháp",
                    SlaDeadline = new DateTimeOffset(2026, 4, 18, 17, 0, 0, TimeSpan.FromHours(7)),
                    CurrentStatus = DocumentCurrentStatus.DaKy,
                    SignedDate = new DateTimeOffset(2026, 4, 18, 11, 0, 0, TimeSpan.FromHours(7))
                }
            };

            // Act
            byte[] excelBytes = _exportService.GenerateDocumentLogbookExcel(records, "ỦY BAN NHÂN DÂN HUYỆN LONG THÀNH");

            // Assert
            Assert.NotNull(excelBytes);
            Assert.True(excelBytes.Length > 0, "Excel output bytes must not be empty");

            using var ms = new MemoryStream(excelBytes);
            using var doc = SpreadsheetDocument.Open(ms, false);

            Assert.NotNull(doc.WorkbookPart);
            Assert.NotNull(doc.WorkbookPart.Workbook);

            var sheets = doc.WorkbookPart.Workbook.Sheets?.Elements<Sheet>().ToList();
            Assert.NotNull(sheets);
            Assert.Single(sheets);
            Assert.Equal("SoTheoDoiVanBan", sheets[0].Name?.Value);

            var worksheetPart = (WorksheetPart)doc.WorkbookPart.GetPartById(sheets[0].Id!);
            var rows = worksheetPart.Worksheet.Elements<SheetData>().First().Elements<Row>().ToList();

            // Row 1: Agency Title
            var row1Cells = rows[0].Elements<Cell>().ToList();
            Assert.Equal("ỦY BAN NHÂN DÂN HUYỆN LONG THÀNH", row1Cells[0].CellValue?.Text);

            // Row 5: 11 Decree 30 Headers
            var headerCells = rows[4].Elements<Cell>().Select(c => c.CellValue?.Text).ToList();
            Assert.Equal(11, headerCells.Count);
            Assert.Contains("STT", headerCells);
            Assert.Contains("Ngày tiếp nhận", headerCells);
            Assert.Contains("Số / Ký hiệu đến", headerCells);
            Assert.Contains("Cơ quan ban hành", headerCells);
            Assert.Contains("Trích yếu nội dung", headerCells);
            Assert.Contains("Độ khẩn", headerCells);
            Assert.Contains("Trạng thái", headerCells);
            Assert.Contains("Ngày ký duyệt", headerCells);

            // Data Rows: 2 records
            Assert.True(rows.Count >= 7, "Must contain title rows + header + 2 data rows");
            var dataRow1 = rows[5].Elements<Cell>().Select(c => c.CellValue?.Text).ToList();
            Assert.Equal("1", dataRow1[0]); // STT
            Assert.Equal("45/UBND-VP", dataRow1[2]); // Số đến
            Assert.Equal("Đã xử lý (chờ ký)", dataRow1[9]); // Trạng thái formatted
            Assert.Equal("Chưa ký", dataRow1[10]); // Ngày ký
        }

        [Fact]
        public void GenerateDocumentLogbookExcel_EmptyRecords_ShouldCreateValidWorkbookWithHeadersOnly()
        {
            // Arrange
            var emptyList = new List<ProcessedRecordListItemDto>();

            // Act
            byte[] excelBytes = _exportService.GenerateDocumentLogbookExcel(emptyList);

            // Assert
            Assert.NotNull(excelBytes);
            Assert.True(excelBytes.Length > 0);

            using var ms = new MemoryStream(excelBytes);
            using var doc = SpreadsheetDocument.Open(ms, false);
            Assert.NotNull(doc.WorkbookPart);

            var sheets = doc.WorkbookPart.Workbook.Sheets?.Elements<Sheet>().ToList();
            Assert.NotNull(sheets);
            Assert.Single(sheets);
        }
    }
}
