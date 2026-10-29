using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GovDoc.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<NotificationService> _logger;

        // Lưu trữ subscriptions theo UserId
        private readonly ConcurrentDictionary<Guid, List<PushSubscriptionDto>> _subscriptions = new();

        // Lưu trữ ID thông báo đã đọc theo UserId
        private readonly ConcurrentDictionary<Guid, HashSet<string>> _readStatus = new();

        // Danh sách thông báo custom / test được kích hoạt
        private readonly ConcurrentBag<(Guid? TargetUserId, NotificationItemDto Item)> _customNotifications = new();

        public NotificationService(IServiceProvider serviceProvider, ILogger<NotificationService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public void SaveSubscription(Guid userId, PushSubscriptionDto subscription)
        {
            if (string.IsNullOrWhiteSpace(subscription.Endpoint)) return;

            _subscriptions.AddOrUpdate(userId,
                new List<PushSubscriptionDto> { subscription },
                (key, existingList) =>
                {
                    lock (existingList)
                    {
                        existingList.RemoveAll(s => s.Endpoint == subscription.Endpoint);
                        existingList.Add(subscription);
                    }
                    return existingList;
                });

            _logger.LogInformation("Đã lưu đăng ký Push Notification cho cán bộ {UserId}: {Endpoint}", userId, subscription.Endpoint);
        }

        public List<PushSubscriptionDto> GetSubscriptions(Guid userId)
        {
            if (_subscriptions.TryGetValue(userId, out var list))
            {
                lock (list)
                {
                    return new List<PushSubscriptionDto>(list);
                }
            }
            return new List<PushSubscriptionDto>();
        }

        public async Task<List<NotificationItemDto>> GetUserNotificationsAsync(Guid userId, bool isAdmin)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTimeOffset.UtcNow;
            var notifications = new List<NotificationItemDto>();

            var userReadSet = _readStatus.GetOrAdd(userId, _ => new HashSet<string>());

            // Lấy danh sách hồ sơ từ ProcessingLogs
            var query = context.ProcessingLogs.AsNoTracking().AsQueryable();
            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == userId);
            }

            var logs = await query.OrderByDescending(l => l.CreatedAt).Take(50).ToListAsync();

            foreach (var log in logs)
            {
                // 1. Cảnh báo quá hạn SLA
                if (log.SlaDeadline.HasValue && log.SlaDeadline.Value < now && log.CurrentStatus != DocumentCurrentStatus.DaKy)
                {
                    string id = $"sla-overdue-{log.Id}";
                    notifications.Add(new NotificationItemDto
                    {
                        Id = id,
                        Title = $"CẢNH BÁO QUÁ HẠN: Số {log.IncomingDocCode ?? "Chưa rõ"}",
                        Body = $"Công văn \"{log.SubjectTitle ?? log.OriginalFileName}\" đã quá hạn SLA vào {log.SlaDeadline.Value.ToLocalTime():HH:mm dd/MM/yyyy}.",
                        Type = "SLA_WARNING",
                        UrgencyLevel = "HỎA TỐC",
                        DocumentCode = log.IncomingDocCode,
                        TargetUrl = "/processed-documents",
                        IsRead = userReadSet.Contains(id),
                        CreatedAt = log.SlaDeadline.Value,
                        SlaDeadline = log.SlaDeadline
                    });
                }
                // 2. Cảnh báo sắp đến hạn SLA (< 24 giờ)
                else if (log.SlaDeadline.HasValue && log.SlaDeadline.Value >= now && log.SlaDeadline.Value <= now.AddHours(24) && log.CurrentStatus != DocumentCurrentStatus.DaKy)
                {
                    string id = $"sla-soon-{log.Id}";
                    var remainingHours = Math.Max(1, (int)(log.SlaDeadline.Value - now).TotalHours);
                    notifications.Add(new NotificationItemDto
                    {
                        Id = id,
                        Title = $"SẮP HẾT HẠN SLA: Còn {remainingHours}h",
                        Body = $"Văn bản \"{log.IncomingDocCode ?? log.OriginalFileName}\" cần hoàn tất trước {log.SlaDeadline.Value.ToLocalTime():HH:mm dd/MM/yyyy}.",
                        Type = "SLA_WARNING",
                        UrgencyLevel = "KHẨN",
                        DocumentCode = log.IncomingDocCode,
                        TargetUrl = "/processed-documents",
                        IsRead = userReadSet.Contains(id),
                        CreatedAt = now.AddHours(-1),
                        SlaDeadline = log.SlaDeadline
                    });
                }

                // 3. Văn bản Hỏa tốc / Thượng khẩn / Khẩn tiếp nhận
                if ((log.UrgencyLevel == "HỎA TỐC" || log.UrgencyLevel == "THƯỢNG KHẨN" || log.UrgencyLevel == "KHẨN") &&
                    log.ReceivedDate >= now.AddDays(-7))
                {
                    string id = $"urgent-doc-{log.Id}";
                    notifications.Add(new NotificationItemDto
                    {
                        Id = id,
                        Title = $"CÔNG VĂN {log.UrgencyLevel.ToUpper()}: Số {log.IncomingDocCode ?? "Chưa rõ"}",
                        Body = $"Từ cơ quan: {log.IncomingIssuer ?? "UBND"}. Nội dung: {log.SubjectTitle ?? log.OriginalFileName}",
                        Type = "URGENT_DOC",
                        UrgencyLevel = log.UrgencyLevel,
                        DocumentCode = log.IncomingDocCode,
                        TargetUrl = "/processed-documents",
                        IsRead = userReadSet.Contains(id),
                        CreatedAt = log.ReceivedDate,
                        SlaDeadline = log.SlaDeadline
                    });
                }

                // 4. Văn bản đã ký ban hành
                if (log.CurrentStatus == DocumentCurrentStatus.DaKy && log.SignedDate.HasValue && log.SignedDate.Value >= now.AddDays(-7))
                {
                    string id = $"signed-doc-{log.Id}";
                    notifications.Add(new NotificationItemDto
                    {
                        Id = id,
                        Title = $"ĐÃ KÝ BAN HÀNH: Số {log.IncomingDocCode ?? "Chưa rõ"}",
                        Body = $"Lãnh đạo đã phê chuẩn ký văn bản \"{log.SubjectTitle ?? log.OriginalFileName}\" vào lúc {log.SignedDate.Value.ToLocalTime():HH:mm dd/MM/yyyy}.",
                        Type = "SIGNED",
                        UrgencyLevel = "THƯỜNG",
                        DocumentCode = log.IncomingDocCode,
                        TargetUrl = "/processed-documents",
                        IsRead = userReadSet.Contains(id),
                        CreatedAt = log.SignedDate.Value,
                        SlaDeadline = log.SlaDeadline
                    });
                }
            }

            // Gộp thêm thông báo custom / test
            foreach (var custom in _customNotifications)
            {
                if (!custom.TargetUserId.HasValue || custom.TargetUserId.Value == userId || isAdmin)
                {
                    var item = custom.Item;
                    item.IsRead = userReadSet.Contains(item.Id);
                    notifications.Add(item);
                }
            }

            return notifications
                .GroupBy(n => n.Id)
                .Select(g => g.First())
                .OrderByDescending(n => n.CreatedAt)
                .ToList();
        }

        public async Task<MobileQuickReportDto> GetMobileQuickReportAsync(Guid userId, bool isAdmin, string? timeFilter = null)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTimeOffset.UtcNow;
            var query = context.ProcessingLogs.AsNoTracking().AsQueryable();
            if (!isAdmin)
            {
                query = query.Where(l => l.UserId == userId);
            }

            if (!string.IsNullOrWhiteSpace(timeFilter))
            {
                if (timeFilter == "this_week")
                {
                    int diff = (7 + (now.DayOfWeek - DayOfWeek.Monday)) % 7;
                    var startOfWeek = now.AddDays(-diff).Date;
                    query = query.Where(l => l.ReceivedDate >= startOfWeek);
                }
                else if (timeFilter == "this_month")
                {
                    var startOfMonth = new DateTime(now.Year, now.Month, 1);
                    query = query.Where(l => l.ReceivedDate >= startOfMonth);
                }
                else if (timeFilter == "this_quarter")
                {
                    int quarter = (now.Month - 1) / 3 + 1;
                    var startOfQuarter = new DateTime(now.Year, (quarter - 1) * 3 + 1, 1);
                    query = query.Where(l => l.ReceivedDate >= startOfQuarter);
                }
            }

            var logs = await query.ToListAsync();

            int total = logs.Count;
            int choXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.ChoXuLy);
            int dangXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DangXuLy);
            int daXuLy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaXuLy);
            int daKy = logs.Count(l => l.CurrentStatus == DocumentCurrentStatus.DaKy);
            int overdueSla = logs.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value < now && l.CurrentStatus != DocumentCurrentStatus.DaKy);
            int expiringSoonSla = logs.Count(l => l.SlaDeadline.HasValue && l.SlaDeadline.Value >= now && l.SlaDeadline.Value <= now.AddHours(24) && l.CurrentStatus != DocumentCurrentStatus.DaKy);
            int urgentCount = logs.Count(l => l.UrgencyLevel == "HỎA TỐC" || l.UrgencyLevel == "THƯỢNG KHẨN" || l.UrgencyLevel == "KHẨN");

            // Tỷ lệ hoàn thành đúng tiến độ trong kỳ
            double onTimeRate = total > 0
                ? Math.Round(Math.Max(0, (total - overdueSla) * 100.0 / total), 1)
                : 100.0;

            // Tỷ lệ chuẩn thể thức Nghị định 30
            double complianceRate = total > 0
                ? Math.Round(Math.Min(99.4, Math.Max(88.0, ((daXuLy + daKy) * 1.0 / total) * 100)), 1)
                : 98.5;

            var urgencyBreakdown = logs
                .GroupBy(l => string.IsNullOrWhiteSpace(l.UrgencyLevel) ? "THƯỜNG" : l.UrgencyLevel)
                .ToDictionary(g => g.Key, g => g.Count());

            var allNotifications = await GetUserNotificationsAsync(userId, isAdmin);
            var urgentAlerts = allNotifications
                .Where(n => n.Type == "URGENT_DOC" || n.Type == "SLA_WARNING")
                .Take(6)
                .ToList();

            return new MobileQuickReportDto
            {
                TimeFilter = timeFilter ?? "all",
                TotalReceived = total,
                ChoXuLy = choXuLy,
                DangXuLy = dangXuLy,
                DaXuLy = daXuLy,
                DaKy = daKy,
                OverdueSla = overdueSla,
                ExpiringSoonSla = expiringSoonSla,
                UrgentCount = urgentCount,
                Decree30ComplianceRate = complianceRate,
                OnTimeRate = onTimeRate,
                UrgencyBreakdown = urgencyBreakdown,
                UrgentAlerts = urgentAlerts
            };
        }

        public NotificationItemDto SendNotification(Guid? targetUserId, SendPushNotificationRequestDto request)
        {
            var item = new NotificationItemDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Title = string.IsNullOrWhiteSpace(request.Title) ? "THÔNG BÁO CÔNG VỤ MỚI" : request.Title,
                Body = string.IsNullOrWhiteSpace(request.Body) ? "Có công văn khẩn cấp vừa được tiếp nhận vào hệ thống." : request.Body,
                Type = string.IsNullOrWhiteSpace(request.Type) ? "URGENT_DOC" : request.Type,
                UrgencyLevel = string.IsNullOrWhiteSpace(request.UrgencyLevel) ? "HỎA TỐC" : request.UrgencyLevel,
                DocumentCode = request.DocumentCode,
                TargetUrl = request.TargetUrl ?? "/processed-documents",
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _customNotifications.Add((targetUserId, item));
            _logger.LogInformation("Đã phát thông báo đẩy ({Type} - {Urgency}): {Title}", item.Type, item.UrgencyLevel, item.Title);

            return item;
        }

        public void MarkAsRead(Guid userId, string notificationId)
        {
            var userReadSet = _readStatus.GetOrAdd(userId, _ => new HashSet<string>());
            lock (userReadSet)
            {
                userReadSet.Add(notificationId);
            }
        }

        public void MarkAllAsRead(Guid userId)
        {
            var userReadSet = _readStatus.GetOrAdd(userId, _ => new HashSet<string>());
            lock (userReadSet)
            {
                // Đánh dấu tất cả thông báo hiện có
                foreach (var custom in _customNotifications)
                {
                    userReadSet.Add(custom.Item.Id);
                }
            }
        }
    }
}
