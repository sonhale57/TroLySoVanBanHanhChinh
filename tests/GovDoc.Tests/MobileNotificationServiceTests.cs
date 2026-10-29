using System;
using System.Linq;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using GovDoc.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace GovDoc.Tests
{
    public class MobileNotificationServiceTests
    {
        private ApplicationDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new ApplicationDbContext(options);
        }

        private (NotificationService Service, ApplicationDbContext Context) CreateTestService()
        {
            var services = new ServiceCollection();
            var context = CreateInMemoryDbContext();
            services.AddSingleton(context);
            var serviceProvider = services.BuildServiceProvider();

            var service = new NotificationService(serviceProvider, NullLogger<NotificationService>.Instance);
            return (service, context);
        }

        [Fact]
        public void SaveSubscription_ShouldStoreAndPreventDuplicates()
        {
            // Arrange
            var (service, _) = CreateTestService();
            var userId = Guid.NewGuid();
            var sub1 = new PushSubscriptionDto
            {
                Endpoint = "https://fcm.googleapis.com/fcm/send/token123",
                P256dh = "key-p256dh",
                Auth = "auth-secret",
                DeviceName = "iPhone 15 Pro"
            };

            // Act
            service.SaveSubscription(userId, sub1);
            service.SaveSubscription(userId, sub1); // Duplicate call
            var subs = service.GetSubscriptions(userId);

            // Assert
            Assert.Single(subs);
            Assert.Equal("https://fcm.googleapis.com/fcm/send/token123", subs[0].Endpoint);
            Assert.Equal("iPhone 15 Pro", subs[0].DeviceName);
        }

        [Fact]
        public async Task GetUserNotificationsAsync_ShouldGenerateOverdueAndUrgentAlerts()
        {
            // Arrange
            var (service, context) = CreateTestService();
            var userId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;

            // 1. Quá hạn SLA
            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "99/UBND-VP",
                SubjectTitle = "Công văn quá hạn xử lý bão lụt",
                OriginalFileName = "cv_99.pdf",
                UrgencyLevel = "THƯỜNG",
                ReceivedDate = now.AddDays(-3),
                SlaDeadline = now.AddHours(-5), // Đã quá hạn 5 tiếng
                CurrentStatus = DocumentCurrentStatus.DangXuLy,
                CreatedAt = now.AddDays(-3)
            });

            // 2. Văn bản Hỏa tốc
            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "100/HMC-KHAN",
                SubjectTitle = "Chỉ đạo Hỏa tốc phòng cháy chữa cháy",
                OriginalFileName = "hoa_toc_100.pdf",
                UrgencyLevel = "HỎA TỐC",
                ReceivedDate = now.AddHours(-2),
                SlaDeadline = now.AddHours(6),
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                CreatedAt = now.AddHours(-2)
            });

            // 3. Văn bản đã ký
            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "101/QĐ-UBND",
                SubjectTitle = "Quyết định phê duyệt dự án",
                OriginalFileName = "qd_101.pdf",
                UrgencyLevel = "THƯỜNG",
                ReceivedDate = now.AddDays(-1),
                CurrentStatus = DocumentCurrentStatus.DaKy,
                SignedDate = now.AddHours(-1),
                CreatedAt = now.AddDays(-1)
            });

            await context.SaveChangesAsync();

            // Act
            var notifications = await service.GetUserNotificationsAsync(userId, isAdmin: false);

            // Assert
            Assert.True(notifications.Count >= 3);
            Assert.Contains(notifications, n => n.Type == "SLA_WARNING" && n.UrgencyLevel == "HỎA TỐC");
            Assert.Contains(notifications, n => n.Type == "URGENT_DOC" && n.UrgencyLevel == "HỎA TỐC");
            Assert.Contains(notifications, n => n.Type == "SIGNED");
        }

        [Fact]
        public async Task GetMobileQuickReportAsync_ShouldReturnAccurateExecutiveSummary()
        {
            // Arrange
            var (service, context) = CreateTestService();
            var userId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;

            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "01/CV",
                OriginalFileName = "01.pdf",
                UrgencyLevel = "HỎA TỐC",
                ReceivedDate = now,
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                SlaDeadline = now.AddHours(2),
                CreatedAt = now
            });

            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "02/CV",
                OriginalFileName = "02.pdf",
                UrgencyLevel = "THƯỜNG",
                ReceivedDate = now,
                CurrentStatus = DocumentCurrentStatus.DaKy,
                SignedDate = now,
                CreatedAt = now
            });

            await context.SaveChangesAsync();

            // Act
            var report = await service.GetMobileQuickReportAsync(userId, isAdmin: false);

            // Assert
            Assert.Equal(2, report.TotalReceived);
            Assert.Equal(1, report.ChoXuLy);
            Assert.Equal(1, report.DaKy);
            Assert.Equal(1, report.UrgentCount);
            Assert.True(report.Decree30ComplianceRate > 0);
            Assert.True(report.OnTimeRate >= 0);
            Assert.NotEmpty(report.UrgencyBreakdown);
        }

        [Fact]
        public async Task GetMobileQuickReportAsync_WithTimeFilter_ShouldFilterAccurately()
        {
            // Arrange
            var (service, context) = CreateTestService();
            var userId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;

            // Văn bản tuần này
            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "W1/CV",
                OriginalFileName = "this_week.pdf",
                UrgencyLevel = "KHẨN",
                ReceivedDate = now,
                CurrentStatus = DocumentCurrentStatus.DaKy,
                CreatedAt = now
            });

            // Văn bản 60 ngày trước (ngoài tháng này)
            context.ProcessingLogs.Add(new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "OLD/CV",
                OriginalFileName = "old.pdf",
                UrgencyLevel = "THƯỜNG",
                ReceivedDate = now.AddDays(-60),
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                CreatedAt = now.AddDays(-60)
            });

            await context.SaveChangesAsync();

            // Act
            var reportWeek = await service.GetMobileQuickReportAsync(userId, isAdmin: false, timeFilter: "this_week");
            var reportAll = await service.GetMobileQuickReportAsync(userId, isAdmin: false, timeFilter: "all");

            // Assert
            Assert.Equal(1, reportWeek.TotalReceived);
            Assert.Equal("this_week", reportWeek.TimeFilter);
            Assert.Equal(2, reportAll.TotalReceived);
        }

        [Fact]
        public async Task SendNotification_AndMarkAsRead_ShouldTrackReadStatus()
        {
            // Arrange
            var (service, _) = CreateTestService();
            var userId = Guid.NewGuid();

            // Act
            var item = service.SendNotification(userId, new SendPushNotificationRequestDto
            {
                Title = "THÔNG BÁO TEST HỎA TỐC",
                Body = "Cần kiểm tra công văn đến ngay lập tức",
                Type = "URGENT_DOC",
                UrgencyLevel = "HỎA TỐC"
            });

            // Assert
            Assert.NotNull(item);
            Assert.False(item.IsRead);

            // Mark as read
            service.MarkAsRead(userId, item.Id);
            // Verify
            var list = await service.GetUserNotificationsAsync(userId, isAdmin: false);
            var found = list.FirstOrDefault(n => n.Id == item.Id);
            Assert.NotNull(found);
            Assert.True(found.IsRead);
        }
    }
}
