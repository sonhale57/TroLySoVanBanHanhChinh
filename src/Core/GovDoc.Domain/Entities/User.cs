using System;
using System.Collections.Generic;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class User : BaseEntity
    {
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "USER"; // Cố định 'ADMIN' hoặc 'USER' (Không switch)
        public string Department { get; set; } = string.Empty;
        public string? Email { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset? PasswordChangedAt { get; set; }
        public int FailedLoginAttempts { get; set; } = 0;
        public DateTimeOffset? LockoutEnd { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation
        public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    }
}
