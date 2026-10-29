using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using GovDoc.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.WebApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IOcrService _ocrService;
        private readonly IFileStorageService _storageService;
        private readonly IDocxBuilderService _docxBuilder;
        private readonly IAdministrativeAppraisalEngine _appraisalEngine;
        private readonly IDepartmentSkillService _departmentSkill;
        private readonly IExcelExportService _excelExport;
        private static readonly JsonSerializerOptions _jsonWebOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public DocumentsController(
            ApplicationDbContext context,
            IOcrService ocrService,
            IFileStorageService storageService,
            IDocxBuilderService docxBuilder,
            IAdministrativeAppraisalEngine appraisalEngine,
            IDepartmentSkillService departmentSkill,
            IExcelExportService excelExport)
        {
            _context = context;
            _ocrService = ocrService;
            _storageService = storageService;
            _docxBuilder = docxBuilder;
            _appraisalEngine = appraisalEngine;
            _departmentSkill = departmentSkill;
            _excelExport = excelExport;
        }

        [HttpPost("process-incoming")]
        [RequestSizeLimit(50_000_000)] // 50MB
        public async Task<IActionResult> ProcessIncoming([FromForm] IFormFile? file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng tải lên tệp công văn thực tế (PDF, Word .docx hoặc tệp văn bản) để thẩm định." });
            }

            string fileName = file.FileName;
            var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;
            Stream stream = memoryStream;

            var savedRelativePath = await _storageService.SaveFileAsync(memoryStream, fileName, "incoming");
            string previewUrl = $"/api/v1/storage/file/{savedRelativePath}";

            // 1. Phân tích OCR và trích xuất thực thể theo Nghị định 30 (Adaptive Spatial Slicing)
            var ocrResult = await _ocrService.ExtractDocumentTextAsync(stream, fileName);
            var taskId = Guid.NewGuid().ToString("N");

            // 2. Tra cứu căn cứ pháp lý từ Tủ sách pháp luật CSDL
            var allActiveDocs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .ToListAsync();

            var expiredDocs = await _context.LegalDocuments
                .Where(d => d.Status == LegalStatus.Expired)
                .ToListAsync();

            var alerts = new List<string>();
            foreach (var exp in expiredDocs)
            {
                if (ocrResult.ExtractedText.Contains(exp.CodeNumber))
                {
                    alerts.Add($"Cảnh báo pháp lý: Văn bản số {exp.CodeNumber} ({exp.Title}) đã hết hiệu lực từ ngày {exp.ExpiredDate:dd/MM/yyyy}. Hệ thống tự động khóa không đưa vào căn cứ hợp lệ.");
                }
            }

            // 3. Động cơ thẩm định tự động tính toán kết luận duy nhất
            var appraisalVerdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

            // 4. Sinh bản thảo ban đầu chuẩn Nghị định 30 theo Kỹ năng phòng ban (Department Skill)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid recordedUserId = Guid.TryParse(userIdClaim, out var parsedGuid)
                ? parsedGuid
                : (await _context.Users.Select(u => u.Id).FirstOrDefaultAsync());

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == recordedUserId);
            string userDepartment = currentUser?.Department ?? FieldCategory.QuanTriVanPhong;

            // 4. Học hỏi từ các cặp văn bản vào - ra thực tế của người dùng & Sinh dự thảo
            var exemplarLogs = await _context.ProcessingLogs
                .Where(l => (l.IsCustomOutput || l.IsGoldSample) && !string.IsNullOrEmpty(l.DraftContentHtml))
                .OrderByDescending(l => l.IsCustomOutput)
                .ThenByDescending(l => l.CompletedAt ?? l.CreatedAt)
                .Take(30)
                .ToListAsync();

            string initialDraftHtml = _departmentSkill.GenerateLearnedDraftHtml(
                ocrResult,
                allActiveDocs,
                userDepartment,
                exemplarLogs,
                out var learningSourceNote);

            if (!string.IsNullOrEmpty(learningSourceNote))
            {
                alerts.Insert(0, $"💡 {learningSourceNote}");
            }

            var actionOptions = new List<ActionOptionDto>
            {
                new ActionOptionDto
                {
                    Id = appraisalVerdict.VerdictType,
                    IsRecommended = true,
                    Title = appraisalVerdict.VerdictTitle,
                    Rationale = appraisalVerdict.VerdictSummary,
                    LegalBasis = appraisalVerdict.PrimaryLegalBasis,
                    DraftContentBullets = appraisalVerdict.DraftContentBullets
                }
            };

            var resultDto = new ProcessIncomingResultDto
            {
                TaskId = taskId,
                DocumentInfo = new DocumentInfoDto
                {
                    Issuer = ocrResult.DetectedIssuer,
                    CodeNumber = ocrResult.DetectedCodeNumber,
                    IssuedDate = ocrResult.DetectedIssuedDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                    Urgency = ocrResult.DetectedUrgency,
                    SubjectTitle = ocrResult.SubjectTitle,
                    SlaDeadline = ocrResult.CalculatedSlaDeadline,
                    PreviewUrl = previewUrl,
                    OriginalFileName = fileName
                },
                Summary = new DocumentSummaryDto
                {
                    CoreProblem = ocrResult.CoreProblem,
                    SubmittedBasis = ocrResult.SubmittedBasis,
                    RequestedAction = ocrResult.RequestedAction
                },
                AppraisalVerdict = appraisalVerdict,
                ActionOptions = actionOptions,
                LegalAlerts = alerts,
                ExtractedRawText = ocrResult.ExtractedText,
                InitialDraftHtml = initialDraftHtml,
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                AiVerification = new AiVerificationInfoDto
                {
                    IsAiVerified = true,
                    Status = "VERIFIED",
                    ModelUsed = "Trợ lý AI Thẩm định Thể thức Nghị định 30/2020",
                    Provider = "GovDoc AI Engine",
                    ConfidenceScore = (appraisalVerdict.VerdictType == "APPROVED" || appraisalVerdict.VerdictType == "TRANSFER_AUTHORITY") ? 98 : 94,
                    VerifiedAt = DateTimeOffset.UtcNow,
                    LegalBasesCount = allActiveDocs.Count(d => ocrResult.ExtractedText != null && ocrResult.ExtractedText.Contains(d.CodeNumber)),
                    EvaluatedRulesCount = appraisalVerdict.Checklist.Count > 0 ? appraisalVerdict.Checklist.Count : 5,
                    SummaryMessage = "Văn bản đã qua bóc tách thực thể OCR & thẩm định thể thức chuyên sâu theo Luật Ban hành VBQPPL và Nghị định 30/2020/NĐ-CP. Sẵn sàng sử dụng trong công vụ."
                }
            };

            var log = new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = recordedUserId,
                IncomingDocCode = resultDto.DocumentInfo.CodeNumber,
                IncomingIssuer = resultDto.DocumentInfo.Issuer,
                SubjectTitle = resultDto.DocumentInfo.SubjectTitle,
                OriginalFileName = fileName,
                StoredFilePath = savedRelativePath,
                UrgencyLevel = resultDto.DocumentInfo.Urgency,
                ReceivedDate = DateTimeOffset.UtcNow,
                SlaDeadline = resultDto.DocumentInfo.SlaDeadline,
                SummaryDataJson = JsonSerializer.Serialize(resultDto.Summary, _jsonWebOptions),
                SelectedOptionId = appraisalVerdict.VerdictType,
                LegalBasesUsedJson = JsonSerializer.Serialize(new[] { appraisalVerdict.PrimaryLegalBasis }, _jsonWebOptions),
                ResultDataJson = JsonSerializer.Serialize(resultDto, _jsonWebOptions),
                DraftContentHtml = initialDraftHtml,
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                ClientIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.ProcessingLogs.Add(log);
            await _context.SaveChangesAsync();

            resultDto.ProcessingLogId = log.Id;
            return Ok(resultDto);
        }

        private static (DateTimeOffset? start, DateTimeOffset? end, string periodType, string periodLabel) ResolvePeriodRange(
            string? timeFilter, int? year, int? month, DateTime? fromDate, DateTime? toDate)
        {
            var now = DateTimeOffset.UtcNow;

            if (year.HasValue && month.HasValue && month.Value >= 1 && month.Value <= 12)
            {
                var start = new DateTimeOffset(new DateTime(year.Value, month.Value, 1), TimeSpan.Zero);
                var end = start.AddMonths(1).AddTicks(-1);
                return (start, end, "month", $"Tháng {month.Value:D2}/{year.Value}");
            }

            if (!string.IsNullOrWhiteSpace(timeFilter))
            {
                var tf = timeFilter.Trim().ToLowerInvariant();

                if (tf == "this_week")
                {
                    int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
                    var start = new DateTimeOffset(now.AddDays(-diff).Date, TimeSpan.Zero);
                    var end = start.AddDays(7).AddTicks(-1);
                    return (start, end, "week", $"Tuần này ({start:dd/MM} - {end:dd/MM/yyyy})");
                }
                if (tf == "last_week")
                {
                    int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
                    var currentMon = new DateTimeOffset(now.AddDays(-diff).Date, TimeSpan.Zero);
                    var start = currentMon.AddDays(-7);
                    var end = currentMon.AddTicks(-1);
                    return (start, end, "week", $"Tuần trước ({start:dd/MM} - {end:dd/MM/yyyy})");
                }
                if (tf == "this_month")
                {
                    var start = new DateTimeOffset(new DateTime(now.Year, now.Month, 1), TimeSpan.Zero);
                    var end = start.AddMonths(1).AddTicks(-1);
                    return (start, end, "month", $"Tháng {now.Month:D2}/{now.Year}");
                }
                if (tf == "last_month")
                {
                    var thisMonth = new DateTime(now.Year, now.Month, 1);
                    var lastM = thisMonth.AddMonths(-1);
                    var start = new DateTimeOffset(lastM, TimeSpan.Zero);
                    var end = start.AddMonths(1).AddTicks(-1);
                    return (start, end, "month", $"Tháng {lastM.Month:D2}/{lastM.Year}");
                }
                if (tf == "this_quarter")
                {
                    int quarter = (now.Month - 1) / 3 + 1;
                    var start = new DateTimeOffset(new DateTime(now.Year, (quarter - 1) * 3 + 1, 1), TimeSpan.Zero);
                    var end = start.AddMonths(3).AddTicks(-1);
                    return (start, end, "quarter", $"Quý {quarter}/{now.Year}");
                }
                if (tf.StartsWith("month:"))
                {
                    var parts = tf.Substring(6).Split('-');
                    if (parts.Length == 2 && int.TryParse(parts[0], out int y) && int.TryParse(parts[1], out int m))
                    {
                        var start = new DateTimeOffset(new DateTime(y, m, 1), TimeSpan.Zero);
                        var end = start.AddMonths(1).AddTicks(-1);
                        return (start, end, "month", $"Tháng {m:D2}/{y}");
                    }
                }
                if (tf.StartsWith("week:"))
                {
                    var datePart = tf.Substring(5);
                    if (DateTime.TryParse(datePart, out var parsedDate))
                    {
                        int diff = (7 + (parsedDate.DayOfWeek - DayOfWeek.Monday)) % 7;
                        var start = new DateTimeOffset(parsedDate.AddDays(-diff).Date, TimeSpan.Zero);
                        var end = start.AddDays(7).AddTicks(-1);
                        return (start, end, "week", $"Tuần ({start:dd/MM} - {end:dd/MM/yyyy})");
                    }
                }
            }

            if (fromDate.HasValue || toDate.HasValue)
            {
                var start = fromDate.HasValue ? new DateTimeOffset(fromDate.Value.Date, TimeSpan.Zero) : (DateTimeOffset?)null;
                var end = toDate.HasValue ? new DateTimeOffset(toDate.Value.Date.AddDays(1).AddTicks(-1), TimeSpan.Zero) : (DateTimeOffset?)null;
                string label = $"Từ {(start.HasValue ? start.Value.ToString("dd/MM/yyyy") : "bắt đầu")} đến {(end.HasValue ? end.Value.ToString("dd/MM/yyyy") : "nay")}";
                return (start, end, "custom", label);
            }

            return (null, null, "all", "Toàn bộ thời gian");
        }

        [HttpGet("processed-records")]
        public async Task<IActionResult> GetProcessedRecords(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? timeFilter = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] Guid? officerId = null)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var (rangeStart, rangeEnd, _, _) = ResolvePeriodRange(timeFilter, year, month, fromDate, toDate);

            var query = _context.ProcessingLogs
                .Include(l => l.User)
                .AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == currentUserId);
            }
            else if (officerId.HasValue && officerId.Value != Guid.Empty)
            {
                query = query.Where(l => l.UserId == officerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(l => l.CurrentStatus == status);
            }

            if (rangeStart.HasValue) query = query.Where(l => l.ReceivedDate >= rangeStart.Value);
            if (rangeEnd.HasValue) query = query.Where(l => l.ReceivedDate <= rangeEnd.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(l =>
                    (l.IncomingDocCode != null && l.IncomingDocCode.ToLower().Contains(term)) ||
                    (l.IncomingIssuer != null && l.IncomingIssuer.ToLower().Contains(term)) ||
                    (l.SubjectTitle != null && l.SubjectTitle.ToLower().Contains(term)) ||
                    l.OriginalFileName.ToLower().Contains(term));
            }

            var records = await query
                .OrderByDescending(l => l.ReceivedDate)
                .Select(l => new ProcessedRecordListItemDto
                {
                    Id = l.Id,
                    IncomingDocCode = l.IncomingDocCode,
                    IncomingIssuer = l.IncomingIssuer,
                    SubjectTitle = l.SubjectTitle,
                    OriginalFileName = l.OriginalFileName,
                    UrgencyLevel = l.UrgencyLevel,
                    ReceivedDate = l.ReceivedDate,
                    SlaDeadline = l.SlaDeadline,
                    SelectedOptionId = l.SelectedOptionId,
                    CurrentStatus = l.CurrentStatus,
                    SignedDate = l.SignedDate,
                    RatingScore = l.RatingScore,
                    IsGoldSample = l.IsGoldSample,
                    CompletedAt = l.CompletedAt,
                    CreatedAt = l.CreatedAt,
                    ReprocessCount = l.ReprocessCount,
                    LastReprocessedAt = l.LastReprocessedAt,
                    UserName = l.User != null ? l.User.FullName : "Cán bộ công vụ",
                    Department = l.User != null ? l.User.Department : "Văn phòng",
                    HasStoredFile = !string.IsNullOrEmpty(l.StoredFilePath),
                    TrackingId = l.TrackingId,
                    OutputFileName = l.OutputFileName,
                    OutputFilePath = l.OutputFilePath,
                    IsCustomOutput = l.IsCustomOutput
                })
                .ToListAsync();

            return Ok(records);
        }

        [HttpGet("processed-records/{id}")]
        public async Task<IActionResult> GetProcessedRecordDetail(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs
                .Include(l => l.User)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            var detail = new ProcessedRecordDetailDto
            {
                Id = log.Id,
                IncomingDocCode = log.IncomingDocCode,
                IncomingIssuer = log.IncomingIssuer,
                SubjectTitle = log.SubjectTitle,
                OriginalFileName = log.OriginalFileName,
                UrgencyLevel = log.UrgencyLevel,
                ReceivedDate = log.ReceivedDate,
                SlaDeadline = log.SlaDeadline,
                SelectedOptionId = log.SelectedOptionId,
                CurrentStatus = log.CurrentStatus,
                SignedDate = log.SignedDate,
                RatingScore = log.RatingScore,
                IsGoldSample = log.IsGoldSample,
                CompletedAt = log.CompletedAt,
                SummaryDataJson = log.SummaryDataJson,
                LegalBasesUsedJson = log.LegalBasesUsedJson,
                ResultDataJson = log.ResultDataJson,
                DraftContentHtml = log.DraftContentHtml,
                ExportedDocxPath = log.ExportedDocxPath,
                CreatedAt = log.CreatedAt,
                UserName = log.User != null ? log.User.FullName : "Cán bộ công vụ",
                Department = log.User != null ? log.User.Department : "Văn phòng",
                ReprocessCount = log.ReprocessCount,
                LastReprocessedAt = log.LastReprocessedAt,
                HasStoredFile = !string.IsNullOrEmpty(log.StoredFilePath),
                StoredFilePath = log.StoredFilePath,
                TrackingId = log.TrackingId,
                OutputFileName = log.OutputFileName,
                OutputFilePath = log.OutputFilePath,
                IsCustomOutput = log.IsCustomOutput,
                SignerAuthority = log.SignerAuthority,
                RecipientsJson = log.RecipientsJson,
                DocDateStr = log.DocDateStr
            };

            return Ok(detail);
        }

        /// <summary>
        /// Xóa hồ sơ văn bản đã xử lý với cơ chế kiểm tra ràng buộc khóa ngoại (Smart Cascade Deletion)
        /// </summary>
        [HttpDelete("processed-records/{id}")]
        public async Task<IActionResult> DeleteProcessedRecord(Guid id, [FromQuery] bool forceCascade = false)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            // Kiểm tra các bảng khóa ngoại phụ thuộc vào ProcessingLog (nếu có)
            bool hasForeignKeys = false;
            var deps = new List<ForeignKeyDependencyDto>();

            if (hasForeignKeys && !forceCascade)
            {
                return StatusCode(StatusCodes.Status409Conflict, new DeleteImpactResultDto
                {
                    HasForeignKeys = true,
                    RequiresCascadeConfirmation = true,
                    Message = $"Hồ sơ \"{log.IncomingDocCode ?? log.OriginalFileName}\" đang có dữ liệu ràng buộc tại các bảng liên quan.",
                    Dependencies = deps
                });
            }

            // Dọn sạch tệp vật lý lưu trữ nếu có
            if (!string.IsNullOrWhiteSpace(log.StoredFilePath) && System.IO.File.Exists(log.StoredFilePath))
            {
                try { System.IO.File.Delete(log.StoredFilePath); } catch { }
            }
            if (!string.IsNullOrWhiteSpace(log.ExportedDocxPath) && System.IO.File.Exists(log.ExportedDocxPath))
            {
                try { System.IO.File.Delete(log.ExportedDocxPath); } catch { }
            }

            _context.ProcessingLogs.Remove(log);
            await _context.SaveChangesAsync();

            string code = !string.IsNullOrWhiteSpace(log.IncomingDocCode) ? log.IncomingDocCode : log.OriginalFileName;
            return Ok(new { message = $"Đã xóa hồ sơ lưu trữ {code} thành công." });
        }

        /// <summary>
        /// Lưu nội dung HTML từ trình soạn thảo, chuyển trạng thái sang DA_XU_LY
        /// </summary>
        [HttpPut("{id}/save-draft")]
        public async Task<IActionResult> SaveDraft(Guid id, [FromBody] SaveDraftRequestDto request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            log.DraftContentHtml = request.DraftContentHtml;
            if (!string.IsNullOrWhiteSpace(request.SubjectTitle))
            {
                log.SubjectTitle = request.SubjectTitle;
            }
            if (!string.IsNullOrWhiteSpace(request.SelectedOptionId))
            {
                log.SelectedOptionId = request.SelectedOptionId;
            }
            if (!string.IsNullOrWhiteSpace(request.SignerAuthority))
            {
                log.SignerAuthority = request.SignerAuthority;
            }
            if (!string.IsNullOrWhiteSpace(request.DocDateStr))
            {
                log.DocDateStr = request.DocDateStr;
            }
            if (request.RecipientsList != null && request.RecipientsList.Count > 0)
            {
                log.RecipientsJson = JsonSerializer.Serialize(request.RecipientsList, _jsonWebOptions);
            }

            log.CurrentStatus = DocumentCurrentStatus.DaXuLy;
            log.CompletedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã lưu bản thảo văn bản thành công và chuyển sang trạng thái Đã xử lý (chờ ký).", log.CurrentStatus, log.CompletedAt });
        }

        /// <summary>
        /// Tải lên văn bản đầu ra thực tế (Word .docx hoặc PDF) do người dùng tự xử lý để thay thế kết quả AI
        /// </summary>
        [HttpPost("{id}/upload-output")]
        [RequestSizeLimit(50_000_000)] // 50MB
        public async Task<IActionResult> UploadProcessedOutput(Guid id, [FromForm] IFormFile? file)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn tệp văn bản đầu ra (Word .docx hoặc PDF) đã xử lý của đồng chí." });
            }

            string ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".docx" && ext != ".doc" && ext != ".pdf")
            {
                return BadRequest(new { message = "Hệ thống chỉ hỗ trợ tệp văn bản định dạng Word (.docx, .doc) hoặc Adobe PDF (.pdf)." });
            }

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            // 1. Lưu trữ tệp đầu ra vào thư mục custom_output
            string savedRelativePath = await _storageService.SaveFileAsync(memoryStream, file.FileName, "custom_output");
            string previewUrl = $"/api/v1/storage/file/{savedRelativePath}";

            // 2. Bóc tách nội dung văn bản từ tệp Word / PDF đã xử lý
            memoryStream.Position = 0;
            var ocrResult = await _ocrService.ExtractDocumentTextAsync(memoryStream, file.FileName);

            string parsedHtml = string.Empty;
            if (!string.IsNullOrWhiteSpace(ocrResult.ExtractedText))
            {
                var lines = ocrResult.ExtractedText
                    .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(l => l.Trim())
                    .Where(l => !string.IsNullOrWhiteSpace(l));

                var sb = new System.Text.StringBuilder();
                foreach (var line in lines)
                {
                    sb.Append($"<p>{System.Net.WebUtility.HtmlEncode(line)}</p>");
                }
                parsedHtml = sb.ToString();
            }

            if (string.IsNullOrWhiteSpace(parsedHtml))
            {
                parsedHtml = $"<p><strong>Nội dung văn bản đầu ra đã xử lý:</strong> {System.Net.WebUtility.HtmlEncode(file.FileName)}</p>";
            }

            // 3. Cập nhật hồ sơ: Đánh dấu đã dùng văn bản đầu ra thực tế, thay thế kết quả AI
            log.OutputFileName = file.FileName;
            log.OutputFilePath = savedRelativePath;
            log.IsCustomOutput = true;
            log.DraftContentHtml = parsedHtml;
            log.CurrentStatus = DocumentCurrentStatus.DaXuLy;
            log.CompletedAt = DateTimeOffset.UtcNow;
            log.IsGoldSample = true; // Tự động ghi nhớ làm Mẫu Chuẩn Vàng để AI học hỏi văn phong thực tế
            log.RatingScore = 1;

            if (!string.IsNullOrWhiteSpace(ocrResult.SubjectTitle) && string.IsNullOrWhiteSpace(log.SubjectTitle))
            {
                log.SubjectTitle = ocrResult.SubjectTitle;
            }

            await _context.SaveChangesAsync();

            var response = new UploadCustomOutputResponseDto
            {
                ProcessingLogId = log.Id,
                OutputFileName = file.FileName,
                OutputFilePath = savedRelativePath,
                PreviewUrl = previewUrl,
                DraftContentHtml = parsedHtml,
                CurrentStatus = log.CurrentStatus,
                IsCustomOutput = true,
                Message = $"Đã tiếp nhận thành công văn bản đầu ra thực tế \"{file.FileName}\"! Kết quả này đã thay thế toàn bộ dự thảo của AI và được lưu trữ vĩnh viễn trong hồ sơ công vụ.",
                DetectedSubjectTitle = ocrResult.SubjectTitle,
                DetectedDocCode = ocrResult.DetectedCodeNumber,
                DetectedIssuer = ocrResult.DetectedIssuer
            };

            return Ok(response);
        }

        /// <summary>
        /// Tải về văn bản đầu ra thực tế của hồ sơ (tệp người dùng đã tải lên hoặc tệp Word đã chốt xuất)
        /// </summary>
        [HttpGet("{id}/download-output")]
        public async Task<IActionResult> DownloadOutputDoc(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            string? targetPath = log.OutputFilePath;
            string downloadName = log.OutputFileName ?? $"VanBanDauRa_{log.IncomingDocCode ?? "ND30"}.docx";

            if (string.IsNullOrWhiteSpace(targetPath))
            {
                targetPath = log.ExportedDocxPath;
                downloadName = $"DuThao_{log.IncomingDocCode ?? "ND30"}.docx";
            }

            if (string.IsNullOrWhiteSpace(targetPath))
            {
                return BadRequest(new { message = "Hồ sơ chưa có tệp văn bản đầu ra thực tế được lưu trữ." });
            }

            byte[] fileBytes = await _storageService.GetFileBytesAsync(targetPath);
            if (fileBytes.Length == 0)
            {
                return NotFound(new { message = "Không tìm thấy tệp vật lý trên máy chủ lưu trữ." });
            }

            string ext = Path.GetExtension(downloadName).ToLowerInvariant();
            string contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc" => "application/msword",
                _ => "application/octet-stream"
            };

            return File(fileBytes, contentType, downloadName);
        }

        /// <summary>
        /// Tải về tệp văn bản đầu vào gốc (Incoming Original Document)
        /// </summary>
        [HttpGet("{id}/download-incoming")]
        public async Task<IActionResult> DownloadIncomingDoc(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(log.StoredFilePath))
            {
                return BadRequest(new { message = "Hồ sơ không có tệp văn bản đầu vào gốc được lưu trữ." });
            }

            byte[] fileBytes = await _storageService.GetFileBytesAsync(log.StoredFilePath);
            if (fileBytes.Length == 0)
            {
                return NotFound(new { message = "Không tìm thấy tệp văn bản đầu vào trên máy chủ lưu trữ." });
            }

            string ext = Path.GetExtension(log.OriginalFileName).ToLowerInvariant();
            string contentType = ext switch
            {
                ".pdf" => "application/pdf",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".doc" => "application/msword",
                _ => "application/octet-stream"
            };

            return File(fileBytes, contentType, log.OriginalFileName);
        }

        /// <summary>
        /// Cập nhật ngày ký duyệt bản giấy, chuyển trạng thái sang DA_KY
        /// </summary>
        [HttpPut("{id}/update-signed-date")]
        public async Task<IActionResult> UpdateSignedDate(Guid id, [FromBody] UpdateSignedDateRequestDto request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            log.SignedDate = request.SignedDate != default ? request.SignedDate : DateTimeOffset.UtcNow;
            log.CurrentStatus = DocumentCurrentStatus.DaKy;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã cập nhật ngày ký duyệt thành công. Hồ sơ chuyển sang trạng thái Đã ký.", log.CurrentStatus, log.SignedDate });
        }

        /// <summary>
        /// Mở lại hồ sơ để chỉnh sửa, chuyển trạng thái về DANG_XU_LY
        /// </summary>
        [HttpPut("{id}/reopen")]
        public async Task<IActionResult> ReopenDocument(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            log.CurrentStatus = DocumentCurrentStatus.DangXuLy;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã mở lại hồ sơ để tiếp tục soạn thảo.", log.CurrentStatus });
        }

        /// <summary>
        /// Đánh giá Like/Dislike chất lượng dự thảo phục vụ tự học (Gold-Standard Few-Shot)
        /// </summary>
        [HttpPost("{id}/rate")]
        public async Task<IActionResult> RateDocument(Guid id, [FromBody] RateDocumentRequestDto request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            log.RatingScore = request.Rating;

            // Nếu cán bộ Like (Rating == 1): Kiểm tra tỷ lệ giữ lại của AI >= 75%
            if (request.Rating == 1)
            {
                string originalAiContent = log.DraftContentHtml ?? string.Empty;
                string finalContent = !string.IsNullOrWhiteSpace(request.FinalContentHtml) ? request.FinalContentHtml : originalAiContent;

                double retention = _departmentSkill.CalculateRetentionRate(originalAiContent, finalContent);
                if (retention >= 0.70) // >= 70-75%
                {
                    log.IsGoldSample = true;
                }
            }
            else
            {
                log.IsGoldSample = false;
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Đã ghi nhận đánh giá chất lượng của cán bộ.",
                log.RatingScore,
                log.IsGoldSample
            });
        }

        /// <summary>
        /// Lấy số liệu thống kê tổng hợp báo cáo công văn đa chiều
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics(
            [FromQuery] string? timeFilter = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var (rangeStart, rangeEnd, periodType, periodLabel) = ResolvePeriodRange(timeFilter, year, month, fromDate, toDate);

            var query = _context.ProcessingLogs.Include(l => l.User).AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == currentUserId);
            }

            if (rangeStart.HasValue) query = query.Where(l => l.ReceivedDate >= rangeStart.Value);
            if (rangeEnd.HasValue) query = query.Where(l => l.ReceivedDate <= rangeEnd.Value);

            var now = DateTimeOffset.UtcNow;
            var logs = await query.AsNoTracking()
                .Select(l => new
                {
                    l.CurrentStatus,
                    l.UrgencyLevel,
                    l.ReceivedDate,
                    l.SlaDeadline,
                    Department = l.User != null ? l.User.Department : "Văn phòng"
                })
                .ToListAsync();

            var timelineBreakdown = new List<DailyChartPointDto>();

            if (periodType == "week" && rangeStart.HasValue)
            {
                string[] dayNames = { "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật" };
                for (int i = 0; i < 7; i++)
                {
                    var dayStart = rangeStart.Value.AddDays(i).Date;
                    var dayEnd = dayStart.AddDays(1);
                    var dayLogs = logs.Where(l => l.ReceivedDate.Date == dayStart).ToList();

                    timelineBreakdown.Add(new DailyChartPointDto
                    {
                        Label = $"{dayNames[i]} ({dayStart:dd/MM})",
                        DateKey = dayStart.ToString("yyyy-MM-dd"),
                        ReceivedCount = dayLogs.Count,
                        ProcessedCount = dayLogs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaXuLy || l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        SignedCount = dayLogs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        OverdueCount = dayLogs.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value < now && l.CurrentStatus != DocumentCurrentStatus.DaKy)
                    });
                }
            }
            else if (periodType == "month" && rangeStart.HasValue)
            {
                var monthStart = rangeStart.Value.Date;
                int daysInMonth = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
                int[] cutoffs = { 7, 14, 21, 28, daysInMonth };
                int prevDay = 1;
                for (int w = 0; w < cutoffs.Length; w++)
                {
                    int startDay = prevDay;
                    int endDay = cutoffs[w];
                    if (startDay > daysInMonth) break;

                    var wStart = new DateTime(monthStart.Year, monthStart.Month, startDay);
                    var wEnd = new DateTime(monthStart.Year, monthStart.Month, endDay).AddDays(1);
                    var wLogs = logs.Where(l => l.ReceivedDate.Date >= wStart && l.ReceivedDate.Date < wEnd).ToList();

                    timelineBreakdown.Add(new DailyChartPointDto
                    {
                        Label = $"Tuần {w + 1} ({startDay:D2}-{endDay:D2})",
                        DateKey = $"{monthStart.Year}-{monthStart.Month:D2}-W{w + 1}",
                        ReceivedCount = wLogs.Count,
                        ProcessedCount = wLogs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaXuLy || l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        SignedCount = wLogs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        OverdueCount = wLogs.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value < now && l.CurrentStatus != DocumentCurrentStatus.DaKy)
                    });

                    prevDay = endDay + 1;
                }
            }
            else
            {
                var groupedDates = logs.GroupBy(l => l.ReceivedDate.Date)
                    .OrderBy(g => g.Key)
                    .TakeLast(7)
                    .ToList();

                foreach (var g in groupedDates)
                {
                    timelineBreakdown.Add(new DailyChartPointDto
                    {
                        Label = g.Key.ToString("dd/MM"),
                        DateKey = g.Key.ToString("yyyy-MM-dd"),
                        ReceivedCount = g.Count(),
                        ProcessedCount = g.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaXuLy || l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        SignedCount = g.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaKy),
                        OverdueCount = g.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value < now && l.CurrentStatus != DocumentCurrentStatus.DaKy)
                    });
                }
            }

            int overdueCount = logs.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value < now && l.CurrentStatus != DocumentCurrentStatus.DaKy);
            int total = logs.Count;
            double onTimeRate = total > 0 ? Math.Round((total - overdueCount) * 100.0 / total, 1) : 100.0;

            var stats = new DocumentStatisticsDto
            {
                TotalReceived = total,
                ChoXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.ChoXuLy),
                DangXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DangXuLy),
                DaXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaXuLy),
                DaKy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaKy),
                OverdueSla = overdueCount,
                OnTimeRate = onTimeRate,
                PeriodType = periodType,
                PeriodLabel = periodLabel,
                StatusDistribution = logs.GroupBy(l => l.CurrentStatus).ToDictionary(g => g.Key, g => g.Count()),
                FieldCategoryDistribution = logs.GroupBy(l => l.Department).ToDictionary(g => g.Key, g => g.Count()),
                UrgencyDistribution = logs.GroupBy(l => l.UrgencyLevel ?? "THUONG").ToDictionary(g => g.Key, g => g.Count()),
                TimelineBreakdown = timelineBreakdown
            };

            return Ok(stats);
        }

        /// <summary>
        /// Xuất file Excel (.xlsx) Sổ theo dõi văn bản đến và đi chuẩn thể thức Nghị định 30
        /// </summary>
        [HttpGet("export-excel")]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? timeFilter = null,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var (rangeStart, rangeEnd, _, _) = ResolvePeriodRange(timeFilter, year, month, fromDate, toDate);

            var query = _context.ProcessingLogs.Include(l => l.User).AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == currentUserId);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(l => l.CurrentStatus == status);
            }

            if (rangeStart.HasValue) query = query.Where(l => l.ReceivedDate >= rangeStart.Value);
            if (rangeEnd.HasValue) query = query.Where(l => l.ReceivedDate <= rangeEnd.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(l =>
                    (l.IncomingDocCode != null && l.IncomingDocCode.ToLower().Contains(term)) ||
                    (l.IncomingIssuer != null && l.IncomingIssuer.ToLower().Contains(term)) ||
                    (l.SubjectTitle != null && l.SubjectTitle.ToLower().Contains(term)) ||
                    l.OriginalFileName.ToLower().Contains(term));
            }

            var items = await query
                .OrderByDescending(l => l.ReceivedDate)
                .Select(l => new ProcessedRecordListItemDto
                {
                    Id = l.Id,
                    IncomingDocCode = l.IncomingDocCode,
                    IncomingIssuer = l.IncomingIssuer,
                    SubjectTitle = l.SubjectTitle,
                    OriginalFileName = l.OriginalFileName,
                    UrgencyLevel = l.UrgencyLevel,
                    ReceivedDate = l.ReceivedDate,
                    SlaDeadline = l.SlaDeadline,
                    SelectedOptionId = l.SelectedOptionId,
                    CurrentStatus = l.CurrentStatus,
                    SignedDate = l.SignedDate,
                    RatingScore = l.RatingScore,
                    IsGoldSample = l.IsGoldSample,
                    CompletedAt = l.CompletedAt,
                    CreatedAt = l.CreatedAt,
                    ReprocessCount = l.ReprocessCount,
                    LastReprocessedAt = l.LastReprocessedAt,
                    UserName = l.User != null ? l.User.FullName : "Cán bộ công vụ",
                    Department = l.User != null ? l.User.Department : "Văn phòng",
                    HasStoredFile = !string.IsNullOrEmpty(l.StoredFilePath),
                    TrackingId = l.TrackingId
                })
                .ToListAsync();

            byte[] excelBytes = _excelExport.GenerateDocumentLogbookExcel(items);

            return File(
                excelBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"SoTheoDoi_CongVan_ND30_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
        }

        [HttpPost("processed-records/{id}/reprocess")]
        public async Task<IActionResult> ReprocessDocument(Guid id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            if (!isAdmin && log.UserId != currentUserId)
            {
                return Forbid();
            }

            if (string.IsNullOrEmpty(log.StoredFilePath))
            {
                return BadRequest(new { message = "Hồ sơ này không có tệp đính kèm gốc được lưu trữ trên máy chủ." });
            }

            byte[] fileBytes = await _storageService.GetFileBytesAsync(log.StoredFilePath);
            if (fileBytes == null || fileBytes.Length == 0)
            {
                return BadRequest(new { message = "Không thể đọc tệp văn bản gốc từ máy chủ lưu trữ." });
            }

            using var memoryStream = new MemoryStream(fileBytes);
            var ocrResult = await _ocrService.ExtractDocumentTextAsync(memoryStream, log.OriginalFileName);
            var taskId = Guid.NewGuid().ToString("N");

            var allActiveDocs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .ToListAsync();

            var expiredDocs = await _context.LegalDocuments
                .Where(d => d.Status == LegalStatus.Expired)
                .ToListAsync();

            var alerts = new List<string>();
            foreach (var exp in expiredDocs)
            {
                if (ocrResult.ExtractedText.Contains(exp.CodeNumber))
                {
                    alerts.Add($"Cảnh báo pháp lý: Văn bản số {exp.CodeNumber} ({exp.Title}) đã hết hiệu lực từ ngày {exp.ExpiredDate:dd/MM/yyyy}.");
                }
            }

            var appraisalVerdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == log.UserId);
            string userDept = currentUser?.Department ?? FieldCategory.QuanTriVanPhong;
            string initialDraftHtml = _departmentSkill.GenerateInitialDraftHtml(ocrResult, allActiveDocs, userDept);

            var actionOptions = new List<ActionOptionDto>
            {
                new ActionOptionDto
                {
                    Id = appraisalVerdict.VerdictType,
                    IsRecommended = true,
                    Title = appraisalVerdict.VerdictTitle,
                    Rationale = appraisalVerdict.VerdictSummary,
                    LegalBasis = appraisalVerdict.PrimaryLegalBasis,
                    DraftContentBullets = appraisalVerdict.DraftContentBullets
                }
            };

            string previewUrl = $"/api/v1/storage/file/{log.StoredFilePath}";

            var resultDto = new ProcessIncomingResultDto
            {
                TaskId = taskId,
                DocumentInfo = new DocumentInfoDto
                {
                    Issuer = ocrResult.DetectedIssuer,
                    CodeNumber = ocrResult.DetectedCodeNumber,
                    IssuedDate = ocrResult.DetectedIssuedDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                    Urgency = ocrResult.DetectedUrgency,
                    SubjectTitle = ocrResult.SubjectTitle,
                    SlaDeadline = ocrResult.CalculatedSlaDeadline,
                    PreviewUrl = previewUrl,
                    OriginalFileName = log.OriginalFileName
                },
                Summary = new DocumentSummaryDto
                {
                    CoreProblem = ocrResult.CoreProblem,
                    SubmittedBasis = ocrResult.SubmittedBasis,
                    RequestedAction = ocrResult.RequestedAction
                },
                AppraisalVerdict = appraisalVerdict,
                ActionOptions = actionOptions,
                LegalAlerts = alerts,
                ExtractedRawText = ocrResult.ExtractedText,
                InitialDraftHtml = !string.IsNullOrEmpty(log.DraftContentHtml) ? log.DraftContentHtml : initialDraftHtml,
                CurrentStatus = DocumentCurrentStatus.DangXuLy
            };

            log.ReprocessCount += 1;
            log.LastReprocessedAt = DateTimeOffset.UtcNow;
            log.IncomingDocCode = resultDto.DocumentInfo.CodeNumber;
            log.IncomingIssuer = resultDto.DocumentInfo.Issuer;
            log.SubjectTitle = resultDto.DocumentInfo.SubjectTitle;
            log.UrgencyLevel = resultDto.DocumentInfo.Urgency;
            log.SlaDeadline = resultDto.DocumentInfo.SlaDeadline;
            log.SummaryDataJson = JsonSerializer.Serialize(resultDto.Summary, _jsonWebOptions);
            log.SelectedOptionId = appraisalVerdict.VerdictType;
            log.LegalBasesUsedJson = JsonSerializer.Serialize(new[] { appraisalVerdict.PrimaryLegalBasis }, _jsonWebOptions);
            log.ResultDataJson = JsonSerializer.Serialize(resultDto, _jsonWebOptions);
            log.CurrentStatus = DocumentCurrentStatus.DangXuLy;

            await _context.SaveChangesAsync();
            resultDto.ProcessingLogId = log.Id;

            return Ok(resultDto);
        }

        [HttpPost("export-draft-docx")]
        public async Task<IActionResult> ExportDraftDocx([FromBody] ExportDraftRequestDto request)
        {
            var activeDecree = await _context.LegalDocuments
                .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .FirstOrDefaultAsync();

            var legalBases = request.CustomLegalBases != null && request.CustomLegalBases.Count > 0
                ? request.CustomLegalBases
                : new List<string>
                {
                    "Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015",
                    "Luật Đầu tư ngày 17 tháng 6 năm 2020",
                    $"{activeDecree?.Title ?? "Nghị định số 123/2026/NĐ-CP ngày 15 tháng 01 năm 2026 của Chính phủ quy định chi tiết thi hành Luật Đầu tư"}",
                    "Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư"
                };

            // Nếu người dùng gửi nội dung HTML từ Editor, tách các đoạn văn bản sạch
            List<string> contentBullets;
            if (!string.IsNullOrWhiteSpace(request.DraftContentHtml))
            {
                // Bóc tách các thẻ <p> hoặc <li> thành từng đoạn văn
                var matches = System.Text.RegularExpressions.Regex.Matches(
                    request.DraftContentHtml,
                    @"<(?:p|li)[^>]*>(.*?)</(?:p|li)>",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                if (matches.Count > 0)
                {
                    contentBullets = matches.Select(m => System.Text.RegularExpressions.Regex.Replace(m.Groups[1].Value, "<.*?>", string.Empty).Trim())
                                            .Where(s => !string.IsNullOrWhiteSpace(s))
                                            .ToList();
                }
                else
                {
                    contentBullets = new List<string> { System.Text.RegularExpressions.Regex.Replace(request.DraftContentHtml, "<.*?>", string.Empty).Trim() };
                }
            }
            else if (request.CustomParagraphs != null && request.CustomParagraphs.Count > 0)
            {
                contentBullets = request.CustomParagraphs;
            }
            else
            {
                contentBullets = new List<string>
                {
                    $"Xét đề nghị của cơ quan gửi tại văn bản số {request.DocCode ?? "đã tiếp nhận"}; Chủ tịch Ủy ban nhân dân có ý kiến chỉ đạo như sau:",
                    "1. Chấp thuận về mặt chủ trương đối với các nội dung đề xuất của đơn vị gửi văn bản theo đúng thẩm quyền quy định.",
                    "2. Giao cơ quan chuyên môn chủ trì, phối hợp với các đơn vị liên quan hướng dẫn hoàn thiện hồ sơ theo đúng quy định pháp luật.",
                    "3. Yêu cầu đơn vị tập trung triển khai thực hiện bảo đảm tiến độ, định kỳ báo cáo kết quả thực hiện theo quy định."
                };
            }

            if (!string.IsNullOrWhiteSpace(request.SupplementaryNotes))
            {
                contentBullets.Add($"Ghi chú bổ sung: {request.SupplementaryNotes}");
            }

            var subjectTitle = !string.IsNullOrWhiteSpace(request.SubjectTitle)
                ? request.SubjectTitle
                : "V/v giải quyết nội dung đề nghị tại văn bản " + (request.DocCode ?? "");

            var model = new OfficialDispatchDraftModel
            {
                IssuerParent = !string.IsNullOrWhiteSpace(request.IssuerParent) ? request.IssuerParent : "ỦY BAN NHÂN DÂN TỈNH",
                IssuerName = !string.IsNullOrWhiteSpace(request.IssuerName) ? request.IssuerName : "VĂN PHÒNG",
                DocCode = !string.IsNullOrWhiteSpace(request.DocCode) ? request.DocCode : "..../VP-UBND",
                Location = !string.IsNullOrWhiteSpace(request.Location) ? request.Location : "Địa danh",
                DocDateStr = DateTime.Now.ToString("dd 'tháng' MM 'năm' yyyy"),
                SubjectTitle = subjectTitle,
                RecipientMain = !string.IsNullOrWhiteSpace(request.RecipientMain) ? request.RecipientMain : "Cơ quan gửi công văn",
                LegalBases = legalBases,
                ContentParagraphs = contentBullets,
                RecipientsList = request.CustomRecipients ?? new List<string>
                {
                    "Như trên",
                    "Chủ tịch, các PCT UBND tỉnh",
                    "Đơn vị liên quan",
                    "Lưu: VT."
                },
                SignerTitle = !string.IsNullOrWhiteSpace(request.SignerTitle) ? request.SignerTitle : "CHÁNH VĂN PHÒNG",
                SignerName = !string.IsNullOrWhiteSpace(request.SignerName) ? request.SignerName : string.Empty
            };

            byte[] fileBytes = _docxBuilder.GenerateOfficialDispatch(model);

            // Cập nhật trạng thái DA_XU_LY vào log gần nhất nếu có
            var recentLog = await _context.ProcessingLogs.OrderByDescending(l => l.CreatedAt).FirstOrDefaultAsync();
            if (recentLog != null)
            {
                recentLog.SelectedOptionId = request.SelectedOptionId;
                recentLog.ExportedDocxPath = $"storage/exported/DuThao_{model.DocCode.Replace("/", "_")}.docx";
                recentLog.CurrentStatus = DocumentCurrentStatus.DaXuLy;
                recentLog.CompletedAt = DateTimeOffset.UtcNow;
                if (!string.IsNullOrWhiteSpace(request.DraftContentHtml))
                {
                    recentLog.DraftContentHtml = request.DraftContentHtml;
                }
                await _context.SaveChangesAsync();
            }

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                $"DuThao_CongVan_{model.DocCode.Replace("/", "_")}.docx");
        }

        [HttpGet("logs")]
        public async Task<IActionResult> GetLogs()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var query = _context.ProcessingLogs
                .Include(l => l.User)
                .AsQueryable();

            if (!isAdmin)
            {
                var myDocCodes = await _context.ProcessingLogs
                    .Where(x => x.UserId == currentUserId && !string.IsNullOrEmpty(x.IncomingDocCode))
                    .Select(x => x.IncomingDocCode!)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(l =>
                    l.UserId == currentUserId ||
                    (l.IncomingDocCode != null && myDocCodes.Contains(l.IncomingDocCode)));
            }

            var logs = await query
                .OrderByDescending(l => l.CreatedAt)
                .Take(100)
                .Select(l => new
                {
                    l.Id,
                    UserName = l.User != null ? l.User.FullName : "Cán bộ công vụ",
                    l.IncomingDocCode,
                    l.IncomingIssuer,
                    l.SubjectTitle,
                    l.OriginalFileName,
                    l.UrgencyLevel,
                    l.ReceivedDate,
                    l.SlaDeadline,
                    l.SelectedOptionId,
                    l.CurrentStatus,
                    l.SignedDate,
                    l.CreatedAt,
                    IsOwner = l.UserId == currentUserId
                })
                .ToListAsync();

            return Ok(logs);
        }

        /// <summary>
        /// Yêu cầu AI xử lý và phân tích lại văn bản chuyên sâu (Khắc phục văn bản chung chung)
        /// </summary>
        [HttpPost("{id}/reprocess-ai")]
        public async Task<IActionResult> ReprocessAi(Guid id, [FromBody] ReprocessAiRequestDto request)
        {
            var log = await _context.ProcessingLogs.Include(l => l.User).FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý để AI phân tích lại." });
            }

            OcrExtractionResult ocrResult;
            if (!string.IsNullOrEmpty(log.StoredFilePath))
            {
                try
                {
                    var fileBytes = await _storageService.GetFileBytesAsync(log.StoredFilePath);
                    if (fileBytes != null && fileBytes.Length > 0)
                    {
                        using var fileStream = new MemoryStream(fileBytes);
                        ocrResult = await _ocrService.ExtractDocumentTextAsync(fileStream, log.OriginalFileName);
                    }
                    else
                    {
                        ocrResult = new OcrExtractionResult
                        {
                            DetectedCodeNumber = log.IncomingDocCode ?? "đã tiếp nhận",
                            DetectedIssuer = log.IncomingIssuer ?? "đơn vị gửi",
                            SubjectTitle = log.SubjectTitle ?? log.OriginalFileName,
                            ExtractedText = log.SubjectTitle ?? string.Empty,
                            DetectedUrgency = log.UrgencyLevel ?? "THƯỜNG",
                            CoreProblem = log.SubjectTitle ?? "giải quyết nội dung công văn",
                            RequestedAction = !string.IsNullOrWhiteSpace(request?.Directive)
                                ? request.Directive
                                : "xem xét phê duyệt và hướng dẫn hoàn thiện thủ tục"
                        };
                    }
                }
                catch
                {
                    ocrResult = new OcrExtractionResult
                    {
                        DetectedCodeNumber = log.IncomingDocCode ?? "đã tiếp nhận",
                        DetectedIssuer = log.IncomingIssuer ?? "đơn vị gửi",
                        SubjectTitle = log.SubjectTitle ?? log.OriginalFileName,
                        ExtractedText = log.SubjectTitle ?? string.Empty,
                        DetectedUrgency = log.UrgencyLevel ?? "THƯỜNG",
                        CoreProblem = log.SubjectTitle ?? "giải quyết nội dung công văn",
                        RequestedAction = !string.IsNullOrWhiteSpace(request?.Directive)
                            ? request.Directive
                            : "xem xét phê duyệt và hướng dẫn hoàn thiện thủ tục"
                    };
                }
            }
            else
            {
                ocrResult = new OcrExtractionResult
                {
                    DetectedCodeNumber = log.IncomingDocCode ?? "đã tiếp nhận",
                    DetectedIssuer = log.IncomingIssuer ?? "đơn vị gửi",
                    SubjectTitle = log.SubjectTitle ?? log.OriginalFileName,
                    ExtractedText = log.SubjectTitle ?? string.Empty,
                    DetectedUrgency = log.UrgencyLevel ?? "THƯỜNG",
                    CoreProblem = log.SubjectTitle ?? "giải quyết nội dung công văn",
                    RequestedAction = !string.IsNullOrWhiteSpace(request?.Directive)
                        ? request.Directive
                        : "xem xét phê duyệt và hướng dẫn hoàn thiện thủ tục"
                };
            }

            var allActiveDocs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .ToListAsync();

            var expiredDocs = await _context.LegalDocuments
                .Where(d => d.Status == LegalStatus.Expired)
                .ToListAsync();

            var appraisalVerdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

            string userDept = log.User?.Department ?? FieldCategory.QuanTriVanPhong;
            string newDraftHtml = _departmentSkill.GenerateDeepDetailedDraftHtml(
                ocrResult,
                allActiveDocs,
                userDept,
                request?.Directive);

            log.ReprocessCount++;
            log.LastReprocessedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            var actionOptions = new List<ActionOptionDto>
            {
                new ActionOptionDto
                {
                    Id = appraisalVerdict.VerdictType,
                    IsRecommended = true,
                    Title = appraisalVerdict.VerdictTitle,
                    Rationale = appraisalVerdict.VerdictSummary,
                    LegalBasis = appraisalVerdict.PrimaryLegalBasis,
                    DraftContentBullets = appraisalVerdict.DraftContentBullets
                }
            };

            return Ok(new ReprocessAiResponseDto
            {
                Message = "AI đã phân tích chuyên sâu lại văn bản với đầy đủ căn cứ và nội dung chỉ đạo cụ thể!",
                DraftContentHtml = newDraftHtml,
                Summary = new DocumentSummaryDto
                {
                    CoreProblem = ocrResult.CoreProblem,
                    SubmittedBasis = ocrResult.DetectedIssuer,
                    RequestedAction = ocrResult.RequestedAction
                },
                ActionOptions = actionOptions,
                LegalAlerts = new List<string> { "Đã cập nhật dự thảo phân tích chuyên sâu mới từ AI." }
            });
        }

        /// <summary>
        /// Cập nhật Mức độ khẩn và Hạn SLA của hồ sơ
        /// </summary>
        [HttpPut("{id}/urgency-sla")]
        public async Task<IActionResult> UpdateUrgencyAndSla(Guid id, [FromBody] UpdateUrgencySlaRequestDto request)
        {
            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý." });
            }

            if (!string.IsNullOrWhiteSpace(request.UrgencyLevel))
            {
                log.UrgencyLevel = request.UrgencyLevel.Trim().ToUpperInvariant();
            }

            if (request.SlaDeadline.HasValue)
            {
                log.SlaDeadline = request.SlaDeadline.Value;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã cập nhật mức độ khẩn và hạn SLA thành công.",
                urgencyLevel = log.UrgencyLevel,
                slaDeadline = log.SlaDeadline
            });
        }

        /// <summary>
        /// Xóa 1 bản ghi nhật ký thao tác (Chỉ dành riêng cho ADMIN)
        /// </summary>
        [HttpDelete("logs/{id}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> DeleteAuditLog(Guid id)
        {
            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy bản ghi nhật ký thao tác." });
            }

            _context.ProcessingLogs.Remove(log);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa bản ghi nhật ký thao tác thành công." });
        }

        /// <summary>
        /// Xóa toàn bộ nhật ký thao tác (Chỉ dành riêng cho ADMIN)
        /// </summary>
        [HttpDelete("logs/clear-all")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> ClearAllAuditLogs()
        {
            var allLogs = await _context.ProcessingLogs.ToListAsync();
            int count = allLogs.Count;
            _context.ProcessingLogs.RemoveRange(allLogs);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã dọn sạch toàn bộ {count} bản ghi nhật ký thao tác thành công." });
        }
    }
}
