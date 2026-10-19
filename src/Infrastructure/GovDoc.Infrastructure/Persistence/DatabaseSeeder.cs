using System;
using System.Linq;
using System.Threading.Tasks;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace GovDoc.Infrastructure.Persistence
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // 1. Tự động kiểm tra và khởi tạo Cơ sở dữ liệu nếu chưa tồn tại
            try
            {
                var dbCreator = context.Database.GetService<IDatabaseCreator>() as RelationalDatabaseCreator;
                if (dbCreator != null)
                {
                    if (!await dbCreator.ExistsAsync())
                    {
                        await dbCreator.CreateAsync();
                    }
                    if (!await dbCreator.HasTablesAsync())
                    {
                        await dbCreator.CreateTablesAsync();
                    }
                }
            }
            catch
            {
                try
                {
                    await context.Database.EnsureCreatedAsync();
                }
                catch
                {
                    // Tiếp tục chạy phần đồng bộ schema bảng và cột
                }
            }

            // 2. Tự động kiểm tra thay đổi cấu trúc bảng & cột (Self-Migrating & Schema Sync)
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    -- Bảng Users
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
                    BEGIN
                        CREATE TABLE [Users] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [Username] NVARCHAR(50) NOT NULL,
                            [PasswordHash] NVARCHAR(255) NOT NULL,
                            [FullName] NVARCHAR(100) NOT NULL,
                            [Role] NVARCHAR(20) NOT NULL DEFAULT 'USER',
                            [Department] NVARCHAR(150) NOT NULL,
                            [IsActive] BIT NOT NULL DEFAULT 1,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE UNIQUE INDEX IX_Users_Username ON [Users]([Username]);
                    END

                    -- Bảng UserSessions
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
                    BEGIN
                        CREATE TABLE [UserSessions] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [UserId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_UserSessions_Users FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE CASCADE,
                            [RefreshToken] NVARCHAR(255) NOT NULL,
                            [IsPersistent] BIT NOT NULL DEFAULT 0,
                            [ClientIp] NVARCHAR(100) NULL,
                            [UserAgent] NVARCHAR(500) NULL,
                            [ExpiresAt] DATETIMEOFFSET NOT NULL,
                            [IsRevoked] BIT NOT NULL DEFAULT 0,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE UNIQUE INDEX IX_UserSessions_RefreshToken ON [UserSessions]([RefreshToken]);
                        CREATE INDEX IX_UserSessions_UserId ON [UserSessions]([UserId]);
                    END

                    -- Bảng LegalDocuments
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalDocuments')
                    BEGIN
                        CREATE TABLE [LegalDocuments] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [CodeNumber] NVARCHAR(100) NOT NULL,
                            [Title] NVARCHAR(MAX) NOT NULL,
                            [DocType] NVARCHAR(50) NOT NULL,
                            [HierarchyRank] INT NOT NULL DEFAULT 0,
                            [Issuer] NVARCHAR(150) NOT NULL,
                            [IssuedDate] DATETIME2 NOT NULL,
                            [EffectiveDate] DATETIME2 NOT NULL,
                            [ExpiredDate] DATETIME2 NULL,
                            [Status] NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                            [IsDraft] BIT NOT NULL DEFAULT 0,
                            [FilePath] NVARCHAR(500) NULL,
                            [CreatedBy] UNIQUEIDENTIFIER NULL CONSTRAINT FK_LegalDocuments_Users FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE SET NULL,
                            [UpdatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_LegalDocuments_CodeNumber ON [LegalDocuments]([CodeNumber]);
                        CREATE INDEX IX_LegalDocuments_Status ON [LegalDocuments]([Status]);
                        CREATE INDEX IX_LegalDocuments_Dates ON [LegalDocuments]([EffectiveDate], [ExpiredDate]);
                    END

                    -- Bảng LegalClauseNodes
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalClauseNodes')
                    BEGIN
                        CREATE TABLE [LegalClauseNodes] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [DocId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LegalClauseNodes_LegalDocuments FOREIGN KEY REFERENCES [LegalDocuments]([Id]) ON DELETE CASCADE,
                            [ChapterTitle] NVARCHAR(200) NULL,
                            [ArticleNumber] NVARCHAR(100) NOT NULL,
                            [ClauseNumber] NVARCHAR(100) NULL,
                            [PointIdentifier] NVARCHAR(50) NULL,
                            [RawContent] NVARCHAR(MAX) NOT NULL,
                            [Status] NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_LegalClauseNodes_DocId ON [LegalClauseNodes]([DocId]);
                        CREATE INDEX IX_LegalClauseNodes_ArticleNumber ON [LegalClauseNodes]([ArticleNumber]);
                    END

                    -- Bảng LegalRelations
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalRelations')
                    BEGIN
                        CREATE TABLE [LegalRelations] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [SourceDocId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LegalRelations_SourceDoc FOREIGN KEY REFERENCES [LegalDocuments]([Id]) ON DELETE NO ACTION,
                            [TargetDocId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LegalRelations_TargetDoc FOREIGN KEY REFERENCES [LegalDocuments]([Id]) ON DELETE NO ACTION,
                            [RelationType] NVARCHAR(50) NOT NULL,
                            [AffectedClauses] NVARCHAR(500) NULL,
                            [LegalBasisClause] NVARCHAR(MAX) NULL,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_LegalRelations_SourceDocId ON [LegalRelations]([SourceDocId]);
                        CREATE INDEX IX_LegalRelations_TargetDocId ON [LegalRelations]([TargetDocId]);
                    END

                    -- Bảng ProcessingLogs
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProcessingLogs')
                    BEGIN
                        CREATE TABLE [ProcessingLogs] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [UserId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_ProcessingLogs_Users FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE NO ACTION,
                            [IncomingDocCode] NVARCHAR(100) NULL,
                            [IncomingIssuer] NVARCHAR(150) NULL,
                            [SubjectTitle] NVARCHAR(500) NULL,
                            [OriginalFileName] NVARCHAR(255) NOT NULL,
                            [StoredFilePath] NVARCHAR(500) NULL,
                            [UrgencyLevel] NVARCHAR(50) NOT NULL DEFAULT 'THUONG',
                            [SlaDeadline] DATETIMEOFFSET NULL,
                            [SummaryDataJson] NVARCHAR(MAX) NOT NULL,
                            [SelectedOptionId] NVARCHAR(50) NOT NULL,
                            [LegalBasesUsedJson] NVARCHAR(MAX) NOT NULL,
                            [ResultDataJson] NVARCHAR(MAX) NULL,
                            [ExportedDocxPath] NVARCHAR(500) NULL,
                            [ClientIp] NVARCHAR(100) NULL,
                            [ReprocessCount] INT NOT NULL DEFAULT 0,
                            [LastReprocessedAt] DATETIMEOFFSET NULL,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_ProcessingLogs_UserId ON [ProcessingLogs]([UserId]);
                        CREATE INDEX IX_ProcessingLogs_CreatedAt ON [ProcessingLogs]([CreatedAt]);
                    END

                    -- Bảng LegalProposals
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalProposals')
                    BEGIN
                        CREATE TABLE [LegalProposals] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [SubmittedBy] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LegalProposals_Submitter FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE NO ACTION,
                            [Title] NVARCHAR(255) NOT NULL,
                            [Notes] NVARCHAR(MAX) NULL,
                            [AttachmentPath] NVARCHAR(500) NOT NULL,
                            [Status] NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
                            [AdminResponseNote] NVARCHAR(MAX) NULL,
                            [ReviewedBy] UNIQUEIDENTIFIER NULL CONSTRAINT FK_LegalProposals_Reviewer FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE SET NULL,
                            [ReviewedAt] DATETIMEOFFSET NULL,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_LegalProposals_SubmittedBy ON [LegalProposals]([SubmittedBy]);
                        CREATE INDEX IX_LegalProposals_Status ON [LegalProposals]([Status]);
                    END

                    -- Đồng bộ các cột bổ sung cho ProcessingLogs
                    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProcessingLogs')
                    BEGIN
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

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ExportedDocxPath')
                            ALTER TABLE ProcessingLogs ADD ExportedDocxPath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ClientIp')
                            ALTER TABLE ProcessingLogs ADD ClientIp NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SlaDeadline')
                            ALTER TABLE ProcessingLogs ADD SlaDeadline DATETIMEOFFSET NULL;
                    END

                    -- Đồng bộ các cột bổ sung cho LegalDocuments
                    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalDocuments')
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'IsDraft')
                            ALTER TABLE LegalDocuments ADD IsDraft BIT NOT NULL CONSTRAINT DF_LegalDocuments_IsDraft DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'FilePath')
                            ALTER TABLE LegalDocuments ADD FilePath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'CreatedBy')
                            ALTER TABLE LegalDocuments ADD CreatedBy UNIQUEIDENTIFIER NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'UpdatedAt')
                            ALTER TABLE LegalDocuments ADD UpdatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_LegalDocuments_UpdatedAt DEFAULT SYSDATETIMEOFFSET();
                    END

                    -- Đồng bộ các cột bổ sung cho UserSessions
                    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserSessions') AND name = 'IsPersistent')
                            ALTER TABLE UserSessions ADD IsPersistent BIT NOT NULL CONSTRAINT DF_UserSessions_IsPersistent DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserSessions') AND name = 'ClientIp')
                            ALTER TABLE UserSessions ADD ClientIp NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserSessions') AND name = 'UserAgent')
                            ALTER TABLE UserSessions ADD UserAgent NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('UserSessions') AND name = 'IsRevoked')
                            ALTER TABLE UserSessions ADD IsRevoked BIT NOT NULL CONSTRAINT DF_UserSessions_IsRevoked DEFAULT 0;
                    END

                    -- Đồng bộ các cột bổ sung cho LegalProposals
                    IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalProposals')
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'AdminResponseNote')
                            ALTER TABLE LegalProposals ADD AdminResponseNote NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'ReviewedBy')
                            ALTER TABLE LegalProposals ADD ReviewedBy UNIQUEIDENTIFIER NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'ReviewedAt')
                            ALTER TABLE LegalProposals ADD ReviewedAt DATETIMEOFFSET NULL;
                    END
                ");
            }
            catch
            {
                // Bỏ qua nếu môi trường in-memory hoặc không hỗ trợ ALTER TABLE
            }

            // 3. Khởi tạo tài khoản Quản trị viên (Admin) mặc định
            var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    FullName = "Nguyễn Văn Hùng (Quản trị viên)",
                    Role = UserRole.Admin,
                    Department = "Sở Tư pháp / Phòng Pháp chế UBND Tỉnh",
                    IsActive = true
                };
                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
            }
            else
            {
                // Đảm bảo quyền Admin và trạng thái hoạt động luôn hợp lệ
                bool needSave = false;
                if (adminUser.Role != UserRole.Admin)
                {
                    adminUser.Role = UserRole.Admin;
                    needSave = true;
                }
                if (!adminUser.IsActive)
                {
                    adminUser.IsActive = true;
                    needSave = true;
                }
                if (needSave)
                {
                    await context.SaveChangesAsync();
                }
            }

            // 4. Khởi tạo tài khoản Chuyên viên mặc định
            var specialistUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "chuyenvien");
            if (specialistUser == null)
            {
                specialistUser = new User
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Username = "chuyenvien",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                    FullName = "Trần Thị Mai (Chuyên viên)",
                    Role = UserRole.User,
                    Department = "Văn phòng UBND Tỉnh / Bộ phận Tổng hợp",
                    IsActive = true
                };
                await context.Users.AddAsync(specialistUser);
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
