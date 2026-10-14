using System;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class LegalProposal : BaseEntity
    {
        public Guid SubmittedBy { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public string AttachmentPath { get; set; } = string.Empty;
        public string Status { get; set; } = "PENDING";
        public string? AdminResponseNote { get; set; }
        public Guid? ReviewedBy { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }

        // Navigation
        public User? Submitter { get; set; }
        public User? Reviewer { get; set; }
    }
}
