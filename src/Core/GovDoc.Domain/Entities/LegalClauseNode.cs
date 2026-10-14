using System;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class LegalClauseNode : BaseEntity
    {
        public Guid DocId { get; set; }
        public string? ChapterTitle { get; set; }
        public string ArticleNumber { get; set; } = string.Empty;
        public string? ClauseNumber { get; set; }
        public string? PointIdentifier { get; set; }
        public string RawContent { get; set; } = string.Empty;
        public string Status { get; set; } = "ACTIVE";

        // Navigation
        public LegalDocument? Document { get; set; }
    }
}
