# HỒ SƠ THỰC THI HỆ THỐNG: TRỢ LÝ SỐ VĂN BẢN HÀNH CHÍNH CÔNG
> **Target Execution Engine**: Antigravity / Autonomous Coding Agent
> **Tech Stack**: ASP.NET Core 8 Web API + Microsoft SQL Server 2022 + React 18 (Vite, TypeScript, Tailwind CSS)
> **Tiêu chuẩn thể thức**: Nghị định số 30/2020/NĐ-CP ngày 05/03/2020 của Chính phủ
> **Cơ sở pháp lý xử lý**: Luật Ban hành văn bản quy phạm pháp luật 2015 (sửa đổi, bổ sung 2020)
> **Quy chuẩn giao diện**: 1 màn hình chia đôi (Split-screen), Zero-prompting, duy nhất phông chữ Nunito Sans việt hóa, màu sắc Cổng Dịch vụ công Quốc gia (#BA1C1D & #C69214).
> **Xác thực & Quản trị (Phase 2)**: Định danh tài khoản cá nhân (Đổi mật khẩu, Lưu mật khẩu Remember Me, Đăng xuất độc lập, Không switch role). Tủ sách pháp luật thao tác văn phòng trực quan (Import 1-chạm, Thêm/Sửa/Xóa đơn giản cho cán bộ không rành kỹ thuật).

---

## 1. TỔNG QUAN KIẾN TRÚC KỸ THUẬT (CLEAN ARCHITECTURE)

┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT CÁN BỘ (CLIENT)                     │
│        React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons       │
│        (1 font Nunito Sans, Theme Dịch vụ công: #BA1C1D / #C69214)     │
│        [Đăng nhập, Lưu mật khẩu 30 ngày, Đổi mật khẩu, Đăng xuất]      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API / Bearer JWT Token
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ASP.NET CORE 8 WEB API GATEWAY                    │
├────────────────────────────────────────────────────────────────────────┤
│ [Presentation Layer] Controllers: Auth, Documents, LegalKB             │
├────────────────────────────────────────────────────────────────────────┤
│ [Application Layer] MediatR / CQRS Handlers, FluentValidation, DTOs    │
│  - AuthenticateCommand (Hỗ trợ RememberMe - token dài hạn 30 ngày)     │
│  - ChangePasswordCommand, RevokeSessionCommand                         │
│  - ProcessIncomingDocumentCommand                                      │
│  - ExportDecree30DocxQuery                                             │
│  - QuickImportLegalDocCommand (Tự OCR, trích xuất & nhận diện thay thế)│
│  - ManageLegalDocCommands (Create, Update, Invalidate, Delete)         │
├────────────────────────────────────────────────────────────────────────┤
│ [Domain Layer] Entities, Enums, Legal Domain Rules, Hierarchy Logic    │
│  - User, UserSession, LegalDocument, LegalRelation, ProcessingLog      │
│  - LegalHierarchyEvaluator (Thứ bậc hiệu lực & Áp dụng theo thời điểm) │
├────────────────────────────────────────────────────────────────────────┤
│ [Infrastructure Layer] Data Access & External Engines                  │
│  - EF Core 8 + SQL Server 2022 (Full-Text Search, Temporal Tracking)   │
│  - OpenXML SDK (DocumentFormat.OpenXml) sinh file Word chuẩn lề mm     │
│  - PasswordHashService (BCrypt / PBKDF2) & TokenService (JWT/Cookie)   │
│  - Local File Storage Service lưu trữ tệp scan và file Word nội bộ     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    HẠ TẦNG DỮ LIỆU CÔNG QUYỀN                          │
│  - Microsoft SQL Server 2022 Enterprise / Standard                     │
│    + Bảng Users, UserSessions (Phiên đăng nhập & Lưu mật khẩu)         │
│    + Bảng quan hệ pháp lý & Đồ thị phân cấp (HierarchyId / Relations) │
│    + Full-Text Catalog tìm kiếm thuật ngữ hành chính tiếng Việt       │
│    + Temporal History lưu vết thay đổi luật theo từng giây             │
│  - File Server / On-Premise Storage (Lưu trữ tài liệu mật nội bộ)      │
└────────────────────────────────────────────────────────────────────────┘

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN

GovDocAssistant/
├── GovDocAssistant.sln
├── docker-compose.yml
├── implementation.md
├── .gitignore
├── src/
│   ├── Client/                                # FRONTEND: React 18 + Vite + TypeScript
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── national-emblem.svg
│   │   │   └── fonts/                         # Nhúng nội bộ 100% Nunito Sans
│   │   │       ├── NunitoSans-Regular.ttf
│   │   │       ├── NunitoSans-Medium.ttf
│   │   │       ├── NunitoSans-SemiBold.ttf
│   │   │       └── NunitoSans-Bold.ttf
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── index.css                      # @font-face Nunito Sans duy nhất
│   │       ├── routes/
│   │       │   ├── AppRoutes.tsx
│   │       │   └── ProtectedRoute.tsx         # Chặn truy cập trái quyền theo Role
│   │       ├── pages/
│   │       │   ├── LoginPage.tsx              # Form đăng nhập + Checkbox "Ghi nhớ đăng nhập"
│   │       │   ├── WorkspacePage.tsx          # Bàn làm việc chia đôi 1 màn hình
│   │       │   ├── LegalLookupPage.tsx        # Tra cứu văn bản (User Read-only)
│   │       │   └── AdminLegalKBPage.tsx       # Tủ sách pháp lý quản trị (CRUD & Import 1-chạm)
│   │       ├── components/
│   │       │   ├── common/
│   │       │   │   ├── Header.tsx             # Header Dịch vụ công (Tên, Đổi mật khẩu, Đăng xuất)
│   │       │   │   ├── ChangePasswordModal.tsx# Modal đổi mật khẩu cán bộ
│   │       │   │   ├── StatusBadge.tsx        # Badge trạng thái giao thông
│   │       │   │   └── EvidencePopover.tsx    # Dẫn chứng nguồn Điều/Khoản
│   │       │   ├── workspace/
│   │       │   │   ├── DropzoneUpload.tsx     # Kéo thả file công văn đến
│   │       │   │   ├── DocumentViewer.tsx     # Xem file PDF/Ảnh gốc
│   │       │   │   ├── SummaryCard.tsx        # Tóm tắt 30s + Cảnh báo SLA đỏ
│   │       │   │   ├── ActionSelector.tsx     # 3 nút chọn hướng giải quyết
│   │       │   │   └── DraftPreview.tsx       # Khung xem trước A4 & Nút Tải Word
│   │       │   └── admin/
│   │       │       ├── QuickImportModal.tsx   # Import 1-chạm: Kéo file -> Nhận diện thay thế -> Lưu
│   │       │       ├── LegalEditModal.tsx     # Thêm/Sửa văn bản biểu mẫu văn phòng dễ dùng
│   │       │       └── ProposalList.tsx       # Duyệt đề xuất từ cán bộ
│   │       ├── context/
│   │       │   └── AuthContext.tsx            # Quản lý phiên JWT & thông tin cán bộ
│   │       ├── services/
│   │       │   └── api.ts                     # Axios client đính kèm Bearer token
│   │       └── types/
│   │           └── index.ts
│   ├── Core/
│   │   ├── GovDoc.Domain/                     # DOMAIN LAYER
│   │   │   ├── Common/BaseEntity.cs
│   │   │   ├── Entities/
│   │   │   │   ├── User.cs                    # Thông tin cán bộ, Hash mật khẩu, Role
│   │   │   │   ├── UserSession.cs             # Quản lý phiên và Refresh Token (Remember Me)
│   │   │   │   ├── LegalDocument.cs
│   │   │   │   ├── LegalClauseNode.cs         # Cây Điều/Khoản/Điểm
│   │   │   │   ├── LegalRelation.cs           # Quan hệ Thay thế/Bãi bỏ/Sửa đổi
│   │   │   │   ├── ProcessingLog.cs           # Audit log định danh người thực hiện
│   │   │   │   └── LegalProposal.cs
│   │   │   ├── Enums/
│   │   │   │   ├── UserRole.cs                # ADMIN hoặc USER (Gán cố định per account)
│   │   │   │   ├── LegalDocType.cs
│   │   │   │   ├── LegalStatus.cs
│   │   │   │   └── RelationType.cs
│   │   │   └── Rules/
│   │   │       └── LegalHierarchyEvaluator.cs # Xử lý thứ bậc & mốc thời gian
│   │   └── GovDoc.Application/                # APPLICATION LAYER
│   │       ├── Common/Interfaces/
│   │       │   ├── IApplicationDbContext.cs
│   │       │   ├── ITokenService.cs
│   │       │   ├── IDocxBuilderService.cs
│   │       │   └── IOcrService.cs
│   │       ├── Features/
│   │       │   ├── Auth/
│   │       │   │   ├── Commands/LoginCommand.cs
│   │       │   │   ├── Commands/ChangePasswordCommand.cs
│   │       │   │   ├── Commands/LogoutCommand.cs
│   │       │   │   └── Queries/GetCurrentUserQuery.cs
│   │       │   ├── Documents/
│   │       │   │   ├── Commands/ProcessIncomingDocumentCommand.cs
│   │       │   │   └── Queries/ExportDecree30DocxQuery.cs
│   │       │   └── LegalKB/
│   │       │       ├── Commands/QuickImportLegalDocCommand.cs
│   │       │       ├── Commands/CreateLegalDocCommand.cs
│   │       │       ├── Commands/UpdateLegalDocCommand.cs
│   │       │       ├── Commands/DeleteLegalDocCommand.cs
│   │       │       └── Queries/SearchLegalNormsQuery.cs
│   │       └── DTOs/
│   └── Infrastructure/
│       ├── GovDoc.Infrastructure/             # INFRASTRUCTURE LAYER
│       │   ├── Persistence/ApplicationDbContext.cs
│       │   ├── Identity/
│       │   │   ├── TokenService.cs            # JWT + HttpOnly Cookie Remember Me
│       │   │   └── PasswordHashService.cs
│       │   ├── Services/
│       │   │   ├── OcrService.cs
│       │   │   ├── LegalSearchEngine.cs       # FTS + Cosine Similarity
│       │   │   └── LocalFileStorageService.cs
│       │   └── WordEngine/
│       │       └── Decree30DocxBuilder.cs     # OpenXML SDK canh chuẩn mm
│       └── GovDoc.WebApi/                     # PRESENTATION LAYER
│           ├── Program.cs
│           ├── appsettings.json
│           ├── Controllers/
│           │   ├── AuthController.cs          # Đăng nhập, Đổi MK, Lưu MK, Đăng xuất
│           │   ├── DocumentsController.cs
│           │   └── LegalKBController.cs       # API Tủ sách pháp lý CRUD & Import
│           └── Middlewares/
│               ├── JwtAuthenticationMiddleware.cs
│               └── ExceptionHandlingMiddleware.cs

---

## 3. MÔ HÌNH LOGIC PHÁP LÝ & QUY TẮC BẢO ĐẢM ĐỘ CHÍNH XÁC

Toàn bộ quy trình đề xuất phương án và dẫn chứng điều khoản tuân thủ nghiêm ngặt Luật Ban hành văn bản quy phạm pháp luật năm 2015 (sửa đổi, bổ sung năm 2020).

### 3.1. Ma trận Thứ bậc Hiệu lực Pháp lý (Hierarchy Rank)
Khi phân tích tình huống nghiệp vụ, nếu có sự xung đột hoặc giao thoa giữa các văn bản, hệ thống áp dụng bộ trọng số thứ bậc:

| Thứ bậc ưu tiên | Loại Văn bản Quy phạm Pháp luật | Cơ quan Ban hành | Trọng số (HierarchyRank) |
| :---: | :--- | :--- | :---: |
| Bậc 1 | Hiến pháp | Quốc hội | 100 |
| Bậc 2 | Bộ luật, Luật, Nghị quyết | Quốc hội | 90 |
| Bậc 3 | Pháp lệnh, Nghị quyết | Ủy ban Thường vụ Quốc hội | 80 |
| Bậc 4 | Nghị định | Chính phủ | 70 |
| Bậc 5 | Quyết định | Thủ tướng Chính phủ | 60 |
| Bậc 6 | Thông tư | Bộ trưởng, Thủ trưởng cơ quan ngang bộ | 50 |
| Bậc 7 | Quyết định | Ủy ban nhân dân cấp tỉnh | 40 |

3 Quy tắc giải quyết xung đột văn bản:
1. Ưu tiên văn bản có hiệu lực cao hơn (Khoản 2 Điều 156): Áp dụng văn bản có hiệu lực pháp lý cao hơn.
2. Ưu tiên văn bản ban hành sau cùng cấp (Khoản 3 Điều 156): Áp dụng văn bản ban hành sau giữa các văn bản cùng cơ quan ban hành.
3. Ưu tiên văn bản chuyên ngành (Khoản 1 Điều 156): Quy định chuyên ngành được ưu tiên so với quy định chung.

### 3.2. Quản lý Hiệu lực theo Thời điểm Sự việc (Point-in-Time Temporal Validity)
- Hồ sơ hành chính thường xử lý hành vi xảy ra trong quá khứ. Nguyên tắc: Áp dụng văn bản có hiệu lực tại thời điểm xảy ra sự việc.
- Hệ thống hỗ trợ tham số PointInTimeDate: Lọc văn bản thỏa mãn:
  EffectiveDate <= PointInTimeDate < ExpiredDate
- Mặc định xử lý hồ sơ hiện hành: Status = 'ACTIVE'.

### 3.3. Tự động Nhận diện Bãi bỏ & Thay thế khi Cán bộ Import Luật Mới
- Khi cán bộ nạp văn bản mới bằng tệp scan, hệ thống tự bóc tách Điều khoản thi hành:
  - Nếu chứa câu: "Nghị định này thay thế Nghị định số X/YYYY/NĐ-CP" -> Tự động đánh dấu quan hệ REPLACES và gợi ý chuyển văn bản cũ sang EXPIRED.
  - Nếu chứa câu: "Bãi bỏ Điều A, Khoản B của Thông tư số Y/ZZZZ/TT-BNV" -> Tự động chuyển nút cây điều khoản tương ứng sang EXPIRED_PARTIAL.
- Cán bộ không cần thao tác kỹ thuật, chỉ cần bấm nút [Đồng ý áp dụng] trên bảng tóm tắt đối soát.

---

## 4. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU SQL SERVER (DDL TOÀN DIỆN)

CREATE DATABASE GovDocAssistantDb COLLATE Latin1_General_100_CI_AI_SC_UTF8;
GO

USE GovDocAssistantDb;
GO

-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN CÔNG VỤ (PHASE 2 AUTH)
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'USER',     -- Cố định 'ADMIN' hoặc 'USER' (Không switch)
    Department NVARCHAR(150) NOT NULL,
    Email NVARCHAR(150) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    PasswordChangedAt DATETIMEOFFSET NULL,
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LockoutEnd DATETIMEOFFSET NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

-- 2. BẢNG PHIÊN ĐĂNG NHẬP & LƯU MẬT KHẨU (REMEMBER ME)
CREATE TABLE UserSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    RefreshToken NVARCHAR(255) NOT NULL UNIQUE,
    IsPersistent BIT NOT NULL DEFAULT 0,          -- 1 = Remember Me (30 ngày), 0 = 8 giờ
    ClientIp NVARCHAR(50) NULL,
    UserAgent NVARCHAR(500) NULL,
    ExpiresAt DATETIMEOFFSET NOT NULL,
    IsRevoked BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

CREATE NONCLUSTERED INDEX IX_UserSessions_UserId ON UserSessions(UserId);
CREATE NONCLUSTERED INDEX IX_UserSessions_RefreshToken ON UserSessions(RefreshToken);
GO

-- 3. BẢNG KHO VĂN BẢN QUY PHẠM PHÁP LUẬT (TỦ SÁCH PHÁP LÝ)
CREATE TABLE LegalDocuments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CodeNumber NVARCHAR(100) NOT NULL,            -- Số ký hiệu (vd: 30/2020/NĐ-CP)
    Title NVARCHAR(MAX) NOT NULL,                 -- Trích yếu nội dung
    DocType NVARCHAR(50) NOT NULL,                -- LUAT, NGHI_DINH, THONG_TU, DU_THAO
    HierarchyRank INT NOT NULL,                   -- 100 (Hiến pháp) -> 40 (QĐ UBND)
    Issuer NVARCHAR(150) NOT NULL,                -- Chính phủ, Bộ, UBND...
    IssuedDate DATE NOT NULL,
    EffectiveDate DATE NOT NULL,
    ExpiredDate DATE NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',-- ACTIVE, EXPIRED, EXPIRED_PARTIAL, DRAFT
    IsDraft BIT NOT NULL DEFAULT 0,               -- 1 = Dự thảo (Khóa làm căn cứ chính thức)
    FilePath NVARCHAR(500) NULL,
    CreatedBy UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Users(Id),
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

CREATE NONCLUSTERED INDEX IX_LegalDocuments_CodeNumber ON LegalDocuments(CodeNumber);
CREATE NONCLUSTERED INDEX IX_LegalDocuments_Status ON LegalDocuments(Status);
CREATE NONCLUSTERED INDEX IX_LegalDocuments_Dates ON LegalDocuments(EffectiveDate, ExpiredDate);
GO

-- 4. BẢNG NÚT CÂY ĐIỀU KHOẢN PHÁP LUẬT
CREATE TABLE LegalClauseNodes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES LegalDocuments(Id) ON DELETE CASCADE,
    ChapterTitle NVARCHAR(200) NULL,              -- Chương II
    ArticleNumber NVARCHAR(100) NOT NULL,         -- Điều 14
    ClauseNumber NVARCHAR(100) NULL,              -- Khoản 2
    PointIdentifier NVARCHAR(50) NULL,            -- Điểm b
    RawContent NVARCHAR(MAX) NOT NULL,            -- Nội dung nguyên văn
    Status NVARCHAR(30) NOT NULL DEFAULT 'ACTIVE',-- Quản lý hiệu lực riêng từng khoản
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

CREATE NONCLUSTERED INDEX IX_LegalClauseNodes_DocId ON LegalClauseNodes(DocId);
CREATE NONCLUSTERED INDEX IX_LegalClauseNodes_ArticleNumber ON LegalClauseNodes(ArticleNumber);
GO

-- 5. BẢNG QUAN HỆ ĐỒ THỊ PHÁP LUẬT
CREATE TABLE LegalRelations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SourceDocId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES LegalDocuments(Id),
    TargetDocId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES LegalDocuments(Id),
    RelationType NVARCHAR(50) NOT NULL,           -- REPLACES, AMENDS, REPEALS, GUIDES
    AffectedClauses NVARCHAR(500) NULL,           -- "Toàn văn" hoặc "Khoản 2 Điều 15"
    LegalBasisClause NVARCHAR(MAX) NULL,          -- Căn cứ Điều khoản thi hành
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

CREATE NONCLUSTERED INDEX IX_LegalRelations_SourceDoc ON LegalRelations(SourceDocId);
CREATE NONCLUSTERED INDEX IX_LegalRelations_TargetDoc ON LegalRelations(TargetDocId);
GO

-- 6. BẢNG NHẬT KÝ XỬ LÝ CÔNG VĂN (AUDIT LOG BẤT BIẾN)
CREATE TABLE ProcessingLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(Id),
    IncomingDocCode NVARCHAR(100) NULL,
    IncomingIssuer NVARCHAR(150) NULL,
    OriginalFileName NVARCHAR(255) NOT NULL,
    UrgencyLevel NVARCHAR(50) DEFAULT 'THUONG',
    SlaDeadline DATETIMEOFFSET NULL,
    SummaryDataJson NVARCHAR(MAX) NOT NULL,
    SelectedOptionId NVARCHAR(50) NOT NULL,
    LegalBasesUsedJson NVARCHAR(MAX) NOT NULL,
    ExportedDocxPath NVARCHAR(500) NULL,
    ClientIp NVARCHAR(50) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
GO

CREATE NONCLUSTERED INDEX IX_ProcessingLogs_UserId ON ProcessingLogs(UserId);
CREATE NONCLUSTERED INDEX IX_ProcessingLogs_CreatedAt ON ProcessingLogs(CreatedAt);
GO

-- 7. BẢNG ĐỀ XUẤT CẬP NHẬT LUẬT TỪ CHUYÊN VIÊN
CREATE TABLE LegalProposals (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SubmittedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(Id),
    Title NVARCHAR(255) NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    AttachmentPath NVARCHAR(500) NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT 'PENDING',
    AdminResponseNote NVARCHAR(MAX) NULL,
    ReviewedBy UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES Users(Id),
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ReviewedAt DATETIMEOFFSET NULL
);
GO

-- 8. FULL-TEXT SEARCH CATALOG
CREATE FULLTEXT CATALOG GovLegalCatalog AS DEFAULT;
GO

CREATE FULLTEXT INDEX ON LegalClauseNodes(RawContent)
KEY INDEX PK_LegalClauseNodes ON GovLegalCatalog
WITH STOPLIST = SYSTEM;
GO

---

## 5. THIẾT KẾ & CHUẨN HÓA FRONTEND REACT (NUNITO SANS & TAILWIND)

### 5.1. Typography: Phông Chữ Nunito Sans (Duy nhất 100%)
Tệp src/Client/src/index.css:

@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Nunito Sans';
  src: url('/fonts/NunitoSans-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nunito Sans';
  src: url('/fonts/NunitoSans-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nunito Sans';
  src: url('/fonts/NunitoSans-SemiBold.ttf') format('truetype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nunito Sans';
  src: url('/fonts/NunitoSans-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-sans: 'Nunito Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

html, body {
  font-family: var(--font-sans);
  background-color: #F4F6F9;
  color: #1C252E;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

### 5.2. Cấu hình Tailwind CSS Chuẩn Mã màu Dịch vụ công
Tệp src/Client/tailwind.config.js:

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito Sans"', 'sans-serif'],
      },
      colors: {
        gov: {
          primary: '#BA1C1D',
          'primary-dark': '#8F1213',
          'primary-light': '#FDE8E8',
          gold: '#C69214',
          'gold-light': '#FEF7E6',
          bg: '#F4F6F9',
          surface: '#FFFFFF',
          border: '#DCE2E8',
          subtle: '#EBEFF3',
          text: '#1C252E',
          'text-secondary': '#516173',
          'text-disabled': '#8E9EAF',
          active: '#137333',
          'active-bg': '#EAF7EE',
          'active-border': '#8CE0A2',
          warning: '#B06000',
          'warning-bg': '#FEF3D6',
          'warning-border': '#F8D072',
          danger: '#C5221F',
          'danger-bg': '#FCE8E6',
          'danger-border': '#F5A39B',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};

### 5.3. Giao diện Đăng nhập, Đổi mật khẩu & Tủ sách Pháp luật Cán bộ
- Màn hình Đăng nhập (LoginPage.tsx):
  - Nhập Tên đăng nhập & Mật khẩu.
  - Ô chọn: [X] Ghi nhớ đăng nhập trên máy tính này (Remember Me).
- Menu Header (Header.tsx):
  - Hiển thị tên cán bộ, phòng ban và vai trò.
  - Nút bấm: [Đổi mật khẩu] -> Mở modal đổi mật khẩu 3 trường (Mật khẩu cũ, Mật khẩu mới, Xác nhận).
  - Nút bấm: [Đăng xuất] -> Thoát phiên ngay lập tức.
  - Tuyệt đối KHÔNG có nút chuyển đổi vai trò (No switch role).
- Trang Tủ sách Pháp luật (AdminLegalKBPage.tsx):
  - Nút lớn: [ + Import tệp Luật mới (Tự động nhận diện) ] -> Kéo thả PDF/Word -> Hiện bảng đối soát -> Bấm Xác nhận.
  - Nút: [ + Thêm thủ công ] -> Mở modal 4 ô đơn giản (Số hiệu, Tên văn bản, Ngày hiệu lực, File đính kèm).
  - Bảng danh sách: Tìm kiếm nhanh theo số hiệu/từ khóa, nút [Sửa] và nút [Đánh dấu Hết hiệu lực] trực tiếp trên từng dòng.

---

## 6. ĐỘNG CƠ BIÊN SOẠN WORD CHUẨN NGHỊ ĐỊNH 30 (.NET OPENXML SDK)

Tệp src/Infrastructure/GovDoc.Infrastructure/WordEngine/Decree30DocxBuilder.cs:

using System.IO;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace GovDoc.Infrastructure.WordEngine
{
    public class Decree30DocxBuilder
    {
        public static byte[] GenerateOfficialDispatch(
            string issuerParent,
            string issuerName,
            string docCode,
            string location,
            string docDateStr,
            string subjectTitle,
            string recipientMain,
            string[] legalBases,
            string[] contentParagraphs,
            string[] recipientsList,
            string signerTitle,
            string signerName)
        {
            using var memoryStream = new MemoryStream();
            using (var wordDoc = WordprocessingDocument.Create(memoryStream, WordprocessingDocumentType.Document, true))
            {
                var mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                var body = mainPart.Document.AppendChild(new Body());

                // CĂN LỀ A4 CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP (20-20-30-15 mm)
                var sectionProps = new SectionProperties();
                var pageSize = new PageSize() { Width = 11906U, Height = 16838U };
                var pageMargin = new PageMargin()
                {
                    Top = 1134,
                    Bottom = 1134,
                    Left = 1701,
                    Right = 850
                };
                sectionProps.Append(pageSize);
                sectionProps.Append(pageMargin);

                // BẢNG TIÊU NGỮ 2 CỘT KHÔNG VIỀN
                var headerTable = new Table();
                var tableProps = new TableProperties(
                    new TableWidth() { Type = TableWidthUnitValues.Dxa, Width = "9355" },
                    new TableBorders(
                        new TopBorder() { Val = BorderValues.None },
                        new LeftBorder() { Val = BorderValues.None },
                        new BottomBorder() { Val = BorderValues.None },
                        new RightBorder() { Val = BorderValues.None },
                        new InsideHorizontalBorder() { Val = BorderValues.None },
                        new InsideVerticalBorder() { Val = BorderValues.None }
                    )
                );
                headerTable.AppendChild(tableProps);

                var headerRow = new TableRow();
                var cellLeft = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4800" }));
                cellLeft.Append(CreateParagraph(issuerParent.ToUpper(), 12, false, false, JustificationValues.Center));
                cellLeft.Append(CreateParagraph(issuerName.ToUpper(), 12, true, false, JustificationValues.Center));
                cellLeft.Append(CreateParagraph($"Số: {docCode}", 13, false, false, JustificationValues.Center));

                var cellRight = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4555" }));
                cellRight.Append(CreateParagraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 12, true, false, JustificationValues.Center));
                cellRight.Append(CreateParagraph("Độc lập - Tự do - Hạnh phúc", 13, true, false, JustificationValues.Center));
                cellRight.Append(CreateParagraph($"{location}, ngày {docDateStr}", 13, false, true, JustificationValues.Center));

                headerRow.Append(cellLeft);
                headerRow.Append(cellRight);
                headerTable.Append(headerRow);
                body.Append(headerTable);

                // TRÍCH YẾU
                body.Append(CreateParagraph($"V/v {subjectTitle}", 13, true, false, JustificationValues.Center, 240, 240));

                // KÍNH GỬI
                body.Append(CreateParagraph($"Kính gửi: {recipientMain}.", 14, true, false, JustificationValues.Left, 120, 120, 567));

                // CĂN CỨ PHÁP LÝ
                foreach (var legalBase in legalBases)
                {
                    body.Append(CreateParagraph($"Căn cứ {legalBase};", 13, false, true, JustificationValues.Justify, 0, 60, 0, 720));
                }

                // NỘI DUNG VĂN BẢN
                foreach (var content in contentParagraphs)
                {
                    body.Append(CreateParagraph(content, 14, false, false, JustificationValues.Justify, 0, 120, 0, 720));
                }

                // CHÂN TRANG: NƠI NHẬN & CHỮ KÝ
                var footerTable = new Table();
                footerTable.AppendChild(new TableProperties(
                    new TableWidth() { Type = TableWidthUnitValues.Dxa, Width = "9355" },
                    new TableBorders(
                        new TopBorder() { Val = BorderValues.None },
                        new LeftBorder() { Val = BorderValues.None },
                        new BottomBorder() { Val = BorderValues.None },
                        new RightBorder() { Val = BorderValues.None },
                        new InsideHorizontalBorder() { Val = BorderValues.None },
                        new InsideVerticalBorder() { Val = BorderValues.None }
                    )
                ));

                var footerRow = new TableRow();
                var cellRecipients = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4800" }));
                cellRecipients.Append(CreateParagraph("Nơi nhận:", 11, true, true, JustificationValues.Left));
                foreach (var rec in recipientsList)
                {
                    cellRecipients.Append(CreateParagraph($"- {rec};", 10, false, false, JustificationValues.Left));
                }

                var cellSignature = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4555" }));
                cellSignature.Append(CreateParagraph(signerTitle.ToUpper(), 13, true, false, JustificationValues.Center));
                cellSignature.Append(CreateParagraph("\n\n\n", 13, false, false, JustificationValues.Center));
                cellSignature.Append(CreateParagraph(signerName, 14, true, false, JustificationValues.Center));

                footerRow.Append(cellRecipients);
                footerRow.Append(cellSignature);
                footerTable.Append(footerRow);
                body.Append(footerTable);

                body.Append(sectionProps);
                mainPart.Document.Save();
            }

            return memoryStream.ToArray();
        }

        private static Paragraph CreateParagraph(
            string text,
            int fontSizePt,
            bool isBold = false,
            bool isItalic = false,
            JustificationValues alignment = JustificationValues.Left,
            int spaceBeforeDxa = 0,
            int spaceAfterDxa = 0,
            int leftIndentDxa = 0,
            int firstLineIndentDxa = 0)
        {
            var p = new Paragraph();
            var pPr = new ParagraphProperties();

            pPr.Append(new Justification() { Val = alignment });
            pPr.Append(new SpacingBetweenLines() { Before = spaceBeforeDxa.ToString(), After = spaceAfterDxa.ToString(), Line = "276", LineRule = LineSpacingRuleValues.Auto });

            if (leftIndentDxa > 0 || firstLineIndentDxa > 0)
            {
                pPr.Append(new Indentation() { Left = leftIndentDxa.ToString(), FirstLine = firstLineIndentDxa.ToString() });
            }

            p.Append(pPr);

            var run = new Run();
            var rPr = new RunProperties();
            rPr.Append(new RunFonts() { Ascii = "Times New Roman", HighAnsi = "Times New Roman", ComplexScript = "Times New Roman" });
            rPr.Append(new FontSize() { Val = (fontSizePt * 2).ToString() });

            if (isBold) rPr.Append(new Bold());
            if (isItalic) rPr.Append(new Italic());

            run.Append(rPr);
            run.Append(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            p.Append(run);
            return p;
        }
    }
}

---

## 7. HỢP ĐỒNG GIAO TIẾP API (.NET 8 RESTFUL CONTRACTS)

### 7.1. Phân hệ Xác thực & Tài khoản Cán bộ (Auth Controller)
- POST /api/v1/auth/login
  - Body: { "username": "canbo.nv", "password": "Password123!", "rememberMe": true }
  - Response 200 OK:
    {
      "accessToken": "eyJhbGciOi...",
      "expiresIn": 28800,
      "user": {
        "id": "7a3b4e12-...",
        "fullName": "Lê Quốc Sơn Hà",
        "role": "USER",
        "department": "Phòng Kinh tế & Ngân sách"
      }
    }
  - Ghi chú: Nếu rememberMe = true, hệ thống gắn kèm HttpOnly Refresh Token có hạn 30 ngày.

- POST /api/v1/auth/change-password
  - Headers: Authorization: Bearer <token>
  - Body: { "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }
  - Response 200 OK: { "message": "Đổi mật khẩu thành công." }

- POST /api/v1/auth/logout
  - Headers: Authorization: Bearer <token>
  - Response 200 OK: Thu hồi token hiện tại, xóa session trên máy chủ.

### 7.2. Phân hệ Tủ sách Pháp luật Đơn giản hóa (LegalKB Controller)
- POST /api/v1/admin/legal-kb/quick-import
  - Mô tả: Nạp file văn bản mới, tự bóc tách thông tin và phát hiện quan hệ thay thế/bãi bỏ.
  - Body: IFormFile file
  - Response 200 OK:
    {
      "detectedCode": "123/2026/NĐ-CP",
      "detectedTitle": "Nghị định quy định chi tiết thi hành Luật Đầu tư",
      "effectiveDate": "2027-01-01",
      "replacesDocCode": "45/2019/NĐ-CP",
      "replacesDocTitle": "Nghị định số 45/2019/NĐ-CP ngày 01/06/2019",
      "suggestedAction": "INVALIDATE_OLD_DOC"
    }

- POST /api/v1/admin/legal-kb/manual (Thêm thủ công 4 trường đơn giản)
- PUT /api/v1/admin/legal-kb/{id} (Sửa thông tin văn bản)
- PUT /api/v1/admin/legal-kb/{id}/status (Đổi trạng thái: Còn hiệu lực / Hết hiệu lực)
- DELETE /api/v1/admin/legal-kb/{id} (Xóa văn bản với xác nhận 2 bước)

### 7.3. Phân hệ Xử lý Hồ sơ
- POST /api/v1/documents/process-incoming (Tiếp nhận và tóm tắt công văn đến)
- POST /api/v1/documents/export-draft-docx (Xuất tệp Word Nghị định 30 theo phương án chọn)

---

## 8. KẾ HOẠCH & DANH MỤC NHIỆM VỤ KỸ THUẬT (ANTIGRAVITY TASKS)

### Phase 1: Nền tảng Nghiệp vụ & Động cơ Thể thức
- [x] Khởi tạo Solution GovDocAssistant.sln (.NET 8 Web API + SQL Server 2022).
- [x] Xây dựng Decree30DocxBuilder.cs bằng DocumentFormat.OpenXml chuẩn lề mm (20-20-30-15mm).
- [x] Xây dựng LegalHierarchyEvaluator.cs giải quyết mâu thuẫn văn bản theo Điều 156 Luật Ban hành VBQPPL.
- [x] Dựng giao diện Bàn làm việc chia đôi 1 màn hình (React + Tailwind + Nunito Sans).

### Phase 2: Xác thực Nâng cao & Tủ sách Pháp luật Thân thiện Cán bộ
- [x] Thêm tính năng Lưu mật khẩu (Remember Me - Refresh Token 30 ngày) tại trang LoginPage.tsx.
- [x] Xây dựng API và giao diện Đổi mật khẩu (ChangePasswordModal.tsx) an toàn, dễ dùng.
- [x] Xây dựng nút Đăng xuất độc lập, dọn dẹp sạch token client và server.
- [x] Xây dựng tính năng Quick-Import tệp luật: Kéo file -> Tự trích xuất -> Gợi ý bãi bỏ luật cũ -> Bấm 1 nút xác nhận.
- [x] Hoàn thiện giao diện Quản trị Tủ sách dạng bảng đơn giản: Thêm thủ công, Sửa thông tin & Trạng thái an toàn (loại bỏ nút toggle ngoài bảng tránh bấm nhầm), Xóa có xác nhận.
- [x] Cấu hình phân quyền truy cập: Cán bộ Role USER vào "Tra cứu Pháp luật" (chỉ đọc văn bản quy phạm, giao diện tinh gọn); Lãnh đạo Role ADMIN vào "Quản trị Tủ sách".
- [x] Đồng bộ tên phân hệ: "Quản trị Tủ sách" (dành cho Admin) và "Tra cứu Pháp luật" (dành cho User) trên toàn bộ hệ thống.

### Phase 3: Pipeline Xử lý Văn bản Thật (Multi-Format Ingestion & Dynamic Public Sector Reasoning)
- [x] Tích hợp bộ giải mã tệp đa định dạng: Vector PDF (`PdfPig 0.1.16`), Word `.docx` (`DocumentFormat.OpenXml`), và file văn bản UTF-8.
- [x] Xây dựng Động cơ bóc tách 9 thành phần thể thức Nghị định 30/2020/NĐ-CP (`OcrService.cs`): Số hiệu, Cơ quan ban hành, Ngày ký, Mức độ khẩn, Tính toán hạn xử lý SLA tự động loại trừ Thứ 7/Chủ nhật, Trích yếu nội dung, Căn cứ viện dẫn, và Người ký.
- [x] Xây dựng Động cơ khớp nối CSDL Tủ sách Pháp luật động: Khớp từ khóa hồ sơ vào `LegalDocuments` còn hiệu lực theo thứ bậc ưu tiên (`HierarchyRank`), tự động khóa cảnh báo văn bản hết hiệu lực (`EXPIRED`).
- [x] Tối ưu hóa giao diện Bàn làm việc chia đôi (Split-screen): Nhúng PDF Canvas Viewer tệp gốc bên trái, form tóm tắt 30s + cảnh báo SLA đỏ, và xuất tệp Word `.docx` phúc đáp động chuẩn lề mm Nghị định 30.
- [x] Viết bộ kiểm thử tự động bóc tách thực thể văn bản và tính toán SLA (`RealDocumentProcessingTests.cs` - 12/12 unit tests Passed).

### Phase 4: Động Cơ Thẩm Định Hành Chính Tự Động & Triệt Tiêu Dữ Liệu Mẫu (Deterministic Appraisal & Mock Deprecation)
- [x] Dọn sạch 100% dữ liệu mẫu, công văn thử nghiệm (`sample-ccn`, `sample-stc`, `sample-khieu-nai`), xóa endpoint `/documents/samples` và xóa fallback mock data.
- [x] Bắt buộc kiểm tra tệp thật: Endpoint `POST /documents/process-incoming` chặn bắt buộc phải có tệp hợp lệ (trả về HTTP 400 nếu không có tệp).
- [x] Xây dựng Động cơ Thẩm định Hành chính 4 Tầng (`AdministrativeAppraisalEngine.cs`):
  - Tầng 1: Kiểm tra Thẩm quyền cơ quan hành chính theo Luật Tổ chức CQĐP.
  - Tầng 2: Kiểm tra Tính hiệu lực của toàn bộ văn bản quy phạm pháp luật viện dẫn.
  - Tầng 3: Bảng kiểm Điều kiện & Thành phần hồ sơ thực tế (Báo cáo thực địa, xác nhận cấp huyện).
  - Tầng 4: Tự động tính toán Phán quyết Duy nhất (`APPROVED`, `REQUIRE_ADDITIONAL_INFO`, `REJECTED`, `TRANSFER_AUTHORITY`).
- [x] Thay thế hoàn toàn component chọn phương án bằng `AppraisalVerdictCard.tsx`: Hiển thị Huy hiệu Kết luận Thẩm định duy nhất, Ma trận Bảng kiểm Tiêu chí (Compliance Matrix), và Danh mục tài liệu thiếu cần yêu cầu bổ sung.
- [x] Thiết kế Empty State chuyên nghiệp tại Bàn làm việc khi chưa có văn bản nạp vào.
- [x] Viết bộ kiểm thử tự động `AdministrativeAppraisalEngineTests.cs` (Tổng cộng 16/16 unit tests Passed).

---

## 9. TIÊU CHÍ KIỂM THỬ & NGHIỆM THU NGHIỆP VỤ

1. Trải nghiệm Đăng nhập & Tài khoản (Phase 2):
   - Khi chọn "Ghi nhớ đăng nhập", đóng trình duyệt mở lại vẫn giữ trạng thái đăng nhập trong 30 ngày.
   - Đổi mật khẩu thành công và kiểm tra mật khẩu mới hoạt động chính xác.
   - Tuyệt đối không có tính năng switch vai trò; đăng xuất xóa sạch phiên làm việc.
2. Trải nghiệm Tủ sách Pháp luật Đơn giản hóa:
   - Cán bộ nạp 1 file Nghị định mới trong dưới 15 giây mà không cần điền mã phức tạp.
   - Hệ thống tự phát hiện chính xác văn bản bị thay thế và hỏi ý kiến cán bộ bằng ngôn ngữ hành chính dễ hiểu.
   - Thao tác Thêm / Sửa / Đổi trạng thái hoàn tất trực tiếp trên 1 màn hình.
3. Độ chuẩn xác Thể thức Hành chính (Nghị định 30/2020/NĐ-CP):
   - Tệp .docx xuất ra đạt chuẩn 100% về căn lề: Lề trái 30mm, lề phải 15mm, lề trên 20mm, lề dưới 20mm.
   - Bảng tiêu ngữ 2 cột không có đường kẻ bao quanh; vị trí Quốc hiệu, Tiêu ngữ, Tên cơ quan, Số hiệu cân đối.
4. Năng lực Xử lý Văn bản Thật & Thẩm định Tự động (Phase 3 & Phase 4):
   - Tuyệt đối không còn dữ liệu thử nghiệm hay nút nạp mẫu; hệ thống thuần khiết tiếp nhận tệp thật.
   - Tự động bóc tách 9 thành phần thể thức và tính SLA loại trừ ngày nghỉ cuối tuần.
   - Hướng giải quyết được Động cơ Thẩm định Pháp lý 4 Tầng tự động tính toán duy nhất đúng theo luật định, loại trừ hoàn toàn nguy cơ người dùng tự ý chọn sai phương án.
   - Xuất file Word `.docx` chuẩn thể thức Nghị định 30 liên kết trực tiếp với kết luận thẩm định đã tính toán.
