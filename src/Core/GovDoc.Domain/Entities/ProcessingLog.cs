using System;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class ProcessingLog : BaseEntity
    {
        public Guid UserId { get; set; }
        public string? IncomingDocCode { get; set; }
        public string? IncomingIssuer { get; set; }
        public string? SubjectTitle { get; set; }
        public string OriginalFileName { get; set; } = string.Empty;
        public string? StoredFilePath { get; set; }
        public string UrgencyLevel { get; set; } = "THUONG";
        public DateTimeOffset? SlaDeadline { get; set; }
        public string SummaryDataJson { get; set; } = string.Empty;
        public string SelectedOptionId { get; set; } = string.Empty;
        public string LegalBasesUsedJson { get; set; } = string.Empty;
        public string? ResultDataJson { get; set; }
        public string? ExportedDocxPath { get; set; }
        public string? ClientIp { get; set; }
        public int ReprocessCount { get; set; } = 0;
        public DateTimeOffset? LastReprocessedAt { get; set; }

        // Navigation
        public User? User { get; set; }
    }
}
