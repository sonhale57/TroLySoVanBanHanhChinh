using System;
using GovDoc.Domain.Common;

namespace GovDoc.Domain.Entities
{
    public class LegalRelation : BaseEntity
    {
        public Guid SourceDocId { get; set; }
        public Guid TargetDocId { get; set; }
        public string RelationType { get; set; } = string.Empty;
        public string? AffectedClauses { get; set; }
        public string? LegalBasisClause { get; set; }

        // Navigation
        public LegalDocument? SourceDoc { get; set; }
        public LegalDocument? TargetDoc { get; set; }
    }
}
