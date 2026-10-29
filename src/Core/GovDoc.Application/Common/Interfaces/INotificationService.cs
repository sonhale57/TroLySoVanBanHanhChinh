using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;

namespace GovDoc.Application.Common.Interfaces
{
    public interface INotificationService
    {
        void SaveSubscription(Guid userId, PushSubscriptionDto subscription);
        List<PushSubscriptionDto> GetSubscriptions(Guid userId);
        Task<List<NotificationItemDto>> GetUserNotificationsAsync(Guid userId, bool isAdmin);
        Task<MobileQuickReportDto> GetMobileQuickReportAsync(Guid userId, bool isAdmin, string? timeFilter = null);
        NotificationItemDto SendNotification(Guid? targetUserId, SendPushNotificationRequestDto request);
        void MarkAsRead(Guid userId, string notificationId);
        void MarkAllAsRead(Guid userId);
    }
}
