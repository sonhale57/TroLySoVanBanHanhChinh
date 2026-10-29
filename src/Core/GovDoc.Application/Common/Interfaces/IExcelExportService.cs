using System.Collections.Generic;
using GovDoc.Application.DTOs;

namespace GovDoc.Application.Common.Interfaces
{
    public interface IExcelExportService
    {
        /// <summary>
        /// Xuất file Excel (.xlsx) Sổ theo dõi văn bản đến và kết quả xử lý chuẩn thể thức Nghị định 30/2020/NĐ-CP
        /// </summary>
        byte[] GenerateDocumentLogbookExcel(IEnumerable<ProcessedRecordListItemDto> records, string agencyName = "ỦY BAN NHÂN DÂN TỈNH");
    }
}
