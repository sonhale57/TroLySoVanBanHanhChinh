using System;
using System.Collections.Generic;
using System.Text.Json;
using GovDoc.Application.DTOs;
using Xunit;

namespace GovDoc.Tests
{
    public class DashboardStatisticsAndTemplateTests
    {
        [Fact]
        public void DocumentTemplateDto_Serialization_RoundTripsAccurately()
        {
            var original = new DocumentTemplateDto
            {
                ParentAgency = "ỦY BAN NHÂN DÂN TỈNH QUẢNG TRỊ",
                IssuingAgency = "VĂN PHÒNG",
                DocCodeTemplate = ".../VP-UBND",
                ProvinceCity = "Quảng Trị",
                SignerPosition = "CHÁNH VĂN PHÒNG",
                SignerName = "Lê Văn Hùng",
                RecipientDefault = "Như trên; Lưu: VT, TH."
            };

            var json = JsonSerializer.Serialize(original);
            var deserialized = JsonSerializer.Deserialize<DocumentTemplateDto>(json);

            Assert.NotNull(deserialized);
            Assert.Equal(original.ParentAgency, deserialized.ParentAgency);
            Assert.Equal(original.IssuingAgency, deserialized.IssuingAgency);
            Assert.Equal(original.ProvinceCity, deserialized.ProvinceCity);
            Assert.Equal(original.SignerPosition, deserialized.SignerPosition);
            Assert.Equal(original.SignerName, deserialized.SignerName);
        }

        [Fact]
        public void AiVerificationInfoDto_ContainsLegitimateProcessingAttributes()
        {
            var info = new AiVerificationInfoDto
            {
                IsAiVerified = true,
                ConfidenceScore = 96,
                ModelUsed = "Google Gemini 1.5 Pro (Admin Core)",
                Provider = "GEMINI",
                LegalBasesCount = 3,
                EvaluatedRulesCount = 8,
                Status = "VERIFIED",
                SummaryMessage = "Văn bản đã qua bóc tách ngữ cảnh chuyên sâu."
            };

            Assert.True(info.IsAiVerified);
            Assert.True(info.ConfidenceScore >= 90);
            Assert.Equal("GEMINI", info.Provider);
            Assert.Equal("VERIFIED", info.Status);
            Assert.Equal(3, info.LegalBasesCount);
            Assert.Equal(8, info.EvaluatedRulesCount);
            Assert.Contains("ngữ cảnh chuyên sâu", info.SummaryMessage);
        }

        [Fact]
        public void TestApiKeyResponseDto_ClassifiesErrorCorrectly()
        {
            var successResp = new TestApiKeyResponseDto
            {
                Success = true,
                LatencyMs = 230,
                Model = "gemini-1.5-flash",
                Provider = "GEMINI",
                Reply = "Chào đồng chí! Trợ lý số hoạt động tốt."
            };

            var quotaResp = new TestApiKeyResponseDto
            {
                Success = false,
                Status = "QUOTA_EXCEEDED",
                ErrorMessage = "Hạn mức (Quota) của khóa API đã vượt quá giới hạn",
                Recommendation = "Khóa API đã hết hạn ngạch hoặc gói miễn phí đã đạt trần. Vui lòng nâng cấp gói thanh toán hoặc đổi khóa API mới."
            };

            Assert.True(successResp.Success);
            Assert.Equal(230, successResp.LatencyMs);
            Assert.Equal("gemini-1.5-flash", successResp.Model);

            Assert.False(quotaResp.Success);
            Assert.Equal("QUOTA_EXCEEDED", quotaResp.Status);
            Assert.Contains("vượt quá giới hạn", quotaResp.ErrorMessage);
            Assert.Contains("đổi khóa API mới", quotaResp.Recommendation);
        }

        [Fact]
        public void DocumentStatisticsDto_SupportsPeriodBreakdown()
        {
            var stats = new DocumentStatisticsDto
            {
                TotalReceived = 15,
                ChoXuLy = 2,
                DangXuLy = 4,
                DaXuLy = 3,
                DaKy = 6,
                OverdueSla = 1,
                PeriodType = "month",
                PeriodLabel = "Tháng 10/2026",
                OnTimeRate = 93.3,
                TimelineBreakdown = new List<DailyChartPointDto>
                {
                    new DailyChartPointDto { Label = "19/10", ReceivedCount = 3, ProcessedCount = 2, SignedCount = 1 },
                    new DailyChartPointDto { Label = "20/10", ReceivedCount = 5, ProcessedCount = 4, SignedCount = 3 }
                }
            };

            Assert.Equal("month", stats.PeriodType);
            Assert.Equal("Tháng 10/2026", stats.PeriodLabel);
            Assert.Equal(93.3, stats.OnTimeRate);
            Assert.Equal(2, stats.TimelineBreakdown.Count);
            Assert.Equal(15, stats.TotalReceived);
            Assert.Equal(3, stats.TimelineBreakdown[0].ReceivedCount);
        }
    }
}
