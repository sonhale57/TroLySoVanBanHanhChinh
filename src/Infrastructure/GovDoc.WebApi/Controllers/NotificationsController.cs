using System;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GovDoc.WebApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private (Guid UserId, bool IsAdmin) GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;
            bool isAdmin = string.Equals(roleClaim, "ADMIN", StringComparison.OrdinalIgnoreCase);
            return (currentUserId, isAdmin);
        }

        /// <summary>
        /// Lấy danh sách thông báo thời gian thực & cảnh báo SLA cho cán bộ
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var (userId, isAdmin) = GetCurrentUser();
            var list = await _notificationService.GetUserNotificationsAsync(userId, isAdmin);
            return Ok(list);
        }

        /// <summary>
        /// Lấy số liệu Báo cáo nhanh chuyên biệt cho giao diện ứng dụng Mobile
        /// </summary>
        [HttpGet("mobile-quick-report")]
        public async Task<IActionResult> GetMobileQuickReport([FromQuery] string? timeFilter = null)
        {
            var (userId, isAdmin) = GetCurrentUser();
            var report = await _notificationService.GetMobileQuickReportAsync(userId, isAdmin, timeFilter);
            return Ok(report);
        }

        /// <summary>
        /// Đăng ký thông báo đẩy Web Push từ thiết bị di động / trình duyệt
        /// </summary>
        [HttpPost("subscribe")]
        public IActionResult SubscribePush([FromBody] PushSubscriptionDto subscription)
        {
            var (userId, _) = GetCurrentUser();
            if (string.IsNullOrWhiteSpace(subscription.Endpoint))
            {
                return BadRequest(new { message = "Endpoint của Push Notification không được để trống." });
            }

            _notificationService.SaveSubscription(userId, subscription);
            return Ok(new { success = true, message = "Đã kích hoạt đăng ký nhận thông báo đẩy thành công." });
        }

        /// <summary>
        /// Gửi thử nghiệm một thông báo đẩy khẩn cấp hoặc cảnh báo SLA
        /// </summary>
        [HttpPost("send-test")]
        public IActionResult SendTestNotification([FromBody] SendPushNotificationRequestDto request)
        {
            var (userId, _) = GetCurrentUser();
            var createdItem = _notificationService.SendNotification(userId, request);
            return Ok(new { success = true, notification = createdItem });
        }

        /// <summary>
        /// Đánh dấu một thông báo đã đọc
        /// </summary>
        [HttpPost("{id}/mark-read")]
        public IActionResult MarkAsRead(string id)
        {
            var (userId, _) = GetCurrentUser();
            _notificationService.MarkAsRead(userId, id);
            return Ok(new { success = true });
        }

        /// <summary>
        /// Đánh dấu tất cả thông báo đã đọc
        /// </summary>
        [HttpPost("mark-all-read")]
        public IActionResult MarkAllAsRead()
        {
            var (userId, _) = GetCurrentUser();
            _notificationService.MarkAllAsRead(userId);
            return Ok(new { success = true });
        }
    }
}
