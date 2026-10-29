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

        // BYOK (Bring Your Own Key) & AI Configuration
        public string? EncryptedApiKey { get; set; } // Khóa API cá nhân mã hóa AES-256 (Khóa Active hiện tại)
        public string? ApiKeysVaultJson { get; set; } // Danh sách đa khóa API cá nhân kèm trạng thái (JSON)
        public string? AiProvider { get; set; } // OPENAI, GEMINI, ANTHROPIC, OPENROUTER
        public string? AiModel { get; set; } // Model mong muốn (gpt-4o, gemini-1.5-pro, claude-3-5-sonnet,...)
        public string? CustomPrompt { get; set; } // Chỉ dẫn / prompt chuyên môn riêng của cán bộ
        public string? EnabledSkillsJson { get; set; } // Danh sách kỹ năng/kịch bản thẩm định chuyên ngành bật/tắt
        public string? NotificationPreferencesJson { get; set; } // Cấu hình nhận thông báo (Hỏa tốc, SLA, Ký duyệt)
        public string? DocumentTemplateJson { get; set; } // Cấu hình mẫu thể thức Header & Footer (Tỉnh/Thành phố, Cơ quan, Người ký)

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation
        public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    }
}
