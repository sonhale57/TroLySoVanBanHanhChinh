using System.IO;
using System.Threading.Tasks;
using GovDoc.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GovDoc.WebApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/[controller]")]
    public class StorageController : ControllerBase
    {
        private readonly IFileStorageService _storageService;

        public StorageController(IFileStorageService storageService)
        {
            _storageService = storageService;
        }

        [AllowAnonymous]
        [HttpGet("file/{folder}/{fileName}")]
        public async Task<IActionResult> GetFile(string folder, string fileName)
        {
            if (string.IsNullOrWhiteSpace(folder) || string.IsNullOrWhiteSpace(fileName) ||
                folder.Contains("..") || fileName.Contains("..") ||
                folder.IndexOfAny(Path.GetInvalidPathChars()) >= 0 ||
                fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            {
                return BadRequest(new { message = "Tham số đường dẫn hoặc tên tệp tin không hợp lệ." });
            }

            var relativePath = $"{folder}/{fileName}";
            byte[] bytes;
            try
            {
                bytes = await _storageService.GetFileBytesAsync(relativePath);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }

            if (bytes.Length == 0)
            {
                return NotFound();
            }

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };

            return File(bytes, contentType);
        }

        [AllowAnonymous]
        [HttpGet("preview/{fileName}")]
        public IActionResult GetPreviewSample(string fileName)
        {
            // Trả về văn bản mẫu HTML/Text hoặc PDF mô phỏng
            var sampleText = @"ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG
Số: 142/UBND-KT
Bình Dương, ngày 10 tháng 10 năm 2026

HỎA TỐC
V/v Xin gia hạn thời gian hoàn thành hạ tầng Cụm công nghiệp X thêm 06 tháng

Kính gửi: Thường trực Ủy ban nhân dân Tỉnh Bình Dương.

Căn cứ văn bản đề nghị ngày 02/10/2026 của Chủ đầu tư Công ty Cổ phần Phát triển Hạ tầng X;
Theo báo cáo thực địa ngày 08/10/2026 của Sở Kế hoạch và Đầu tư về tình hình giải phóng mặt bằng Cụm công nghiệp X còn vướng mắc khiếu kiện bồi thường của 12 hộ dân chưa bàn giao mặt bằng giai đoạn 2;

UBND huyện đề xuất UBND tỉnh xem xét chấp thuận gia hạn tiến độ thực hiện dự án thêm 06 tháng (đến ngày 31/12/2026) để hoàn thiện hệ thống xử lý nước thải tập trung.";

            return Content(sampleText, "text/plain; charset=utf-8");
        }
    }
}
