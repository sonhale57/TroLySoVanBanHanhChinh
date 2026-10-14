using System;
using System.Collections.Generic;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Domain.Rules;
using Xunit;

namespace GovDoc.Tests
{
    public class LegalHierarchyEvaluatorTests
    {
        [Fact]
        public void HigherRank_ShouldHavePrecedenceOver_LowerRank()
        {
            var law = new LegalDocument
            {
                CodeNumber = "80/2015/QH13",
                DocType = LegalDocType.Law,
                HierarchyRank = 90,
                IssuedDate = new DateTime(2015, 6, 22),
                EffectiveDate = new DateTime(2016, 7, 1),
                Status = LegalStatus.Active
            };

            var decree = new LegalDocument
            {
                CodeNumber = "123/2026/NĐ-CP",
                DocType = LegalDocType.Decree,
                HierarchyRank = 70,
                IssuedDate = new DateTime(2026, 1, 15),
                EffectiveDate = new DateTime(2026, 3, 1),
                Status = LegalStatus.Active
            };

            // Law has higher rank (90 > 70)
            int compare = LegalHierarchyEvaluator.CompareLegalPrecedence(law, decree);
            Assert.True(compare > 0, "Luật phải có thứ bậc hiệu lực cao hơn Nghị định theo Khoản 2 Điều 156");
        }

        [Fact]
        public void SameRank_ShouldPrioritize_LaterEnactedDocument()
        {
            var decreeOld = new LegalDocument
            {
                CodeNumber = "31/2021/NĐ-CP",
                DocType = LegalDocType.Decree,
                HierarchyRank = 70,
                IssuedDate = new DateTime(2021, 3, 26),
                EffectiveDate = new DateTime(2021, 3, 26),
                Status = LegalStatus.Expired
            };

            var decreeNew = new LegalDocument
            {
                CodeNumber = "123/2026/NĐ-CP",
                DocType = LegalDocType.Decree,
                HierarchyRank = 70,
                IssuedDate = new DateTime(2026, 1, 15),
                EffectiveDate = new DateTime(2026, 3, 1),
                Status = LegalStatus.Active
            };

            int compare = LegalHierarchyEvaluator.CompareLegalPrecedence(decreeNew, decreeOld);
            Assert.True(compare > 0, "Văn bản ban hành sau cùng cấp phải được ưu tiên theo Khoản 3 Điều 156");
        }

        [Fact]
        public void DraftDocument_MustNeverBeValid_ForOfficialLegalBasis()
        {
            var draftDoc = new LegalDocument
            {
                CodeNumber = "DT-ND-CP/2026",
                DocType = LegalDocType.Decree,
                HierarchyRank = 70,
                IssuedDate = new DateTime(2026, 8, 1),
                EffectiveDate = new DateTime(2026, 9, 1),
                Status = LegalStatus.Draft,
                IsDraft = true
            };

            bool isValid = LegalHierarchyEvaluator.IsValidAtPointInTime(draftDoc, new DateTime(2026, 10, 1));
            Assert.False(isValid, "Văn bản dự thảo (IsDraft = true) tuyệt đối không được coi là có hiệu lực pháp lý");
        }

        [Fact]
        public void PointInTime_ShouldCorrectlyValidate_HistoricalCases()
        {
            var doc = new LegalDocument
            {
                CodeNumber = "31/2021/NĐ-CP",
                DocType = LegalDocType.Decree,
                HierarchyRank = 70,
                IssuedDate = new DateTime(2021, 3, 26),
                EffectiveDate = new DateTime(2021, 3, 26),
                ExpiredDate = new DateTime(2026, 2, 28),
                Status = LegalStatus.Expired
            };

            // In year 2023, this decree was still valid
            bool validIn2023 = LegalHierarchyEvaluator.IsValidAtPointInTime(doc, new DateTime(2023, 6, 15));
            Assert.True(validIn2023, "Văn bản phải hợp lệ tại thời điểm năm 2023 khi sự việc xảy ra");

            // In year 2026 after expiration date
            bool validIn2026 = LegalHierarchyEvaluator.IsValidAtPointInTime(doc, new DateTime(2026, 10, 1));
            Assert.False(validIn2026, "Văn bản phải không hợp lệ vào tháng 10/2026 do đã hết hiệu lực");
        }
    }
}
