using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.WebApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/[controller]")]
    public class QueueController : ControllerBase
    {
        private readonly IBackgroundTaskQueue _taskQueue;
        private readonly ApplicationDbContext _context;

        public QueueController(IBackgroundTaskQueue taskQueue, ApplicationDbContext context)
        {
            _taskQueue = taskQueue;
            _context = context;
        }

        /// <summary>
        /// Tiếp nhận danh sách nhiều file đưa vào Background Queue xử lý tuần tự (FIFO)
        /// </summary>
        [HttpPost("upload-batch")]
        [RequestSizeLimit(100_000_000)] // 100MB
        public async Task<IActionResult> UploadBatch([FromForm] List<IFormFile>? files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn ít nhất 01 tệp văn bản để đưa vào hàng đợi." });
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);

            string userDept = user?.Department ?? FieldCategory.QuanTriVanPhong;
            string clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            string batchId = Guid.NewGuid().ToString("N");

            var response = new BatchUploadResponseDto
            {
                BatchId = batchId,
                TotalFiles = files.Count,
                Tasks = new List<QueueTaskItemDto>()
            };

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                string trackingId = "TRK-" + Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant();

                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                byte[] fileBytes = ms.ToArray();

                var item = new IncomingFileQueueItem
                {
                    TrackingId = trackingId,
                    BatchId = batchId,
                    FileName = file.FileName,
                    FileBytes = fileBytes,
                    UserId = currentUserId,
                    UserDepartment = userDept,
                    ClientIp = clientIp,
                    EnqueuedAt = DateTimeOffset.UtcNow
                };

                await _taskQueue.EnqueueAsync(item);

                response.Tasks.Add(new QueueTaskItemDto
                {
                    TrackingId = trackingId,
                    FileName = file.FileName,
                    Status = QueueTaskStatus.Queued,
                    CreatedAt = DateTimeOffset.UtcNow
                });
            }

            return Ok(response);
        }

        /// <summary>
        /// Kiểm tra tiến độ xử lý của tệp trong hàng đợi
        /// </summary>
        [HttpGet("status/{trackingId}")]
        public async Task<IActionResult> GetStatus(string trackingId)
        {
            if (string.IsNullOrWhiteSpace(trackingId))
            {
                return BadRequest(new { message = "Mã theo dõi trackingId không hợp lệ." });
            }

            var inMemoryStatus = _taskQueue.GetTaskStatus(trackingId);
            if (inMemoryStatus != null)
            {
                return Ok(inMemoryStatus);
            }

            // Fallback tra cứu trong cơ sở dữ liệu nếu task đã hoàn thành từ phiên trước
            var dbLog = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.TrackingId == trackingId);
            if (dbLog != null)
            {
                var dto = new QueueTaskItemDto
                {
                    TrackingId = trackingId,
                    FileName = dbLog.OriginalFileName,
                    Status = QueueTaskStatus.Completed,
                    ProcessingLogId = dbLog.Id,
                    CreatedAt = dbLog.CreatedAt
                };
                return Ok(dto);
            }

            return NotFound(new { message = $"Không tìm thấy tiến trình hàng đợi với mã {trackingId}." });
        }
    }
}
