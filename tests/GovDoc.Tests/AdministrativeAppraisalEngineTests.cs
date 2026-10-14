using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class AdministrativeAppraisalEngineTests
    {
        private readonly AdministrativeAppraisalEngine _appraisalEngine = new();

        private List<LegalDocument> GetSampleActiveDocs()
        {
            return new List<LegalDocument>
            {
                new LegalDocument
                {
                    Id = Guid.NewGuid(),
                    CodeNumber = "123/2026/NĐ-CP",
                    Title = "Nghị định quy định chi tiết thi hành Luật Đầu tư",
                    Status = LegalStatus.Active,
                    HierarchyRank = 70,
                    ClauseNodes = new List<LegalClauseNode>
                    {
                        new LegalClauseNode
                        {
                            Id = Guid.NewGuid(),
                            ArticleNumber = "Điều 14, Khoản 2",
                            RawContent = "UBND cấp tỉnh xem xét, quyết định gia hạn tiến độ thực hiện dự án đầu tư trên cơ sở báo cáo thẩm định."
                        }
                    }
                }
            };
        }

        private List<LegalDocument> GetSampleExpiredDocs()
        {
            return new List<LegalDocument>
            {
                new LegalDocument
                {
                    Id = Guid.NewGuid(),
                    CodeNumber = "31/2021/NĐ-CP",
                    Title = "Nghị định quy định chi tiết Luật Đầu tư 2020",
                    Status = LegalStatus.Expired,
                    ExpiredDate = new DateTime(2026, 3, 1)
                }
            };
        }

        [Fact]
        public async Task EvaluateDocumentAsync_CourtMatter_ReturnsTransferAuthority()
        {
            // Arrange
            var ocrResult = new OcrExtractionResult
            {
                DetectedIssuer = "Công ty TNHH ABC",
                DetectedCodeNumber = "01/CV-ABC",
                SubjectTitle = "Khởi kiện tại tòa án yêu cầu bồi thường hợp đồng",
                ExtractedText = "Kính gửi UBND tỉnh. Đơn vị khởi kiện tại Tòa án nhân dân tỉnh yêu cầu xử lý vi phạm hình sự và hợp đồng."
            };

            // Act
            var verdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, GetSampleActiveDocs(), GetSampleExpiredDocs());

            // Assert
            Assert.Equal("TRANSFER_AUTHORITY", verdict.VerdictType);
            Assert.Contains(verdict.Checklist, c => !c.IsPassed && c.CriteriaName.Contains("Thẩm quyền"));
        }

        [Fact]
        public async Task EvaluateDocumentAsync_CitesExpiredDecree_ReturnsRejected()
        {
            // Arrange
            var ocrResult = new OcrExtractionResult
            {
                DetectedIssuer = "Sở Xây dựng",
                DetectedCodeNumber = "55/SXD",
                SubjectTitle = "Xin điều chỉnh dự án",
                ExtractedText = "Căn cứ Nghị định số 31/2021/NĐ-CP của Chính phủ; kính đề nghị UBND tỉnh xem xét chấp thuận."
            };

            // Act
            var verdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, GetSampleActiveDocs(), GetSampleExpiredDocs());

            // Assert
            Assert.Equal("REJECTED", verdict.VerdictType);
            Assert.Contains(verdict.Checklist, c => !c.IsPassed && c.CriteriaName.Contains("hiệu lực"));
            Assert.Equal("EXPIRED", verdict.PrimaryLegalBasis.Status);
        }

        [Fact]
        public async Task EvaluateDocumentAsync_ExtensionMissingInspectionReport_ReturnsRequireAdditionalInfo()
        {
            // Arrange
            var ocrResult = new OcrExtractionResult
            {
                DetectedIssuer = "Công ty Cổ phần Hạ tầng Z",
                DetectedCodeNumber = "12/HTZ",
                SubjectTitle = "Xin gia hạn thời gian hoàn thành dự án",
                ExtractedText = "Kính đề nghị UBND tỉnh cho phép gia hạn tiến độ thêm 6 tháng do gặp khó khăn tài chính."
            };

            // Act
            var verdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, GetSampleActiveDocs(), GetSampleExpiredDocs());

            // Assert
            Assert.Equal("REQUIRE_ADDITIONAL_INFO", verdict.VerdictType);
            Assert.NotEmpty(verdict.MissingRequirements);
            Assert.Contains(verdict.Checklist, c => !c.IsPassed && c.CriteriaName.Contains("thành phần hồ sơ"));
        }

        [Fact]
        public async Task EvaluateDocumentAsync_FullInspectionAndValidLegalBasis_ReturnsApproved()
        {
            // Arrange
            var ocrResult = new OcrExtractionResult
            {
                DetectedIssuer = "UBND Huyện Bắc Tân Uyên",
                DetectedCodeNumber = "142/UBND-KT",
                SubjectTitle = "Đề nghị gia hạn tiến độ Cụm công nghiệp X",
                ExtractedText = @"UBND TỈNH BÌNH DƯƠNG.
Kính gửi: Thường trực UBND Tỉnh.
Theo báo cáo thực địa ngày 08/10/2026 của Sở Kế hoạch và Đầu tư và văn bản xác nhận của UBND huyện;
Kính đề nghị UBND tỉnh xem xét chấp thuận gia hạn tiến độ thực hiện dự án."
            };

            // Act
            var verdict = await _appraisalEngine.EvaluateDocumentAsync(ocrResult, GetSampleActiveDocs(), GetSampleExpiredDocs());

            // Assert
            Assert.Equal("APPROVED", verdict.VerdictType);
            Assert.All(verdict.Checklist, c => Assert.True(c.IsPassed));
            Assert.Empty(verdict.MissingRequirements);
            Assert.NotEmpty(verdict.DraftContentBullets);
        }
    }
}
