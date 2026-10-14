using System;
using System.Linq;
using System.Threading.Tasks;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.Infrastructure.Persistence
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Đảm bảo Database đã được tạo
            await context.Database.EnsureCreatedAsync();

            // Đồng bộ schema cho bảng ProcessingLogs nếu thiếu các cột nâng cấp
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SubjectTitle')
                        ALTER TABLE ProcessingLogs ADD SubjectTitle NVARCHAR(500) NULL;

                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'StoredFilePath')
                        ALTER TABLE ProcessingLogs ADD StoredFilePath NVARCHAR(500) NULL;

                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ResultDataJson')
                        ALTER TABLE ProcessingLogs ADD ResultDataJson NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ReprocessCount')
                        ALTER TABLE ProcessingLogs ADD ReprocessCount INT NOT NULL CONSTRAINT DF_ProcessingLogs_ReprocessCount DEFAULT 0;

                    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'LastReprocessedAt')
                        ALTER TABLE ProcessingLogs ADD LastReprocessedAt DATETIMEOFFSET NULL;
                ");
            }
            catch
            {
                // Bỏ qua nếu môi trường in-memory hoặc không hỗ trợ ALTER TABLE
            }

            // 1. Seed Users
            if (!await context.Users.AnyAsync())
            {
                var adminUser = new User
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    FullName = "Nguyễn Văn Hùng",
                    Role = UserRole.Admin,
                    Department = "Sở Tư pháp / Phòng Pháp chế UBND Tỉnh",
                    IsActive = true
                };

                var specialistUser = new User
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Username = "chuyenvien",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                    FullName = "Trần Thị Mai",
                    Role = UserRole.User,
                    Department = "Văn phòng UBND Tỉnh / Bộ phận Tổng hợp",
                    IsActive = true
                };

                await context.Users.AddRangeAsync(adminUser, specialistUser);
                await context.SaveChangesAsync();
            }

            // 2. Seed Legal Documents & Clauses
            if (!await context.LegalDocuments.AnyAsync())
            {
                var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");

                // Doc 1: Luật Ban hành VBQPPL 2015 (sửa đổi 2020)
                var lawDoc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000001"),
                    CodeNumber = "80/2015/QH13",
                    Title = "Luật Ban hành văn bản quy phạm pháp luật năm 2015 (sửa đổi, bổ sung năm 2020)",
                    DocType = LegalDocType.Law,
                    HierarchyRank = 90,
                    Issuer = "Quốc hội",
                    IssuedDate = new DateTime(2015, 6, 22),
                    EffectiveDate = new DateTime(2016, 7, 1),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 2: Nghị định 30/2020/NĐ-CP
                var decree30Doc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000002"),
                    CodeNumber = "30/2020/NĐ-CP",
                    Title = "Nghị định về công tác văn thư và quy chuẩn thể thức văn bản hành chính",
                    DocType = LegalDocType.Decree,
                    HierarchyRank = 70,
                    Issuer = "Chính phủ",
                    IssuedDate = new DateTime(2020, 3, 5),
                    EffectiveDate = new DateTime(2020, 3, 5),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 3: Nghị định 123/2026/NĐ-CP (Active)
                var decree123Doc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000003"),
                    CodeNumber = "123/2026/NĐ-CP",
                    Title = "Nghị định quy định chi tiết thi hành Luật Đầu tư",
                    DocType = LegalDocType.Decree,
                    HierarchyRank = 70,
                    Issuer = "Chính phủ",
                    IssuedDate = new DateTime(2026, 1, 15),
                    EffectiveDate = new DateTime(2026, 3, 1),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 4: Nghị định 31/2021/NĐ-CP (Expired - Bị thay thế bởi 123/2026/NĐ-CP)
                var decree31Doc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000004"),
                    CodeNumber = "31/2021/NĐ-CP",
                    Title = "Nghị định quy định chi tiết và hướng dẫn thi hành một số điều của Luật Đầu tư (Cũ - Đã hết hiệu lực)",
                    DocType = LegalDocType.Decree,
                    HierarchyRank = 70,
                    Issuer = "Chính phủ",
                    IssuedDate = new DateTime(2021, 3, 26),
                    EffectiveDate = new DateTime(2021, 3, 26),
                    ExpiredDate = new DateTime(2026, 2, 28),
                    Status = LegalStatus.Expired,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 5: Nghị định 45/2021/NĐ-CP (Active)
                var decree45Doc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000005"),
                    CodeNumber = "45/2021/NĐ-CP",
                    Title = "Nghị định về quản lý, phát triển cụm công nghiệp",
                    DocType = LegalDocType.Decree,
                    HierarchyRank = 70,
                    Issuer = "Chính phủ",
                    IssuedDate = new DateTime(2021, 3, 31),
                    EffectiveDate = new DateTime(2021, 5, 15),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 6: Nghị định Dự thảo (IsDraft = true - Khóa cứng không dùng làm căn cứ)
                var draftDoc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000006"),
                    CodeNumber = "DT-ND-CP/2026",
                    Title = "Dự thảo Nghị định sửa đổi cơ chế bồi thường hỗ trợ tái định cư dự án công",
                    DocType = LegalDocType.Decree,
                    HierarchyRank = 70,
                    Issuer = "Chính phủ",
                    IssuedDate = new DateTime(2026, 8, 1),
                    EffectiveDate = new DateTime(2027, 1, 1),
                    Status = LegalStatus.Draft,
                    IsDraft = true,
                    CreatedBy = adminId
                };

                await context.LegalDocuments.AddRangeAsync(lawDoc, decree30Doc, decree123Doc, decree31Doc, decree45Doc, draftDoc);

                // Clauses
                var clauses = new[]
                {
                    // Law 80
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = lawDoc.Id,
                        ArticleNumber = "Điều 156",
                        ClauseNumber = "Khoản 1, 2, 3",
                        RawContent = "Áp dụng văn bản quy phạm pháp luật: Trong trường hợp các văn bản quy phạm pháp luật có quy định khác nhau về cùng một vấn đề thì áp dụng văn bản có hiệu lực pháp lý cao hơn. Trong trường hợp các văn bản do cùng một cơ quan ban hành có quy định khác nhau về cùng một vấn đề thì áp dụng quy định của văn bản ban hành sau.",
                        Status = LegalStatus.Active
                    },

                    // Decree 30
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = decree30Doc.Id,
                        ArticleNumber = "Điều 9",
                        ClauseNumber = "Khoản 1",
                        RawContent = "Kỹ thuật trình bày văn bản hành chính: Khổ giấy A4 (210 x 297 mm), căn lề trang: Lề trên 20-25 mm, lề dưới 20-25 mm, lề trái 30-35 mm, lề phải 15-20 mm. Phông chữ tiếng Việt Unicode Times New Roman.",
                        Status = LegalStatus.Active
                    },

                    // Decree 123
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = decree123Doc.Id,
                        ArticleNumber = "Điều 14",
                        ClauseNumber = "Khoản 2",
                        RawContent = "Trường hợp dự án đầu tư cụm công nghiệp chậm tiến độ do nguyên nhân khách quan trong công tác giải phóng mặt bằng, bồi thường tái định cư, Ủy ban nhân dân cấp tỉnh xem xét, quyết định gia hạn tiến độ thực hiện dự án tối đa không quá 12 tháng trên cơ sở báo cáo thẩm định của cơ quan chuyên môn về đầu tư.",
                        Status = LegalStatus.Active
                    },
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = decree123Doc.Id,
                        ArticleNumber = "Điều 15",
                        ClauseNumber = "Khoản 1",
                        RawContent = "Hồ sơ, trình tự điều chỉnh tiến độ dự án đầu tư bao gồm văn bản đề nghị của nhà đầu tư, báo cáo tình hình triển khai và văn bản xác nhận của cơ quan giải phóng mặt bằng cấp huyện.",
                        Status = LegalStatus.Active
                    },

                    // Decree 31 (Expired)
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = decree31Doc.Id,
                        ArticleNumber = "Điều 12",
                        ClauseNumber = "Khoản 1",
                        RawContent = "Quy định cũ về điều chỉnh tiến độ đầu tư theo Nghị định 31/2021/NĐ-CP (Đã bị bãi bỏ bởi Nghị định 123/2026/NĐ-CP).",
                        Status = LegalStatus.Expired
                    },

                    // Decree 45
                    new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = decree45Doc.Id,
                        ArticleNumber = "Điều 8",
                        ClauseNumber = "Khoản 3",
                        RawContent = "Trách nhiệm của Ủy ban nhân dân cấp huyện và Trung tâm Phát triển quỹ đất trong việc phối hợp giải quyết khiếu kiện, đẩy nhanh tiến độ bồi thường giải phóng mặt bằng tại các cụm công nghiệp được phê duyệt.",
                        Status = LegalStatus.Active
                    }
                };

                await context.LegalClauseNodes.AddRangeAsync(clauses);

                // Relations: 123/2026/NĐ-CP REPLACES 31/2021/NĐ-CP
                var rel = new LegalRelation
                {
                    Id = Guid.NewGuid(),
                    SourceDocId = decree123Doc.Id,
                    TargetDocId = decree31Doc.Id,
                    RelationType = RelationType.Replaces,
                    AffectedClauses = "Toàn bộ",
                    LegalBasisClause = "Điều 89 Nghị định 123/2026/NĐ-CP: Nghị định này thay thế Nghị định số 31/2021/NĐ-CP ngày 26 tháng 3 năm 2021 của Chính phủ."
                };

                await context.LegalRelations.AddAsync(rel);
                await context.SaveChangesAsync();
            }
        }
    }
}
