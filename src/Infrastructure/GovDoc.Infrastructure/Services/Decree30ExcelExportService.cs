using System;
using System.Collections.Generic;
using System.IO;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Enums;

namespace GovDoc.Infrastructure.Services
{
    public class Decree30ExcelExportService : IExcelExportService
    {
        public byte[] GenerateDocumentLogbookExcel(IEnumerable<ProcessedRecordListItemDto> records, string agencyName = "ỦY BAN NHÂN DÂN TỈNH")
        {
            using var memoryStream = new MemoryStream();

            using (var spreadsheetDocument = SpreadsheetDocument.Create(memoryStream, SpreadsheetDocumentType.Workbook))
            {
                var workbookPart = spreadsheetDocument.AddWorkbookPart();
                workbookPart.Workbook = new Workbook();

                var worksheetPart = workbookPart.AddNewPart<WorksheetPart>();
                var sheetData = new SheetData();
                worksheetPart.Worksheet = new Worksheet(sheetData);

                var sheets = spreadsheetDocument.WorkbookPart!.Workbook.AppendChild(new Sheets());
                var sheet = new Sheet
                {
                    Id = spreadsheetDocument.WorkbookPart.GetIdOfPart(worksheetPart),
                    SheetId = 1,
                    Name = "SoTheoDoiVanBan"
                };
                sheets.Append(sheet);

                uint rowIndex = 1;

                // 1. Dòng Tiêu đề cơ quan
                var row1 = new Row { RowIndex = rowIndex++ };
                row1.Append(CreateStringCell("A", row1.RowIndex!, agencyName.ToUpperInvariant()));
                sheetData.Append(row1);

                // 2. Dòng Quốc hiệu / Tiêu ngữ
                var row2 = new Row { RowIndex = rowIndex++ };
                row2.Append(CreateStringCell("A", row2.RowIndex!, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM - Độc lập - Tự do - Hạnh phúc"));
                sheetData.Append(row2);

                // 3. Dòng Tên sổ
                var row3 = new Row { RowIndex = rowIndex++ };
                row3.Append(CreateStringCell("A", row3.RowIndex!, "SỔ THEO DÕI VĂN BẢN ĐẾN VÀ KẾT QUẢ XỬ LÝ (NGHỊ ĐỊNH 30/2020/NĐ-CP)"));
                sheetData.Append(row3);

                // Dòng trống
                var rowBlank = new Row { RowIndex = rowIndex++ };
                sheetData.Append(rowBlank);

                // 4. Header Bảng dữ liệu (11 Cột theo Nghị định 30)
                var headerRow = new Row { RowIndex = rowIndex++ };
                headerRow.Append(CreateStringCell("A", headerRow.RowIndex!, "STT"));
                headerRow.Append(CreateStringCell("B", headerRow.RowIndex!, "Ngày tiếp nhận"));
                headerRow.Append(CreateStringCell("C", headerRow.RowIndex!, "Số / Ký hiệu đến"));
                headerRow.Append(CreateStringCell("D", headerRow.RowIndex!, "Cơ quan ban hành"));
                headerRow.Append(CreateStringCell("E", headerRow.RowIndex!, "Trích yếu nội dung"));
                headerRow.Append(CreateStringCell("F", headerRow.RowIndex!, "Độ khẩn"));
                headerRow.Append(CreateStringCell("G", headerRow.RowIndex!, "Cán bộ thụ lý"));
                headerRow.Append(CreateStringCell("H", headerRow.RowIndex!, "Phòng / Ban"));
                headerRow.Append(CreateStringCell("I", headerRow.RowIndex!, "Hạn xử lý SLA"));
                headerRow.Append(CreateStringCell("J", headerRow.RowIndex!, "Trạng thái"));
                headerRow.Append(CreateStringCell("K", headerRow.RowIndex!, "Ngày ký duyệt"));
                sheetData.Append(headerRow);

                // 5. Thân bảng dữ liệu
                int stt = 1;
                foreach (var rec in records)
                {
                    var dataRow = new Row { RowIndex = rowIndex++ };
                    dataRow.Append(CreateStringCell("A", dataRow.RowIndex!, stt.ToString()));
                    dataRow.Append(CreateStringCell("B", dataRow.RowIndex!, rec.ReceivedDate.ToString("dd/MM/yyyy HH:mm")));
                    dataRow.Append(CreateStringCell("C", dataRow.RowIndex!, rec.IncomingDocCode ?? "Chưa có"));
                    dataRow.Append(CreateStringCell("D", dataRow.RowIndex!, rec.IncomingIssuer ?? "Chưa rõ"));
                    dataRow.Append(CreateStringCell("E", dataRow.RowIndex!, rec.SubjectTitle ?? rec.OriginalFileName));
                    dataRow.Append(CreateStringCell("F", dataRow.RowIndex!, rec.UrgencyLevel));
                    dataRow.Append(CreateStringCell("G", dataRow.RowIndex!, rec.UserName));
                    dataRow.Append(CreateStringCell("H", dataRow.RowIndex!, rec.Department));
                    dataRow.Append(CreateStringCell("I", dataRow.RowIndex!, rec.SlaDeadline?.ToString("dd/MM/yyyy") ?? "Không"));
                    dataRow.Append(CreateStringCell("J", dataRow.RowIndex!, FormatStatusName(rec.CurrentStatus)));
                    dataRow.Append(CreateStringCell("K", dataRow.RowIndex!, rec.SignedDate?.ToString("dd/MM/yyyy") ?? "Chưa ký"));

                    sheetData.Append(dataRow);
                    stt++;
                }

                workbookPart.Workbook.Save();
            }

            return memoryStream.ToArray();
        }

        private static Cell CreateStringCell(string col, uint row, string text)
        {
            return new Cell
            {
                CellReference = $"{col}{row}",
                DataType = CellValues.String,
                CellValue = new CellValue(text ?? string.Empty)
            };
        }

        private static string FormatStatusName(string status)
        {
            return status switch
            {
                DocumentCurrentStatus.ChoXuLy => "Chờ xử lý",
                DocumentCurrentStatus.DangXuLy => "Đang xử lý",
                DocumentCurrentStatus.DaXuLy => "Đã xử lý (chờ ký)",
                DocumentCurrentStatus.DaKy => "Đã ký duyệt",
                _ => status ?? "Chờ xử lý"
            };
        }
    }
}
