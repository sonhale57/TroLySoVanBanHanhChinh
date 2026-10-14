using System;
using System.Collections.Generic;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class LegalDocument : BaseEntity
    {
        public string CodeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string DocType { get; set; } = string.Empty;
        public int HierarchyRank { get; set; }
        public string Issuer { get; set; } = string.Empty;
        public DateTime IssuedDate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiredDate { get; set; }
        public string Status { get; set; } = "ACTIVE";
        public bool IsDraft { get; set; } = false;
        public string? FilePath { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation properties
        public User? Creator { get; set; }
        public ICollection<LegalClauseNode> ClauseNodes { get; set; } = new List<LegalClauseNode>();
        public ICollection<LegalRelation> SourceRelations { get; set; } = new List<LegalRelation>();
        public ICollection<LegalRelation> TargetRelations { get; set; } = new List<LegalRelation>();
    }
}
