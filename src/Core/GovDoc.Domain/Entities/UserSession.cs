using System;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class UserSession : BaseEntity
    {
        public Guid UserId { get; set; }
        public string RefreshToken { get; set; } = string.Empty;
        public bool IsPersistent { get; set; } = false; // 1 = Remember Me (30 ngày), 0 = 8 giờ
        public string? ClientIp { get; set; }
        public string? UserAgent { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
        public bool IsRevoked { get; set; } = false;

        // Navigation
        public User? User { get; set; }
    }
}
