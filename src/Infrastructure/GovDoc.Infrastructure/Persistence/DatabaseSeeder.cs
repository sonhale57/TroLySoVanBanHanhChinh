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

            // 2. Tự động kiểm tra thay đổi cấu trúc bảng & cột (Self-Migrating & Schema Sync toàn diện)
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    -- ========================================================
                    -- 1. BẢNG Users
                    -- ========================================================
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
                    BEGIN
                        CREATE TABLE [Users] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [Username] NVARCHAR(50) NOT NULL,
                            [PasswordHash] NVARCHAR(255) NOT NULL,
                            [FullName] NVARCHAR(100) NOT NULL,
                            [Role] NVARCHAR(20) NOT NULL DEFAULT 'USER',
                            [Department] NVARCHAR(150) NOT NULL,
                            [Email] NVARCHAR(150) NULL,
                            [IsActive] BIT NOT NULL DEFAULT 1,
                            [PasswordChangedAt] DATETIMEOFFSET NULL,
                            [FailedLoginAttempts] INT NOT NULL DEFAULT 0,
                            [LockoutEnd] DATETIMEOFFSET NULL,
                            [EncryptedApiKey] NVARCHAR(MAX) NULL,
                            [ApiKeysVaultJson] NVARCHAR(MAX) NULL,
                            [AiProvider] NVARCHAR(50) NULL,
                            [AiModel] NVARCHAR(100) NULL,
                            [CustomPrompt] NVARCHAR(MAX) NULL,
                            [EnabledSkillsJson] NVARCHAR(MAX) NULL,
                            [NotificationPreferencesJson] NVARCHAR(MAX) NULL,
                            [DocumentTemplateJson] NVARCHAR(MAX) NULL,
                            [UpdatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE UNIQUE INDEX IX_Users_Username ON [Users]([Username]);
                    END
                    ELSE
                    BEGIN
                        -- Tự động bổ sung các cột còn thiếu cho Users nếu DB cũ đã tồn tại
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'Email')
                            ALTER TABLE Users ADD Email NVARCHAR(150) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'PasswordChangedAt')
                            ALTER TABLE Users ADD PasswordChangedAt DATETIMEOFFSET NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'FailedLoginAttempts')
                            ALTER TABLE Users ADD FailedLoginAttempts INT NOT NULL CONSTRAINT DF_Users_FailedLoginAttempts DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'LockoutEnd')
                            ALTER TABLE Users ADD LockoutEnd DATETIMEOFFSET NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'EncryptedApiKey')
                            ALTER TABLE Users ADD EncryptedApiKey NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'ApiKeysVaultJson')
                            ALTER TABLE Users ADD ApiKeysVaultJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'AiProvider')
                            ALTER TABLE Users ADD AiProvider NVARCHAR(50) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'AiModel')
                            ALTER TABLE Users ADD AiModel NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'CustomPrompt')
                            ALTER TABLE Users ADD CustomPrompt NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'EnabledSkillsJson')
                            ALTER TABLE Users ADD EnabledSkillsJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'NotificationPreferencesJson')
                            ALTER TABLE Users ADD NotificationPreferencesJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'DocumentTemplateJson')
                            ALTER TABLE Users ADD DocumentTemplateJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'UpdatedAt')
                            ALTER TABLE Users ADD UpdatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSDATETIMEOFFSET();
                    END

                    -- ========================================================
                    -- 2. BẢNG UserSessions
                    -- ========================================================
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserSessions')
                    BEGIN
                        CREATE TABLE [UserSessions] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [UserId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_UserSessions_Users FOREIGN KEY REFERENCES [Users]([Id]) ON DELETE CASCADE,
                            [RefreshToken] NVARCHAR(255) NOT NULL,
                            [IsPersistent] BIT NOT NULL DEFAULT 0,
                            [ExpiresAt] DATETIMEOFFSET NOT NULL,
                            [ClientIp] NVARCHAR(100) NULL,
                            [UserAgent] NVARCHAR(500) NULL,
                            [IsRevoked] BIT NOT NULL DEFAULT 0,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE UNIQUE INDEX IX_UserSessions_RefreshToken ON [UserSessions]([RefreshToken]);
                        CREATE INDEX IX_UserSessions_UserId ON [UserSessions]([UserId]);
                    END
                    ELSE
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

                    -- ========================================================
                    -- 3. BẢNG LegalDocuments
                    -- ========================================================
                    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LegalDocuments')
                    BEGIN
                        CREATE TABLE [LegalDocuments] (
                            [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            [CodeNumber] NVARCHAR(100) NOT NULL,
                            [Title] NVARCHAR(MAX) NOT NULL,
                            [DocType] NVARCHAR(50) NOT NULL,
                            [HierarchyRank] INT NOT NULL DEFAULT 0,
                            [Issuer] NVARCHAR(150) NOT NULL,
                            [IssuerAgency] NVARCHAR(250) NULL,
                            [DocumentScope] VARCHAR(30) NOT NULL DEFAULT 'QPPL',
                            [FieldCategory] VARCHAR(50) NOT NULL DEFAULT 'QUAN_TRI_VAN_PHONG',
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
                        CREATE INDEX IX_LegalDocuments_Scope ON [LegalDocuments]([DocumentScope]);
                        CREATE INDEX IX_LegalDocuments_Field ON [LegalDocuments]([FieldCategory]);
                        CREATE INDEX IX_LegalDocuments_Dates ON [LegalDocuments]([EffectiveDate], [ExpiredDate]);
                    END
                    ELSE
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'HierarchyRank')
                            ALTER TABLE LegalDocuments ADD HierarchyRank INT NOT NULL CONSTRAINT DF_LegalDocuments_HierarchyRank DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'IssuerAgency')
                            ALTER TABLE LegalDocuments ADD IssuerAgency NVARCHAR(250) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'DocumentScope')
                            ALTER TABLE LegalDocuments ADD DocumentScope VARCHAR(30) NOT NULL CONSTRAINT DF_LegalDocuments_DocumentScope DEFAULT 'QPPL';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'FieldCategory')
                            ALTER TABLE LegalDocuments ADD FieldCategory VARCHAR(50) NOT NULL CONSTRAINT DF_LegalDocuments_FieldCategory DEFAULT 'QUAN_TRI_VAN_PHONG';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'ExpiredDate')
                            ALTER TABLE LegalDocuments ADD ExpiredDate DATETIME2 NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'Status')
                            ALTER TABLE LegalDocuments ADD Status NVARCHAR(30) NOT NULL CONSTRAINT DF_LegalDocuments_Status DEFAULT 'ACTIVE';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'IsDraft')
                            ALTER TABLE LegalDocuments ADD IsDraft BIT NOT NULL CONSTRAINT DF_LegalDocuments_IsDraft DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'FilePath')
                            ALTER TABLE LegalDocuments ADD FilePath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'CreatedBy')
                            ALTER TABLE LegalDocuments ADD CreatedBy UNIQUEIDENTIFIER NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalDocuments') AND name = 'UpdatedAt')
                            ALTER TABLE LegalDocuments ADD UpdatedAt DATETIMEOFFSET NOT NULL CONSTRAINT DF_LegalDocuments_UpdatedAt DEFAULT SYSDATETIMEOFFSET();
                    END

                    -- ========================================================
                    -- 4. BẢNG LegalClauseNodes
                    -- ========================================================
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
                    ELSE
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalClauseNodes') AND name = 'ChapterTitle')
                            ALTER TABLE LegalClauseNodes ADD ChapterTitle NVARCHAR(200) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalClauseNodes') AND name = 'ClauseNumber')
                            ALTER TABLE LegalClauseNodes ADD ClauseNumber NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalClauseNodes') AND name = 'PointIdentifier')
                            ALTER TABLE LegalClauseNodes ADD PointIdentifier NVARCHAR(50) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalClauseNodes') AND name = 'Status')
                            ALTER TABLE LegalClauseNodes ADD Status NVARCHAR(30) NOT NULL CONSTRAINT DF_LegalClauseNodes_Status DEFAULT 'ACTIVE';
                    END

                    -- ========================================================
                    -- 5. BẢNG LegalRelations
                    -- ========================================================
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
                    ELSE
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalRelations') AND name = 'AffectedClauses')
                            ALTER TABLE LegalRelations ADD AffectedClauses NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalRelations') AND name = 'LegalBasisClause')
                            ALTER TABLE LegalRelations ADD LegalBasisClause NVARCHAR(MAX) NULL;
                    END

                    -- ========================================================
                    -- 6. BẢNG ProcessingLogs
                    -- ========================================================
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
                            [ReceivedDate] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
                            [SlaDeadline] DATETIMEOFFSET NULL,
                            [SummaryDataJson] NVARCHAR(MAX) NOT NULL DEFAULT '',
                            [SelectedOptionId] NVARCHAR(50) NOT NULL DEFAULT '',
                            [LegalBasesUsedJson] NVARCHAR(MAX) NOT NULL DEFAULT '',
                            [ResultDataJson] NVARCHAR(MAX) NULL,
                            [DraftContentHtml] NVARCHAR(MAX) NULL,
                            [ExportedDocxPath] NVARCHAR(500) NULL,
                            [OutputFileName] NVARCHAR(255) NULL,
                            [OutputFilePath] NVARCHAR(500) NULL,
                            [IsCustomOutput] BIT NOT NULL DEFAULT 0,
                            [SignerAuthority] NVARCHAR(150) NULL,
                            [RecipientsJson] NVARCHAR(MAX) NULL,
                            [DocDateStr] NVARCHAR(100) NULL,
                            [LearnedKeywordsJson] NVARCHAR(MAX) NULL,
                            [CurrentStatus] VARCHAR(30) NOT NULL DEFAULT 'CHO_XU_LY',
                            [SignedDate] DATETIMEOFFSET NULL,
                            [RatingScore] INT NULL,
                            [IsGoldSample] BIT NOT NULL DEFAULT 0,
                            [CompletedAt] DATETIMEOFFSET NULL,
                            [TrackingId] NVARCHAR(100) NULL,
                            [ErrorMessage] NVARCHAR(MAX) NULL,
                            [ClientIp] NVARCHAR(100) NULL,
                            [ReprocessCount] INT NOT NULL DEFAULT 0,
                            [LastReprocessedAt] DATETIMEOFFSET NULL,
                            [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
                        );
                        CREATE INDEX IX_ProcessingLogs_UserId ON [ProcessingLogs]([UserId]);
                        CREATE INDEX IX_ProcessingLogs_CreatedAt ON [ProcessingLogs]([CreatedAt]);
                        CREATE INDEX IX_ProcessingLogs_Status ON [ProcessingLogs]([CurrentStatus]);
                        CREATE INDEX IX_ProcessingLogs_Tracking ON [ProcessingLogs]([TrackingId]);
                        CREATE INDEX IX_ProcessingLogs_IsCustomOutput ON [ProcessingLogs]([IsCustomOutput]);
                    END
                    ELSE
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'OutputFileName')
                            ALTER TABLE ProcessingLogs ADD OutputFileName NVARCHAR(255) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'OutputFilePath')
                            ALTER TABLE ProcessingLogs ADD OutputFilePath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'IsCustomOutput')
                            ALTER TABLE ProcessingLogs ADD IsCustomOutput BIT NOT NULL CONSTRAINT DF_ProcessingLogs_IsCustomOutput DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SignerAuthority')
                            ALTER TABLE ProcessingLogs ADD SignerAuthority NVARCHAR(150) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'RecipientsJson')
                            ALTER TABLE ProcessingLogs ADD RecipientsJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'DocDateStr')
                            ALTER TABLE ProcessingLogs ADD DocDateStr NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'LearnedKeywordsJson')
                            ALTER TABLE ProcessingLogs ADD LearnedKeywordsJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'IncomingDocCode')
                            ALTER TABLE ProcessingLogs ADD IncomingDocCode NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'IncomingIssuer')
                            ALTER TABLE ProcessingLogs ADD IncomingIssuer NVARCHAR(150) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SubjectTitle')
                            ALTER TABLE ProcessingLogs ADD SubjectTitle NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'StoredFilePath')
                            ALTER TABLE ProcessingLogs ADD StoredFilePath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'UrgencyLevel')
                            ALTER TABLE ProcessingLogs ADD UrgencyLevel NVARCHAR(50) NOT NULL CONSTRAINT DF_ProcessingLogs_UrgencyLevel DEFAULT 'THUONG';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ReceivedDate')
                            ALTER TABLE ProcessingLogs ADD ReceivedDate DATETIMEOFFSET NOT NULL CONSTRAINT DF_ProcessingLogs_ReceivedDate DEFAULT SYSDATETIMEOFFSET();

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SlaDeadline')
                            ALTER TABLE ProcessingLogs ADD SlaDeadline DATETIMEOFFSET NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SummaryDataJson')
                            ALTER TABLE ProcessingLogs ADD SummaryDataJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ProcessingLogs_SummaryData DEFAULT '';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SelectedOptionId')
                            ALTER TABLE ProcessingLogs ADD SelectedOptionId NVARCHAR(50) NOT NULL CONSTRAINT DF_ProcessingLogs_SelectedOption DEFAULT '';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'LegalBasesUsedJson')
                            ALTER TABLE ProcessingLogs ADD LegalBasesUsedJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_ProcessingLogs_LegalBases DEFAULT '';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ResultDataJson')
                            ALTER TABLE ProcessingLogs ADD ResultDataJson NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'DraftContentHtml')
                            ALTER TABLE ProcessingLogs ADD DraftContentHtml NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ExportedDocxPath')
                            ALTER TABLE ProcessingLogs ADD ExportedDocxPath NVARCHAR(500) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'CurrentStatus')
                            ALTER TABLE ProcessingLogs ADD CurrentStatus VARCHAR(30) NOT NULL CONSTRAINT DF_ProcessingLogs_CurrentStatus DEFAULT 'CHO_XU_LY';

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'SignedDate')
                            ALTER TABLE ProcessingLogs ADD SignedDate DATETIMEOFFSET NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'RatingScore')
                            ALTER TABLE ProcessingLogs ADD RatingScore INT NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'IsGoldSample')
                            ALTER TABLE ProcessingLogs ADD IsGoldSample BIT NOT NULL CONSTRAINT DF_ProcessingLogs_IsGoldSample DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'CompletedAt')
                            ALTER TABLE ProcessingLogs ADD CompletedAt DATETIMEOFFSET NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'TrackingId')
                            ALTER TABLE ProcessingLogs ADD TrackingId NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ErrorMessage')
                            ALTER TABLE ProcessingLogs ADD ErrorMessage NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ClientIp')
                            ALTER TABLE ProcessingLogs ADD ClientIp NVARCHAR(100) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'ReprocessCount')
                            ALTER TABLE ProcessingLogs ADD ReprocessCount INT NOT NULL CONSTRAINT DF_ProcessingLogs_ReprocessCount DEFAULT 0;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ProcessingLogs') AND name = 'LastReprocessedAt')
                            ALTER TABLE ProcessingLogs ADD LastReprocessedAt DATETIMEOFFSET NULL;
                    END

                    -- ========================================================
                    -- 7. BẢNG LegalProposals
                    -- ========================================================
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
                    ELSE
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'Notes')
                            ALTER TABLE LegalProposals ADD Notes NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'AdminResponseNote')
                            ALTER TABLE LegalProposals ADD AdminResponseNote NVARCHAR(MAX) NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'ReviewedBy')
                            ALTER TABLE LegalProposals ADD ReviewedBy UNIQUEIDENTIFIER NULL;

                        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LegalProposals') AND name = 'ReviewedAt')
                            ALTER TABLE LegalProposals ADD ReviewedAt DATETIMEOFFSET NULL;
                    END

                    -- ========================================================
                    -- 8. TỰ ĐỘNG BỔ SUNG CÁC INDEX QUAN TRỌNG NẾU THIẾU
                    -- ========================================================
                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Username' AND object_id = OBJECT_ID('Users'))
                        CREATE UNIQUE INDEX IX_Users_Username ON [Users]([Username]);

                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserSessions_RefreshToken' AND object_id = OBJECT_ID('UserSessions'))
                        CREATE UNIQUE INDEX IX_UserSessions_RefreshToken ON [UserSessions]([RefreshToken]);

                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProcessingLogs_UserId' AND object_id = OBJECT_ID('ProcessingLogs'))
                        CREATE INDEX IX_ProcessingLogs_UserId ON [ProcessingLogs]([UserId]);

                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProcessingLogs_CreatedAt' AND object_id = OBJECT_ID('ProcessingLogs'))
                        CREATE INDEX IX_ProcessingLogs_CreatedAt ON [ProcessingLogs]([CreatedAt]);

                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ProcessingLogs_Status' AND object_id = OBJECT_ID('ProcessingLogs'))
                        CREATE INDEX IX_ProcessingLogs_Status ON [ProcessingLogs]([CurrentStatus]);

                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LegalDocuments_CodeNumber' AND object_id = OBJECT_ID('LegalDocuments'))
                        CREATE INDEX IX_LegalDocuments_CodeNumber ON [LegalDocuments]([CodeNumber]);
                ");
            }
            catch (Exception ex)
            {
                // Bỏ qua nếu môi trường in-memory SQLite kiểm thử đơn vị, hoặc ghi nhận log
                System.Diagnostics.Debug.WriteLine($"[SchemaSync Notice] {ex.Message}");
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
                    Department = FieldCategory.TuPhapPhapChe,
                    IsActive = true
                };
                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
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
                    Department = FieldCategory.QuanTriVanPhong,
                    IsActive = true
                };
                await context.Users.AddAsync(specialistUser);
                await context.SaveChangesAsync();
            }

            // 5. Seed Legal Documents & Clauses (Nếu chưa có dữ liệu)
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
                    IssuerAgency = "Quốc hội Nước CHXHCN Việt Nam",
                    DocumentScope = DocumentScope.QPPL,
                    FieldCategory = FieldCategory.TuPhapPhapChe,
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
                    IssuerAgency = "Chính phủ Nước CHXHCN Việt Nam",
                    DocumentScope = DocumentScope.QPPL,
                    FieldCategory = FieldCategory.QuanTriVanPhong,
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
                    IssuerAgency = "Chính phủ Nước CHXHCN Việt Nam",
                    DocumentScope = DocumentScope.QPPL,
                    FieldCategory = FieldCategory.KinhTeTaiChinh,
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
                    IssuerAgency = "Chính phủ Nước CHXHCN Việt Nam",
                    DocumentScope = DocumentScope.QPPL,
                    FieldCategory = FieldCategory.KinhTeTaiChinh,
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
                    IssuerAgency = "Chính phủ Nước CHXHCN Việt Nam",
                    DocumentScope = DocumentScope.QPPL,
                    FieldCategory = FieldCategory.DatDaiXayDung,
                    IssuedDate = new DateTime(2021, 3, 31),
                    EffectiveDate = new DateTime(2021, 5, 15),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 6: Quyết định Hành chính cá biệt của UBND Tỉnh (HANH_CHINH)
                var adminDecisionDoc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000007"),
                    CodeNumber = "1825/QĐ-UBND",
                    Title = "Quyết định về việc phê duyệt quy trình nội bộ trong giải quyết thủ tục hành chính lĩnh vực đất đai và xây dựng",
                    DocType = LegalDocType.DecisionProv,
                    HierarchyRank = 40,
                    Issuer = "Ủy ban nhân dân tỉnh",
                    IssuerAgency = "Ủy ban nhân dân tỉnh Bình Dương",
                    DocumentScope = DocumentScope.HanhChinh,
                    FieldCategory = FieldCategory.DatDaiXayDung,
                    IssuedDate = new DateTime(2025, 7, 20),
                    EffectiveDate = new DateTime(2025, 7, 20),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                // Doc 7: Công văn Hướng dẫn nghiệp vụ (HUONG_DAN_NGHIEP_VU)
                var guidanceDoc = new LegalDocument
                {
                    Id = Guid.Parse("aaaaaaaa-1111-0000-0000-000000000008"),
                    CodeNumber = "540/HD-STP",
                    Title = "Hướng dẫn nghiệp vụ về rà soát, hệ thống hóa văn bản và kiểm tra thể thức văn bản hành chính theo Nghị định 30/2020/NĐ-CP",
                    DocType = LegalDocType.OfficialDispatch,
                    HierarchyRank = 30,
                    Issuer = "Sở Tư pháp",
                    IssuerAgency = "Sở Tư pháp tỉnh Bình Dương",
                    DocumentScope = DocumentScope.HuongDanNghiepVu,
                    FieldCategory = FieldCategory.TuPhapPhapChe,
                    IssuedDate = new DateTime(2025, 8, 10),
                    EffectiveDate = new DateTime(2025, 8, 10),
                    Status = LegalStatus.Active,
                    IsDraft = false,
                    CreatedBy = adminId
                };

                await context.LegalDocuments.AddRangeAsync(lawDoc, decree30Doc, decree123Doc, decree31Doc, decree45Doc, adminDecisionDoc, guidanceDoc);

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
                        RawContent = "Kỹ thuật trình bày văn bản hành chính: Khổ giấy A4 (210 x 297 mm), căn lề trang: Lề trên 20-25 mm, lề dưới 20-25 mm, lề trái 30-35 mm, lề phải 15-20 mm. Phông chữ tiếng Việt Unicode Times New Roman hoặc font không chân tương thích.",
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
