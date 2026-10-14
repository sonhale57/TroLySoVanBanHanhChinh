using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using GovDoc.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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

        public DocumentsController(
            ApplicationDbContext context,
            IOcrService ocrService,
            IFileStorageService storageService,
            IDocxBuilderService docxBuilder,
            IAdministrativeAppraisalEngine appraisalEngine)
        {
            _context = context;
            _ocrService = ocrService;
            _storageService = storageService;
            _docxBuilder = docxBuilder;
            _appraisalEngine = appraisalEngine;
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

            // 1. Phân tích OCR và trích xuất thực thể theo Nghị định 30
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

            var searchTerms = (ocrResult.SubjectTitle + " " + ocrResult.CoreProblem)
                .Split(new[] { ' ', ',', ';', '-', '/', '.', ':', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length > 2)
                .Select(t => t.ToLowerInvariant())
                .Distinct()
                .Take(15)
                .ToList();

            var alerts = new List<string>();
            foreach (var exp in expiredDocs)
            {
                if (ocrResult.ExtractedText.Contains(exp.CodeNumber) || searchTerms.Any(t => exp.CodeNumber.ToLowerInvariant().Contains(t)))
                {
                    alerts.Add($"Cảnh báo pháp lý: Văn bản số {exp.CodeNumber} ({exp.Title}) đã hết hiệu lực từ ngày {exp.ExpiredDate:dd/MM/yyyy}. Hệ thống tự động khóa không đưa vào căn cứ hợp lệ.");
                }
            }

            // 3. ĐỘNG CƠ THẨM ĐỊNH TỰ ĐỘNG TÍNH TOÁN KẾT LUẬN DUY NHẤT
            var appraisalVerdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

            // Tương thích ngược với các thành phần cũ
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
                ExtractedRawText = ocrResult.ExtractedText
            };

            // Lưu log xử lý định danh cán bộ
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid recordedUserId = Guid.TryParse(userIdClaim, out var parsedGuid)
                ? parsedGuid
                : (await _context.Users.Select(u => u.Id).FirstOrDefaultAsync());

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
                SlaDeadline = resultDto.DocumentInfo.SlaDeadline,
                SummaryDataJson = JsonSerializer.Serialize(resultDto.Summary),
                SelectedOptionId = appraisalVerdict.VerdictType,
                LegalBasesUsedJson = JsonSerializer.Serialize(new[] { appraisalVerdict.PrimaryLegalBasis }),
                ResultDataJson = JsonSerializer.Serialize(resultDto),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.ProcessingLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(resultDto);
        }

        [HttpGet("processed-records")]
        public async Task<IActionResult> GetProcessedRecords([FromQuery] string? search = null)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var query = _context.ProcessingLogs
                .Include(l => l.User)
                .AsQueryable();

            // Phân quyền: Cán bộ chỉ thấy hồ sơ của mình, Lãnh đạo/Admin thấy tất cả
            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == currentUserId);
            }

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
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new ProcessedRecordListItemDto
                {
                    Id = l.Id,
                    IncomingDocCode = l.IncomingDocCode,
                    IncomingIssuer = l.IncomingIssuer,
                    SubjectTitle = l.SubjectTitle,
                    OriginalFileName = l.OriginalFileName,
                    UrgencyLevel = l.UrgencyLevel,
                    SlaDeadline = l.SlaDeadline,
                    SelectedOptionId = l.SelectedOptionId,
                    CreatedAt = l.CreatedAt,
                    ReprocessCount = l.ReprocessCount,
                    LastReprocessedAt = l.LastReprocessedAt,
                    UserName = l.User != null ? l.User.FullName : "Cán bộ công vụ",
                    Department = l.User != null ? l.User.Department : "Văn phòng",
                    HasStoredFile = !string.IsNullOrEmpty(l.StoredFilePath)
                })
                .ToListAsync();

            return Ok(records);
        }

        [HttpGet("processed-records/{id}")]
        public async Task<IActionResult> GetProcessedRecordDetail(Guid id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs
                .Include(l => l.User)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            // Kiểm tra quyền truy cập
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
                SlaDeadline = log.SlaDeadline,
                SelectedOptionId = log.SelectedOptionId,
                SummaryDataJson = log.SummaryDataJson,
                LegalBasesUsedJson = log.LegalBasesUsedJson,
                ResultDataJson = log.ResultDataJson,
                ExportedDocxPath = log.ExportedDocxPath,
                CreatedAt = log.CreatedAt,
                UserName = log.User != null ? log.User.FullName : "Cán bộ công vụ",
                Department = log.User != null ? log.User.Department : "Văn phòng",
                ReprocessCount = log.ReprocessCount,
                LastReprocessedAt = log.LastReprocessedAt,
                HasStoredFile = !string.IsNullOrEmpty(log.StoredFilePath)
            };

            return Ok(detail);
        }

        [HttpPost("processed-records/{id}/reprocess")]
        public async Task<IActionResult> ReprocessDocument(Guid id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var log = await _context.ProcessingLogs.FirstOrDefaultAsync(l => l.Id == id);
            if (log == null)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ xử lý công văn." });
            }

            // Kiểm tra phân quyền: User thường chỉ được xử lý lại hồ sơ của mình
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

            // Tra cứu lại từ Tủ sách pháp luật mới nhất
            var allActiveDocs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .ToListAsync();

            var expiredDocs = await _context.LegalDocuments
                .Where(d => d.Status == LegalStatus.Expired)
                .ToListAsync();

            var searchTerms = (ocrResult.SubjectTitle + " " + ocrResult.CoreProblem)
                .Split(new[] { ' ', ',', ';', '-', '/', '.', ':', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length > 2)
                .Select(t => t.ToLowerInvariant())
                .Distinct()
                .Take(15)
                .ToList();

            var alerts = new List<string>();
            foreach (var exp in expiredDocs)
            {
                if (ocrResult.ExtractedText.Contains(exp.CodeNumber) || searchTerms.Any(t => exp.CodeNumber.ToLowerInvariant().Contains(t)))
                {
                    alerts.Add($"Cảnh báo pháp lý: Văn bản số {exp.CodeNumber} ({exp.Title}) đã hết hiệu lực từ ngày {exp.ExpiredDate:dd/MM/yyyy}. Hệ thống tự động khóa không đưa vào căn cứ hợp lệ.");
                }
            }

            var appraisalVerdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

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
                ExtractedRawText = ocrResult.ExtractedText
            };

            // Cập nhật kết quả vào bản ghi ProcessingLog
            log.ReprocessCount += 1;
            log.LastReprocessedAt = DateTimeOffset.UtcNow;
            log.IncomingDocCode = resultDto.DocumentInfo.CodeNumber;
            log.IncomingIssuer = resultDto.DocumentInfo.Issuer;
            log.SubjectTitle = resultDto.DocumentInfo.SubjectTitle;
            log.UrgencyLevel = resultDto.DocumentInfo.Urgency;
            log.SlaDeadline = resultDto.DocumentInfo.SlaDeadline;
            log.SummaryDataJson = JsonSerializer.Serialize(resultDto.Summary);
            log.SelectedOptionId = appraisalVerdict.VerdictType;
            log.LegalBasesUsedJson = JsonSerializer.Serialize(new[] { appraisalVerdict.PrimaryLegalBasis });
            log.ResultDataJson = JsonSerializer.Serialize(resultDto);

            await _context.SaveChangesAsync();

            return Ok(resultDto);
        }

        [HttpPost("export-draft-docx")]
        public async Task<IActionResult> ExportDraftDocx([FromBody] ExportDraftRequestDto request)
        {
            var defaultUser = await _context.Users.FirstOrDefaultAsync();

            // Căn cứ pháp lý chuẩn Nghị định 30 (chỉ lấy văn bản ACTIVE, cấm DRAFT và EXPIRED)
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

            var contentBullets = request.CustomParagraphs != null && request.CustomParagraphs.Count > 0
                ? request.CustomParagraphs
                : new List<string>
                {
                    $"Xét đề nghị của cơ quan gửi tại văn bản số {request.DocCode ?? "đã tiếp nhận"}; Chủ tịch Ủy ban nhân dân có ý kiến chỉ đạo như sau:",
                    "1. Chấp thuận về mặt chủ trương đối với các nội dung đề xuất của đơn vị gửi văn bản theo đúng thẩm quyền quy định.",
                    "2. Giao cơ quan chuyên môn chủ trì, phối hợp với các đơn vị liên quan hướng dẫn hoàn thiện hồ sơ theo đúng quy định pháp luật.",
                    "3. Yêu cầu đơn vị tập trung triển khai thực hiện bảo đảm tiến độ, định kỳ báo cáo kết quả thực hiện theo quy định."
                };

            if (!string.IsNullOrWhiteSpace(request.SupplementaryNotes))
            {
                contentBullets.Add($"Ghi chú bổ sung: {request.SupplementaryNotes}");
            }

            var subjectTitle = !string.IsNullOrWhiteSpace(request.SubjectTitle)
                ? request.SubjectTitle
                : "V/v giải quyết nội dung đề nghị tại văn bản " + (request.DocCode ?? "");

            var model = new OfficialDispatchDraftModel
            {
                IssuerParent = request.IssuerParent ?? "ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG",
                IssuerName = request.IssuerName ?? "VĂN PHÒNG",
                DocCode = request.DocCode ?? "142/VP-KT",
                Location = request.Location ?? "Bình Dương",
                DocDateStr = DateTime.Now.ToString("dd 'tháng' MM 'năm' yyyy"),
                SubjectTitle = subjectTitle,
                RecipientMain = request.RecipientMain ?? "Cơ quan gửi công văn",
                LegalBases = legalBases,
                ContentParagraphs = contentBullets,
                RecipientsList = request.CustomRecipients ?? new List<string>
                {
                    "Như trên",
                    "Chủ tịch, các PCT UBND tỉnh",
                    "UBND huyện sở tại",
                    "Lưu: VT, KT."
                },
                SignerTitle = request.SignerTitle ?? "CHÁNH VĂN PHÒNG",
                SignerName = request.SignerName ?? "Nguyễn Văn Hùng"
            };

            // Sinh tệp docx chuẩn lề mm theo Nghị định 30
            byte[] fileBytes = _docxBuilder.GenerateOfficialDispatch(model);

            // Cập nhật đường dẫn vào log
            var recentLog = await _context.ProcessingLogs.OrderByDescending(l => l.CreatedAt).FirstOrDefaultAsync();
            if (recentLog != null)
            {
                recentLog.SelectedOptionId = request.SelectedOptionId;
                recentLog.ExportedDocxPath = $"storage/exported/DuThao_{model.DocCode.Replace("/", "_")}.docx";
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
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var query = _context.ProcessingLogs
                .Include(l => l.User)
                .AsQueryable();

            // Phân quyền chặt chẽ theo yêu cầu:
            // Admin thấy tất cả.
            // User chỉ thấy: Lịch sử do chính mình xử lý HOẶC thao tác liên quan đến hồ sơ do chính user đó đã tải lên.
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
                    l.SlaDeadline,
                    l.SelectedOptionId,
                    l.CreatedAt,
                    IsOwner = l.UserId == currentUserId
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}
