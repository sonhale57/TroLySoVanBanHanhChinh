using System;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class DocumentLifecycleFsmTests
    {
        private readonly DepartmentSkillService _departmentSkillService;

        public DocumentLifecycleFsmTests()
        {
            _departmentSkillService = new DepartmentSkillService();
        }

        [Fact]
        public void LifecycleFsm_StandardProgression_ShouldFollowStateTransitions()
        {
            // 1. Initial State upon intake: CHO_XU_LY
            var log = new ProcessingLog
            {
                Id = Guid.NewGuid(),
                IncomingDocCode = "123/UBND-NV",
                CurrentStatus = DocumentCurrentStatus.ChoXuLy,
                ReceivedDate = DateTimeOffset.UtcNow
            };
            Assert.Equal(DocumentCurrentStatus.ChoXuLy, log.CurrentStatus);
            Assert.Null(log.SignedDate);
            Assert.Null(log.DraftContentHtml);

            // 2. Officer starts reviewing / editing: DANG_XU_LY
            log.CurrentStatus = DocumentCurrentStatus.DangXuLy;
            Assert.Equal(DocumentCurrentStatus.DangXuLy, log.CurrentStatus);

            // 3. Officer saves formal draft: DA_XU_LY
            log.DraftContentHtml = "<p>Nội dung dự thảo công văn phúc đáp Ủy ban nhân dân cấp trên...</p>";
            log.CurrentStatus = DocumentCurrentStatus.DaXuLy;
            Assert.Equal(DocumentCurrentStatus.DaXuLy, log.CurrentStatus);
            Assert.NotNull(log.DraftContentHtml);

            // 4. Leadership signs and numbers the document: DA_KY
            var signedAt = DateTimeOffset.UtcNow;
            log.SignedDate = signedAt;
            log.CurrentStatus = DocumentCurrentStatus.DaKy;
            Assert.Equal(DocumentCurrentStatus.DaKy, log.CurrentStatus);
            Assert.Equal(signedAt, log.SignedDate);
        }

        [Fact]
        public void LifecycleFsm_ReopenSignedDocument_ShouldReturnToDangXuLyAndClearSignedDate()
        {
            // Arrange: Document already in DA_KY
            var log = new ProcessingLog
            {
                Id = Guid.NewGuid(),
                CurrentStatus = DocumentCurrentStatus.DaKy,
                SignedDate = DateTimeOffset.UtcNow,
                DraftContentHtml = "<p>Bản thảo đã ký</p>"
            };

            // Act: Reopen action
            log.CurrentStatus = DocumentCurrentStatus.DangXuLy;
            log.SignedDate = null;

            // Assert
            Assert.Equal(DocumentCurrentStatus.DangXuLy, log.CurrentStatus);
            Assert.Null(log.SignedDate);
            Assert.NotNull(log.DraftContentHtml); // Retains draft text for re-editing
        }

        [Fact]
        public void GoldSample_HighRetentionRateAndHighRating_ShouldQualify()
        {
            // Arrange
            string aiDraft = "<p>Kính gửi: Sở Tư pháp tỉnh Đồng Nai. Sau khi nghiên cứu hồ sơ xin phép sử dụng đất công ích, phòng Tài nguyên Môi trường nhận thấy phù hợp quy định.</p>";
            // Minor edits: added a couple of words
            string userDraft = "<p>Kính gửi: Sở Tư pháp tỉnh Đồng Nai. Sau khi nghiên cứu kỹ lưỡng toàn bộ hồ sơ xin phép sử dụng đất công ích, phòng Tài nguyên Môi trường nhận thấy hoàn toàn phù hợp quy định pháp luật.</p>";

            // Act
            double retentionRate = _departmentSkillService.CalculateRetentionRate(aiDraft, userDraft);
            int rating = 5;
            bool isGoldSample = rating >= 4 && retentionRate >= 0.70;

            // Assert
            Assert.True(retentionRate >= 0.70, $"Expected retention >= 70%, but was {retentionRate:P}");
            Assert.True(isGoldSample, "Should qualify as Gold Sample for Few-Shot prompt tuning");
        }

        [Fact]
        public void GoldSample_LowRetentionRate_ShouldNotQualify()
        {
            // Arrange
            string aiDraft = "<p>Văn bản đề nghị phê duyệt phương án chi trả bồi thường giải phóng mặt bằng tuyến đường vành đai 3.</p>";
            // Completely rewritten text
            string userDraft = "<p>Thông báo triệu tập cuộc họp khẩn cấp vào sáng thứ Hai tuần tới tại hội trường Ủy ban nhân dân huyện.</p>";

            // Act
            double retentionRate = _departmentSkillService.CalculateRetentionRate(aiDraft, userDraft);
            int rating = 5;
            bool isGoldSample = rating >= 4 && retentionRate >= 0.70;

            // Assert
            Assert.True(retentionRate < 0.50, $"Expected low retention rate, but was {retentionRate:P}");
            Assert.False(isGoldSample, "Should not qualify as Gold Sample because user rewrote content entirely");
        }

        [Theory]
        [InlineData("Đề nghị cấp giấy chứng nhận quyền sử dụng đất và cấp phép xây dựng nhà ở", FieldCategory.DatDaiXayDung)]
        [InlineData("Phê duyệt quyết toán ngân sách tài chính và phân bổ vốn đầu tư công năm 2026", FieldCategory.KinhTeTaiChinh)]
        [InlineData("Bổ nhiệm cán bộ công chức và tinh giản biên chế tại các đơn vị sự nghiệp", FieldCategory.NoiVuToChuc)]
        [InlineData("Thẩm định tính hợp hiến hợp pháp của dự thảo Nghị quyết Hội đồng nhân dân", FieldCategory.TuPhapPhapChe)]
        public void DepartmentSkill_DetermineFieldCategory_ShouldMatchCorrectCategory(string summary, string expectedCategory)
        {
            // Act
            string category = _departmentSkillService.DetermineCategory(summary, "");

            // Assert
            Assert.Equal(expectedCategory, category);
        }
    }
}
