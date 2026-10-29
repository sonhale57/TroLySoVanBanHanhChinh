using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GovDoc.Infrastructure.Services
{
    public class DocumentQueueBackgroundService : BackgroundService
    {
        private readonly IBackgroundTaskQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DocumentQueueBackgroundService> _logger;

        public DocumentQueueBackgroundService(
            IBackgroundTaskQueue queue,
            IServiceScopeFactory scopeFactory,
            ILogger<DocumentQueueBackgroundService> logger)
        {
            _queue = queue;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Background Task Queue Worker đã sẵn sàng tiếp nhận xử lý tuần tự (FIFO)...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var item = await _queue.DequeueAsync(stoppingToken);
                    if (item == null) continue;

                    _logger.LogInformation("Bắt đầu xử lý ngầm tệp: {FileName} (TrackingId: {TrackingId})", item.FileName, item.TrackingId);
                    _queue.UpdateTaskStatus(item.TrackingId, QueueTaskStatus.Processing);

                    using var scope = _scopeFactory.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var ocrService = scope.ServiceProvider.GetRequiredService<IOcrService>();
                    var storageService = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
                    var appraisalEngine = scope.ServiceProvider.GetRequiredService<IAdministrativeAppraisalEngine>();
                    var departmentSkill = scope.ServiceProvider.GetRequiredService<IDepartmentSkillService>();

                    // 1. Lưu trữ tệp đính kèm gốc
                    using var ms = new MemoryStream(item.FileBytes);
                    var relativePath = await storageService.SaveFileAsync(ms, item.FileName, "incoming");
                    ms.Position = 0;

                    // 2. OCR phân vùng và trích xuất thực thể
                    var ocrResult = await ocrService.ExtractDocumentTextAsync(ms, item.FileName);

                    // 3. Tra cứu văn bản pháp luật hiện hành và cảnh báo văn bản hết hiệu lực
                    var allActiveDocs = await context.LegalDocuments
                        .Include(d => d.ClauseNodes)
                        .Where(d => d.Status == LegalStatus.Active && !d.IsDraft)
                        .OrderByDescending(d => d.HierarchyRank)
                        .ThenByDescending(d => d.IssuedDate)
                        .ToListAsync(stoppingToken);

                    var expiredDocs = await context.LegalDocuments
                        .Where(d => d.Status == LegalStatus.Expired)
                        .ToListAsync(stoppingToken);

                    var alerts = new List<string>();
                    foreach (var exp in expiredDocs)
                    {
                        if (ocrResult.ExtractedText.Contains(exp.CodeNumber))
                        {
                            alerts.Add($"Cảnh báo pháp lý: Văn bản số {exp.CodeNumber} ({exp.Title}) đã hết hiệu lực từ ngày {exp.ExpiredDate:dd/MM/yyyy}.");
                        }
                    }

                    // 4. Động cơ thẩm định và sinh kết luận
                    var appraisalVerdict = await appraisalEngine.EvaluateDocumentAsync(ocrResult, allActiveDocs, expiredDocs);

                    // 5. Sinh bản thảo ban đầu chuẩn Nghị định 30 theo Kỹ năng phòng ban
                    string department = !string.IsNullOrWhiteSpace(item.UserDepartment) ? item.UserDepartment : FieldCategory.QuanTriVanPhong;
                    string draftHtml = departmentSkill.GenerateInitialDraftHtml(ocrResult, allActiveDocs, department);

                    var resultDto = new ProcessIncomingResultDto
                    {
                        TaskId = item.TrackingId,
                        DocumentInfo = new DocumentInfoDto
                        {
                            Issuer = ocrResult.DetectedIssuer,
                            CodeNumber = ocrResult.DetectedCodeNumber,
                            IssuedDate = ocrResult.DetectedIssuedDate?.ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                            Urgency = ocrResult.DetectedUrgency,
                            SubjectTitle = ocrResult.SubjectTitle,
                            SlaDeadline = ocrResult.CalculatedSlaDeadline,
                            PreviewUrl = $"/api/v1/storage/file/{relativePath}",
                            OriginalFileName = item.FileName
                        },
                        Summary = new DocumentSummaryDto
                        {
                            CoreProblem = ocrResult.CoreProblem,
                            SubmittedBasis = ocrResult.SubmittedBasis,
                            RequestedAction = ocrResult.RequestedAction
                        },
                        AppraisalVerdict = appraisalVerdict,
                        ActionOptions = new List<ActionOptionDto>
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
                        },
                        LegalAlerts = alerts,
                        ExtractedRawText = ocrResult.ExtractedText,
                        InitialDraftHtml = draftHtml,
                        CurrentStatus = DocumentCurrentStatus.ChoXuLy
                    };

                    // 6. Ghi nhận vào CSDL với trạng thái CHO_XU_LY
                    var log = new ProcessingLog
                    {
                        Id = Guid.NewGuid(),
                        UserId = item.UserId,
                        IncomingDocCode = resultDto.DocumentInfo.CodeNumber,
                        IncomingIssuer = resultDto.DocumentInfo.Issuer,
                        SubjectTitle = resultDto.DocumentInfo.SubjectTitle,
                        OriginalFileName = item.FileName,
                        StoredFilePath = relativePath,
                        UrgencyLevel = resultDto.DocumentInfo.Urgency,
                        ReceivedDate = item.EnqueuedAt,
                        SlaDeadline = resultDto.DocumentInfo.SlaDeadline,
                        SummaryDataJson = JsonSerializer.Serialize(resultDto.Summary),
                        SelectedOptionId = appraisalVerdict.VerdictType,
                        LegalBasesUsedJson = JsonSerializer.Serialize(new[] { appraisalVerdict.PrimaryLegalBasis }),
                        ResultDataJson = JsonSerializer.Serialize(resultDto),
                        DraftContentHtml = draftHtml,
                        CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                        TrackingId = item.TrackingId,
                        ClientIp = item.ClientIp,
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    context.ProcessingLogs.Add(log);
                    await context.SaveChangesAsync(stoppingToken);

                    resultDto.ProcessingLogId = log.Id;

                    _queue.UpdateTaskStatus(item.TrackingId, QueueTaskStatus.Completed, null, log.Id, resultDto);
                    _logger.LogInformation("Xử lý ngầm thành công tệp: {FileName} -> ProcessingLogId: {LogId}", item.FileName, log.Id);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi xảy ra trong quá trình xử lý ngầm hàng đợi: {Message}", ex.Message);
                }
            }
        }
    }
}
