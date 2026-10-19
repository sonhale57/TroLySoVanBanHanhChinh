# HỒ SƠ CHI TIẾT DỰ ÁN ĐÃ TRIỂN KHAI
# HỆ THỐNG TRỢ LÝ SỐ VĂN BẢN HÀNH CHÍNH CÔNG (GOVDOC ASSISTANT)

> **Mục đích tài liệu**: Tổng hợp toàn diện kiến trúc, các phân hệ đã hoàn thiện (Backend & Frontend), quy chuẩn pháp lý và hướng dẫn triển khai. 
> **Dành cho Người dùng/Chủ quản dự án**: Có thể trực tiếp xem xét, ghi chú, đánh dấu hoặc sửa đổi yêu cầu nghiệp vụ tại **Mục 7 (Khung ghi chú & Chỉnh sửa yêu cầu)** ở cuối tài liệu này.

---

## 1. THÔNG TIN ĐỊNH DANH DỰ ÁN & CĂN CỨ PHÁP LÝ

| Mục | Nội dung chi tiết |
|---|---|
| **Tên dự án** | Hệ thống Trợ lý số Văn bản Hành chính Công (*GovDoc Assistant*) |
| **Mục tiêu hệ thống** | Tự động hóa tiếp nhận, trích xuất dữ liệu, kiểm tra pháp lý, thẩm định hồ sơ văn bản hành chính theo quy chuẩn nhà nước; tự động sinh dự thảo văn bản phúc đáp chuẩn thể thức và hỗ trợ quản trị tri thức pháp luật. |
| **Đối tượng sử dụng** | Cán bộ, chuyên viên thụ lý hồ sơ văn bản tại các cơ quan Đảng, Nhà nước, Đoàn thể, UBND các cấp; Cán bộ quản lý/Lãnh đạo phòng, ban; Quản trị viên hệ thống. |
| **Tiêu chuẩn thể thức** | **Nghị định số 30/2020/NĐ-CP** ngày 05/03/2020 của Chính phủ về công tác văn thư (Quy cách văn bản, căn lề A4 mm, tiêu ngữ, trích yếu, chữ ký, nơi nhận). |
| **Cơ sở pháp lý thẩm định** | **Luật Ban hành văn bản quy phạm pháp luật năm 2015** (sửa đổi, bổ sung năm 2020) về thứ bậc hiệu lực văn bản, nguyên tắc áp dụng văn bản mới và văn bản chuyên ngành. |
| **Quy chuẩn mã ký tự** | **TCVN 6909:2001** & **Unicode UTF-8** theo quy định của Chính phủ về văn bản điện tử và giao dịch điện tử. |
| **Nhận diện giao diện** | Tông màu Cổng Dịch vụ công Quốc gia: Đỏ cờ (`#BA1C1D`) và Vàng đồng (`#C69214`), typography duy nhất: **Nunito Sans** Việt hóa toàn diện. |

---

## 2. TỔNG QUAN KIẾN TRÚC KỸ THUẬT

Hệ thống được thiết kế theo mô hình **Clean Architecture 4 tầng** ở Backend, kết hợp với Single Page Application (SPA) hiện đại ở Frontend, triển khai gói gọn trong **1 thư mục duy nhất trên máy chủ IIS**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT CÁN BỘ (CLIENT)                     │
│  React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons            │
│  - Phông chữ Nunito Sans nhúng nội bộ, Theme Dịch vụ công Quốc gia     │
│  - 5 Màn hình nghiệp vụ chính: Workspace, Processed, KB, Lookup, Users │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API / Bearer JWT + Cookie
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                ASP.NET CORE 8 WEB API (CLEAN ARCHITECTURE)             │
├────────────────────────────────────────────────────────────────────────┤
│ 1. WebApi Layer (Controllers & Middlewares)                            │
│    - AuthController: Đăng nhập, Remember Me, Đổi mật khẩu, Session     │
│    - DocumentsController: Tiếp nhận OCR, Thẩm định, Xuất Word, Reprocess│
│    - LegalKBController: Tra cứu luật, CRUD văn bản, Quick-Import, Đề xuất│
│    - UsersController: Quản trị cán bộ, phân quyền ADMIN/USER, reset mk │
│    - StorageController: Lưu trữ & phục vụ tệp scan công văn an toàn    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Application Layer (DTOs, Interfaces, Business Contracts)            │
│    - DTOs chuẩn hóa dữ liệu đầu vào/đầu ra, Interfaces trừu tượng      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Domain Layer (Entities, Enums, Legal Evaluation Rules)              │
│    - User, UserSession, LegalDocument, LegalClauseNode, LegalRelation, │
│      ProcessingLog, LegalProposal                                      │
│    - LegalHierarchyEvaluator (Quy tắc xếp hạng hiệu lực pháp lý)       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Infrastructure Layer (Engines & Data Persistence)                   │
│    - AdministrativeAppraisalEngine: Động cơ thẩm định 6 tầng logic     │
│    - OcrService: Trích xuất PDF/DOCX/DOC/TXT, chuyển mã TCVN3/VNI      │
│    - Decree30DocxBuilder: OpenXML sinh tệp Word chuẩn mm Nghị định 30   │
│    - EF Core 8 + SQL Server 2022: Tự động khởi tạo và đồng bộ schema   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        HẠ TẦNG DỮ LIỆU & LƯU TRỮ                       │
│  - Microsoft SQL Server 2019/2022 (hoặc SQL Server Express)            │
│  - Lưu trữ tệp scan và tài liệu Word đã xuất tại local storage an toàn  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT TRIỂN KHAI BACKEND (.NET 8)

### 3.1 Cấu trúc Solution và các dự án thành phần

Solution: `GovDocAssistant.sln` bao gồm các project:
1. `src/Core/GovDoc.Domain`: Chứa các thực thể miền, enum và luật phân cấp pháp lý.
2. `src/Core/GovDoc.Application`: Định nghĩa Interfaces hợp đồng (`IOcrService`, `IDocxBuilderService`, `IAdministrativeAppraisalEngine`, `ITokenService`, `IApplicationDbContext`) và toàn bộ DTOs.
3. `src/Infrastructure/GovDoc.Infrastructure`: Cài đặt chi tiết các dịch vụ:
   - `Persistence/ApplicationDbContext.cs`: DbContext với EF Core 8.
   - `Persistence/DatabaseSeeder.cs`: Tự động tạo Database, đồng bộ cột (`Self-Migrating Schema`), gieo dữ liệu mẫu văn bản luật và tài khoản chuẩn.
   - `Services/AdministrativeAppraisalEngine.cs`: Bộ thẩm định hành chính tự động 6 tầng.
   - `Services/OcrService.cs`: Trích xuất thực thể, thời hạn, trích yếu, phát hiện văn bản lỗi font.
   - `Services/VietnameseFontConverter.cs`: Tự động nhận diện và chuyển đổi bảng mã cũ (TCVN3 / ABC, VNI-Windows) sang Unicode UTF-8 chuẩn.
   - `WordEngine/Decree30DocxBuilder.cs`: Sinh tệp Word `.docx` chuẩn 100% Nghị định 30/2020/NĐ-CP bằng OpenXML SDK.
   - `Identity/TokenService.cs`: Cấp phát JWT Access Token và Refresh Token 30 ngày.
   - `Services/LocalFileStorageService.cs`: Quản lý lưu trữ tệp scan và tệp xuất Word.
4. `src/Infrastructure/GovDoc.WebApi`: Entry point chứa Controllers, cấu hình Dependency Injection, xác thực JWT, Swagger UI, và tự phục vụ giao diện React SPA tại `wwwroot`.
5. `tests/GovDoc.Tests`: Dự án Unit Test kiểm thử đầy đủ các tình huống nghiệp vụ và xuất Word.

---

### 3.2 Cơ sở dữ liệu và Các bảng thực thể (Database Schema)

| Tên bảng | Chức năng & Các trường dữ liệu chính |
|---|---|
| `Users` | Quản lý thông tin cán bộ: `Id`, `Username`, `PasswordHash` (BCrypt), `FullName`, `Role` (`ADMIN` hoặc `USER`), `Department`, `Email`, `IsActive`, `PasswordChangedAt`, `CreatedAt`. |
| `UserSessions` | Quản lý phiên làm việc và Token duy trì đăng nhập (Remember Me): `Id`, `UserId`, `RefreshToken`, `IsPersistent` (30 ngày nếu chọn ghi nhớ), `ClientIp`, `UserAgent`, `ExpiresAt`, `IsRevoked`. |
| `LegalDocuments` | Kho văn bản pháp luật (Tủ sách pháp luật): `Id`, `CodeNumber` (Số hiệu, vd: 30/2020/NĐ-CP), `Title`, `DocType` (`HIEN_PHAP`, `LUAT`, `NGHI_DINH`, `QUYET_DINH`, `THONG_TU`), `HierarchyRank` (Thứ bậc hiệu lực 10-100), `Issuer`, `IssuedDate`, `EffectiveDate`, `ExpiredDate`, `Status` (`ACTIVE`, `EXPIRED`, `PENDING_REVIEW`), `IsDraft`, `FilePath`. |
| `LegalClauseNodes` | Cây chi tiết từng Điều/Khoản: `Id`, `DocId`, `ArticleNumber` (vd: Điều 10), `ClauseNumber` (Khoản 1), `RawContent` (Nội dung quy định), `Status`. |
| `LegalRelations` | Quan hệ pháp lý giữa các văn bản: `Id`, `SourceDocId`, `TargetDocId`, `RelationType` (`REPLACES` - Thay thế, `AMENDS` - Sửa đổi, `ANNULS` - Bãi bỏ, `GUIDES` - Hướng dẫn thi hành), `AffectedClauses`, `LegalBasisClause`. |
| `ProcessingLogs` | Sổ nhật ký giám sát & lưu trữ toàn bộ hồ sơ công văn đã xử lý: `Id`, `UserId` (định danh cán bộ thụ lý), `IncomingDocCode`, `IncomingIssuer`, `SubjectTitle`, `OriginalFileName`, `StoredFilePath`, `UrgencyLevel`, `SlaDeadline`, `SummaryDataJson`, `SelectedOptionId`, `LegalBasesUsedJson`, `ResultDataJson`, `ExportedDocxPath`, `ReprocessCount` (số lần xử lý lại), `LastReprocessedAt`, `CreatedAt`. |
| `LegalProposals` | Phân hệ đề xuất văn bản pháp lý mới từ chuyên viên: `Id`, `SubmittedBy`, `Title`, `Notes`, `AttachmentPath`, `Status` (`PENDING`, `APPROVED`, `REJECTED`), `AdminResponseNote`, `ReviewedBy`, `ReviewedAt`, `CreatedAt`. |

---

### 3.3 Các Engine và Dịch vụ xử lý cốt lõi (Backend Engines)

#### 1. Động cơ thẩm định hành chính tự động (`AdministrativeAppraisalEngine`)
Áp dụng quy trình kiểm tra 6 tầng logic nghiêm ngặt, cho ra **kết luận duy nhất (Single Verdict)** mà cán bộ không cần phải tự suy đoán:
- **Tầng 0 - Tính toàn vẹn, tính đọc được & chuẩn font chữ (Integrity & Font)**: Kiểm tra file có bị rỗng, hỏng hoặc lỗi bảng mã (Mojibake/Binary) không. Nếu lỗi, phát tín hiệu yêu cầu nạp lại tệp chuẩn Unicode TCVN 6909:2001.
- **Tầng 1 - Thẩm quyền giải quyết (Jurisdiction)**: Phát hiện nếu nội dung thuộc thẩm quyền của Cơ quan Tư pháp (Tòa án/Viện kiểm sát) hoặc vượt quá thẩm quyền cấp tỉnh -> Đưa ra hướng xử lý: *Chuyển đơn / Hướng dẫn liên hệ cơ quan có thẩm quyền*.
- **Tầng 2 - Thủ tục & Căn cứ pháp lý viện dẫn (Procedural & Basis Validity)**: Quét các số hiệu văn bản mà đơn vị gửi viện dẫn; so sánh với danh mục văn bản đã **HẾT HIỆU LỰC (Expired)** trong CSDL. Nếu viện dẫn luật đã hết hiệu lực -> Tự động cảnh báo đỏ và lập biên bản từ chối/yêu cầu điều chỉnh.
- **Tầng 3 - Thời hiệu & Tính cấp thiết (Statute of Limitations & SLA)**: Đánh giá thời gian gửi và thời hạn theo quy định pháp luật.
- **Tầng 4 - Nội dung & Tính đầy đủ của hồ sơ (Substantive & Completeness Review)**: Kiểm tra các thành phần hồ sơ bắt buộc (báo cáo đánh giá tác động, thỏa thuận bồi thường, bản vẽ quy hoạch...). Nếu thiếu -> Ra kết luận: *Yêu cầu bổ sung hồ sơ*.
- **Tầng 5 - Đưa ra kết luận thẩm định duy nhất (Unified Verdict)**:
  - `APPROVE_REQUEST`: Đủ điều kiện chấp thuận chủ trương.
  - `REJECT_INELIGIBLE`: Từ chối do không đáp ứng điều kiện pháp lý.
  - `REQUIRE_ADDITIONAL_INFO`: Yêu cầu bổ sung thông tin/hồ sơ còn thiếu.
  - `TRANSFER_AUTHORITY`: Chuyển cơ quan có thẩm quyền giải quyết.

#### 2. Dịch vụ OCR và Trích xuất thực thể (`OcrService`)
- Hỗ trợ đa định dạng: `.pdf` (bóc tách cấu trúc và khối chữ bằng UglyToad.PdfPig), `.docx` (OpenXML), `.doc`, `.txt`.
- Tích hợp `VietnameseFontConverter`: Tự động nhận dạng và chuyển đổi các văn bản cũ gõ bảng mã **TCVN3 (.VnTime, .VnTimeH)** hoặc **VNI-Windows** sang chuẩn quốc tế Unicode dựng sẵn UTF-8.
- Tự động nhận diện thực thể văn bản:
  - Số/Ký hiệu công văn (`DetectedCodeNumber`).
  - Cơ quan ban hành (`DetectedIssuer`).
  - Ngày tháng ban hành (`DetectedIssuedDate`).
  - Độ khẩn (`DetectedUrgency`: HỎA TỐC, THƯỢNG KHẨN, KHẨN, THƯỜNG).
  - Trích yếu nội dung (`SubjectTitle`).
  - Tự động tính toán hạn xử lý hồ sơ (`CalculatedSlaDeadline`): Hỏa tốc giải quyết trong 24h, Thượng khẩn 48h, Khẩn 72h, Thường 10 ngày làm việc.

#### 3. Bộ tạo văn bản Word chuẩn thể thức (`Decree30DocxBuilder`)
- Tạo file `.docx` đáp ứng 100% quy định tại Nghị định số 30/2020/NĐ-CP:
  - Khổ giấy A4 đứng (210 x 297 mm).
  - Căn lề chuẩn xác đến từng milimet: **Lề trên: 20mm, Lề dưới: 20mm, Lề trái: 30mm, Lề phải: 15mm**.
  - Tiêu ngữ và Tên cơ quan: Bảng 2 cột không viền (Borderless Table), căn giữa chuẩn tỷ lệ.
  - Trích yếu công văn: Căn giữa, chữ nghiêng, đậm theo đúng mẫu.
  - Căn cứ pháp lý: Chỉ tự động lấy các văn bản đang có hiệu lực (`ACTIVE`), tuyệt đối loại bỏ các văn bản `DRAFT` hoặc `EXPIRED`.
  - Bố cục Nơi nhận (Recipients) và Khung Chức vụ / Người ký (Signer) đúng kích thước chuẩn.

---

### 3.4 Danh mục toàn bộ REST API Endpoints Backend

#### Nhóm 1: Xác thực & Quản lý phiên (`/api/v1/auth`)
1. `POST /api/v1/auth/login`: Đăng nhập cán bộ công vụ, hỗ trợ cờ `RememberMe` (cấp Token 30 ngày lưu Cookie HttpOnly).
2. `POST /api/v1/auth/change-password` *(Cần đăng nhập)*: Đổi mật khẩu tài khoản cá nhân, xác thực mật khẩu cũ bằng BCrypt.
3. `POST /api/v1/auth/logout`: Đăng xuất, hủy và thu hồi phiên làm việc trong DB, xóa Cookie Refresh Token.
4. `GET /api/v1/auth/me` *(Cần đăng nhập)*: Lấy thông tin cán bộ đang đăng nhập kèm phân quyền.
5. `GET /api/v1/auth/demo-users`: Lấy danh sách tài khoản demo phục vụ đăng nhập nhanh 1-chạm khi kiểm thử.

#### Nhóm 2: Xử lý văn bản & Hồ sơ (`/api/v1/documents`)
6. `POST /api/v1/documents/process-incoming` *(Cần đăng nhập)*: Tiếp nhận tệp scan (PDF/DOCX/TXT), OCR trích xuất, đối soát kho luật, thẩm định 6 tầng và sinh kết luận.
7. `GET /api/v1/documents/processed-records` *(Cần đăng nhập)*: Lấy danh sách hồ sơ đã xử lý (Cán bộ xem hồ sơ của mình, Lãnh đạo xem toàn bộ).
8. `GET /api/v1/documents/processed-records/{id}` *(Cần đăng nhập)*: Lấy chi tiết kết quả thẩm định và dữ liệu trích xuất của hồ sơ cũ.
9. `POST /api/v1/documents/processed-records/{id}/reprocess` *(Cần đăng nhập)*: **Tái xử lý (Reprocess)** - Tự động thẩm định lại công văn gốc theo kho luật mới nhất được cập nhật.
10. `POST /api/v1/documents/export-draft-docx` *(Cần đăng nhập)*: Sinh và tải xuống tệp Word (.docx) dự thảo văn bản phúc đáp chuẩn Nghị định 30.
11. `GET /api/v1/documents/logs` *(Cần đăng nhập)*: Lịch sử tác nghiệp công vụ phục vụ Audit Log.

#### Nhóm 3: Tủ sách pháp luật & Đề xuất (`/api/v1/legalkb`)
12. `GET /api/v1/legalkb/search`: Tra cứu văn bản quy phạm pháp luật theo từ khóa và mốc thời gian áp dụng (`Point-in-Time`).
13. `GET /api/v1/legalkb/documents`: Lấy toàn bộ danh mục văn bản trong Tủ sách pháp luật kèm điều khoản và quan hệ.
14. `GET /api/v1/legalkb/documents/{id}`: Xem chi tiết một văn bản pháp lý, các điều khoản và quan hệ thay thế/bãi bỏ.
15. `POST /api/v1/legalkb/quick-import` *(Chỉ Admin)*: **Import 1-chạm** - Kéo thả tệp luật -> Tự động bóc tách số hiệu, trích yếu, phát hiện văn bản cũ bị thay thế/bãi bỏ.
16. `POST /api/v1/legalkb/manual` *(Chỉ Admin)*: Thêm thủ công văn bản pháp luật và danh sách điều khoản.
17. `PUT /api/v1/legalkb/{id}` *(Chỉ Admin)*: Chỉnh sửa thông tin văn bản pháp luật và đồng bộ danh sách điều khoản.
18. `PUT /api/v1/legalkb/{id}/status` *(Chỉ Admin)*: Đổi trạng thái văn bản (`ACTIVE` / `EXPIRED`) trực tiếp trên từng dòng danh sách.
19. `DELETE /api/v1/legalkb/{id}` *(Chỉ Admin)*: Xóa văn bản pháp luật khỏi hệ thống (kèm xóa quan hệ liên kết).
20. `GET /api/v1/legalkb/proposals` *(Cần đăng nhập)*: Lấy danh sách đề xuất cập nhật văn bản từ các chuyên viên.
21. `POST /api/v1/legalkb/proposals` *(Cần đăng nhập)*: Chuyên viên gửi đề xuất cập nhật luật kèm file đính kèm.
22. `PUT /api/v1/legalkb/proposals/{id}/review` *(Chỉ Admin)*: Lãnh đạo thẩm duyệt chấp thuận hoặc từ chối đề xuất.

#### Nhóm 4: Quản trị tài khoản cán bộ (`/api/v1/users`)
23. `GET /api/v1/users` *(Chỉ Admin)*: Lấy danh sách tài khoản cán bộ công vụ, tìm kiếm theo tên, phòng ban, username.
24. `POST /api/v1/users` *(Chỉ Admin)*: Tạo mới tài khoản cán bộ, phân quyền `ADMIN` hoặc `USER`.
25. `PUT /api/v1/users/{id}` *(Chỉ Admin)*: Chỉnh sửa thông tin tài khoản, phòng ban, quyền hạn (chống tự hạ quyền của chính mình).
26. `PUT /api/v1/users/{id}/reset-password` *(Chỉ Admin)*: Đặt lại mật khẩu tài khoản cán bộ và thu hồi phiên cũ.
27. `PUT /api/v1/users/{id}/toggle-status` *(Chỉ Admin)*: Khóa hoặc mở khóa tài khoản cán bộ (chống tự khóa tài khoản của chính mình).

#### Nhóm 5: Lưu trữ tệp (`/api/v1/storage`)
28. `GET /api/v1/storage/file/{folder}/{fileName}`: Tải hoặc xem tệp scan công văn đã lưu trữ an toàn.
29. `GET /api/v1/storage/preview/{fileName}`: Xem văn bản giả lập mẫu.

---

## 4. CHI TIẾT TRIỂN KHAI FRONTEND (REACT 18 + TYPESCRIPT)

### 4.1 Quy chuẩn giao diện và Công nghệ áp dụng
- **Công nghệ**: React 18, Vite 8, TypeScript, Tailwind CSS, Lucide Icons, Axios.
- **Phong cách thị giác**: Thiết kế chuyên nghiệp theo bộ nhận diện Cổng Dịch vụ công Quốc gia:
  - Màu chủ đạo: `#BA1C1D` (Đỏ cờ truyền thống) và `#C69214` (Vàng đồng trang nghiêm).
  - Phông chữ: **Nunito Sans** Việt hóa 100% được nhúng nội bộ qua `@font-face` (không phụ thuộc kết nối internet ra ngoài).
  - Trải nghiệm tác nghiệp: Tối ưu cho màn hình làm việc cơ quan, giảm thao tác gõ thừa, cơ chế xác nhận rõ ràng, nhãn trạng thái trực quan.

---

### 4.2 Các Màn hình nghiệp vụ chính (Pages)

#### 1. Màn hình Đăng nhập công vụ (`LoginPage.tsx`)
- Form xác thực định danh cán bộ với Tên đăng nhập và Mật khẩu.
- Tích hợp ô tùy chọn **"Ghi nhớ đăng nhập trên thiết bị này (30 ngày)"**.
- Cung cấp bảng **"Tài khoản thử nghiệm nhanh"** (Quản trị viên & Chuyên viên) giúp người dùng đăng nhập 1-click không cần gõ phím.
- Hiển thị đầy đủ Tiêu ngữ, Quốc huy và cam kết an toàn thông tin công vụ.

#### 2. Bàn làm việc thẩm định chia đôi (`WorkspacePage.tsx`)
Màn hình cốt lõi nhất của hệ thống, thiết kế theo mô hình **Split-screen 50:50**:
- **Nửa trái - Tiếp nhận & So chiếu tài liệu gốc**:
  - `DropzoneUpload.tsx`: Kéo thả hoặc chọn tệp công văn đến (hỗ trợ PDF, Word `.docx`, tệp văn bản). Tích hợp modal xác nhận trước khi gửi xử lý.
  - `DocumentViewer.tsx`: Xem trước trực tiếp tệp văn bản/PDF gốc, zoom in/out, xoay trang, mở toàn màn hình để đối chiếu từng câu chữ.
- **Nửa phải - Thẩm định tự động & Sinh văn bản phúc đáp**:
  - `SummaryCard.tsx`: Tóm tắt 30 giây (Vấn đề cốt lõi, Cơ sở đơn vị gửi đưa ra, Đề xuất yêu cầu) + Huy hiệu cảnh báo mức độ khẩn và thời hạn SLA đếm ngược.
  - `AppraisalVerdictCard.tsx`: **Thẻ kết luận thẩm định tự động** - Hiển thị kết luận duy nhất kèm màu sắc tương ứng (Xanh: Chấp thuận, Đỏ: Không đủ điều kiện/Từ chối, Cam: Yêu cầu bổ sung hồ sơ, Xanh dương: Chuyển cơ quan khác). Kèm theo **Bảng checklist đối soát pháp lý**, Danh sách điều kiện còn thiếu và Trích dẫn căn cứ pháp lý còn hiệu lực.
  - `DraftPreview.tsx`: **Khung xem trước A4 văn bản phúc đáp** mô phỏng chuẩn giao diện trang Word theo Nghị định 30. Cho phép cán bộ sửa nhanh Tiêu đề, Tên cơ quan, Địa danh, Chức danh người ký, Ghi chú bổ sung.
  - Nút **"Tải tệp Word (.docx) chuẩn Nghị định 30"** 1-chạm để nộp Lãnh đạo hoặc chỉnh sửa thêm trên Microsoft Word.

#### 3. Sổ theo dõi hồ sơ đã xử lý (`ProcessedDocumentsPage.tsx`)
- Danh sách toàn bộ các công văn đã tiếp nhận và xử lý trên hệ thống.
- Bộ lọc tìm kiếm nhanh theo Số ký hiệu, Đơn vị gửi, Trích yếu nội dung.
- Phân quyền dữ liệu: Cán bộ chỉ thấy hồ sơ của mình phụ trách; Lãnh đạo quản lý thấy hồ sơ toàn cơ quan.
- Xem chi tiết hồ sơ cũ và tải lại file công văn gốc.
- **Tính năng độc quyền: "XỬ LÝ LẠI (REPROCESS)"**: Khi Tủ sách pháp luật có luật mới thay thế luật cũ, cán bộ chỉ cần nhấn nút "Xử lý lại", hệ thống sẽ tự động đưa công văn gốc qua động cơ thẩm định 6 tầng để cập nhật lại kết luận pháp lý mới nhất mà không cần tải lại file.

#### 4. Tra cứu Tủ sách pháp luật (`LegalLookupPage.tsx`)
- Tra cứu văn bản quy phạm pháp luật đang có hiệu lực theo từ khóa và theo thời điểm ban hành (`Point-in-Time`).
- Hiển thị cây Điều/Khoản, phân cấp thứ bậc văn bản (Luật > Nghị định > Thông tư).
- Hiển thị quan hệ bãi bỏ / thay thế giữa các văn bản.
- Tích hợp nút **"Gửi đề xuất bổ sung văn bản pháp lý"** mở modal `SubmitProposalModal.tsx` để chuyên viên gửi yêu cầu nạp luật mới lên Lãnh đạo.

#### 5. Quản trị Tủ sách pháp luật (`AdminLegalKBPage.tsx`) *(Dành cho Lãnh đạo/Admin)*
- Thao tác văn phòng trực quan, thiết kế cho cán bộ không rành kỹ thuật:
  - **Import 1-chạm (`QuickImportModal.tsx`)**: Kéo thả tệp luật -> Tự động nhận diện số hiệu, trích yếu, phát hiện văn bản cũ cần bãi bỏ -> Xác nhận lưu vào kho.
  - **Thêm/Sửa văn bản (`LegalEditModal.tsx`)**: Biểu mẫu văn phòng dễ dùng, hỗ trợ thêm từng Điều/Khoản.
  - **Xem chi tiết văn bản (`LegalDetailModal.tsx`)**: Đọc toàn bộ nội dung điều khoản và liên kết quan hệ.
  - **Bật/Tắt hiệu lực trực tiếp**: Nút gạt chuyển đổi Còn hiệu lực / Hết hiệu lực ngay trên bảng danh sách.
  - **Phân hệ duyệt đề xuất (`ProposalList.tsx`)**: Danh sách đề xuất từ các chuyên viên gửi lên, Lãnh đạo xem xét phê duyệt hoặc từ chối kèm ý kiến chỉ đạo.

#### 6. Quản trị cán bộ công vụ (`AdminUserManagementPage.tsx`) *(Dành cho Lãnh đạo/Admin)*
- Quản lý danh sách cán bộ cơ quan, cấp mới tài khoản công vụ.
- Phân quyền vai trò: `ADMIN` (Lãnh đạo/Quản trị viên) hoặc `USER` (Chuyên viên thụ lý).
- Chức năng **Đặt lại mật khẩu (Reset password)** cho cán bộ quên mật khẩu.
- Chức năng **Khóa/Kích hoạt tài khoản**.
- Tích hợp cơ chế bảo vệ an toàn: Chống tự khóa tài khoản hoặc tự hạ quyền quản trị của chính mình.

---

### 4.3 Các Thành phần dùng chung (Common Components & Modals)

1. `Header.tsx`: Thanh điều hướng tác nghiệp, hiển thị Quốc hiệu, Tên người dùng, Vai trò, Nút mở Nhật ký tác nghiệp (Audit Log), Nút Đổi mật khẩu cá nhân và Nút Đăng xuất.
2. `ChangePasswordModal.tsx`: Hộp thoại đổi mật khẩu tài khoản cá nhân có kiểm tra độ dài và khớp mật khẩu xác nhận.
3. `AuditLogModal.tsx`: Xem nhật ký thao tác tiếp nhận và xử lý công văn theo từng mốc thời gian.
4. `ActionConfirmModal.tsx`: Hộp thoại xác nhận thao tác công vụ trước khi tiếp nhận và xử lý tệp.
5. `StatusBadge.tsx`: Huy hiệu hiển thị trạng thái thẩm định, mức độ khẩn và hiệu lực pháp luật.
6. `EvidencePopover.tsx`: Hộp thoại hiển thị trích dẫn căn cứ điều/khoản pháp lý đối soát.

---

## 5. QUY TRÌNH NGHIỆP VỤ VẬN HÀNH THỰC TẾ

```
[BƯỚC 1: TIẾP NHẬN] 
  Cán bộ tải lên file công văn đến (PDF, Word, Doc, Txt)
       │
       ▼
[BƯỚC 2: BÓC TÁCH OCR & MÃ HÓA]
  OcrService tự giải mã font chữ TCVN3/VNI sang Unicode UTF-8
  Trích xuất: Số hiệu, Cơ quan gửi, Trích yếu, Mức độ khẩn, Tính toán hạn SLA
       │
       ▼
[BƯỚC 3: ĐỐI SOÁT & THẨM ĐỊNH 6 TẦNG]
  AppraisalEngine kiểm tra:
  - Tầng 0: Tính toàn vẹn & chuẩn font chữ
  - Tầng 1: Thẩm quyền giải quyết
  - Tầng 2: Căn cứ pháp lý (loại bỏ triệt để văn bản Hết hiệu lực)
  - Tầng 3: Thời hiệu & Tính cấp thiết
  - Tầng 4: Nội dung & Tính đầy đủ của hồ sơ
  - Tầng 5: Kết luận duy nhất (Chấp thuận / Từ chối / Bổ sung / Chuyển cơ quan)
       │
       ▼
[BƯỚC 4: SINH DỰ THẢO VĂN BẢN PHÚC ĐÁP]
  Hệ thống nạp kết luận và các căn cứ còn hiệu lực vào mẫu dự thảo
  Khung xem trước A4 chuẩn thể thức Nghị định 30 hiển thị trên màn hình
       │
       ▼
[BƯỚC 5: XUẤT BẢN & LƯU VẾT HỒ SƠ]
  Cán bộ chỉnh sửa nhanh thông tin người ký và nhấn Tải Word (.docx)
  Hệ thống lưu toàn bộ kết quả vào Sổ theo dõi (ProcessingLogs) định danh cán bộ
       │
       ▼
[BƯỚC 6: TÁI THẨM ĐỊNH KHI CÓ LUẬT MỚI (REPROCESS)]
  Khi Tủ sách pháp luật cập nhật văn bản thay thế
  Cán bộ chỉ cần nhấn "Xử lý lại" trong Sổ theo dõi -> Tự động thẩm định lại theo luật mới
```

---

## 6. HIỆN TRẠNG KIỂM THỬ, ĐÓNG GÓI & TRIỂN KHAI

### 6.1 Kết quả kiểm thử tự động (Unit & Integration Tests)
Toàn bộ **31/31 bài test tự động** trong bộ kiểm thử `GovDoc.Tests` đều đạt trạng thái **PASSED (100%)**:
- Kiểm thử tạo tệp Word chuẩn căn lề 20-20-30-15 mm theo Nghị định 30.
- Kiểm thử bảng tiêu ngữ 2 cột không viền và bố cục chữ ký, nơi nhận.
- Kiểm thử phát hiện tệp hỏng, tệp rỗng, tệp lỗi font bảng mã nhị phân.
- Kiểm thử thẩm định từ chối do không thuộc thẩm quyền cấp tỉnh (chuyển Tòa án/Cơ quan tư pháp).
- Kiểm thử phát hiện và cảnh báo đỏ khi văn bản gửi lên viện dẫn luật đã hết hiệu lực.
- Kiểm thử các tình huống chấp thuận chủ trương đầu tư và yêu cầu bổ sung hồ sơ quy hoạch.

### 6.2 Cấu trúc thư mục đóng gói triển khai (Folder Deploy)
Dự án đã được build hoàn chỉnh thành **1 thư mục duy nhất `deploy/`** sẵn sàng triển khai trên máy chủ Windows Server với IIS:
```
deploy/
├── GovDoc.WebApi.dll           # Ứng dụng Backend chính (.NET 8)
├── web.config                  # Cấu hình tự động nhận diện trên IIS
├── appsettings.json            # Cấu hình hệ thống mặc định
├── appsettings.Production.json # Cấu hình môi trường vận hành (chỉnh Connection String)
├── wwwroot/                    # Giao diện React SPA đã build tối ưu hóa
│   ├── index.html
│   ├── assets/                 # Bundle JS (449KB gzip 122KB), Bundle CSS (36KB)
│   └── images/                 # Quốc huy, Trống đồng, Biểu tượng Dịch vụ công
├── logs/                       # Thư mục ghi nhật ký lỗi tự động
└── *.dll                       # Toàn bộ thư viện phụ thuộc đi kèm
```

---

## 7. BẢNG RÀ SOÁT & KHUNG CHỈNH SỬA YÊU CẦU DÀNH CHO NGƯỜI DÙNG
*(Quý cán bộ / Quản lý dự án vui lòng đánh dấu `[x]` hoặc ghi chú trực tiếp các yêu cầu điều chỉnh tại phần dưới đây)*

### 7.1 Đánh giá mức độ đáp ứng các tính năng hiện tại

| STT | Phân hệ / Tính năng | Hiện trạng | Trạng thái rà soát | Ghi chú & Ý kiến chỉnh sửa của bạn |
|:---:|---|---|:---:|---|
| 1 | **Đăng nhập & Ghi nhớ phiên** | Đã hoàn thiện (JWT + Cookie 30 ngày) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 2 | **Đổi mật khẩu cán bộ cá nhân** | Đã hoàn thiện (xác thực BCrypt) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 3 | **Quản lý cán bộ (Admin)** | Đã hoàn thiện (Thêm, Khóa, Đổi quyền, Reset mật khẩu) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 4 | **Tiếp nhận & OCR văn bản** | Đã hoàn thiện (PDF, Word, TXT, giải mã font cũ) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 5 | **Bóc tách thực thể & Tính hạn SLA** | Đã hoàn thiện (Hỏa tốc 24h, Khẩn 72h, Thường 10 ngày) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 6 | **Động cơ thẩm định 6 tầng** | Đã hoàn thiện (Kiểm tra font, thẩm quyền, thời hiệu, nội dung) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 7 | **Khung xem trước A4 & Xuất Word** | Đã hoàn thiện (Chuẩn thể thức mm Nghị định 30) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 8 | **Sổ theo dõi & Lịch sử hồ sơ** | Đã hoàn thiện (Phân quyền cán bộ/lãnh đạo) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 9 | **Tái xử lý hồ sơ (Reprocess)** | Đã hoàn thiện (Thẩm định lại tự động theo luật mới) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 10 | **Tủ sách pháp luật & Quick Import** | Đã hoàn thiện (Kéo thả nhận diện thay thế luật cũ) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 11 | **Phân hệ Đề xuất luật từ chuyên viên** | Đã hoàn thiện (Gửi đề xuất, Lãnh đạo thẩm duyệt) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |
| 12 | **Đóng gói triển khai IIS (1 Folder)** | Đã hoàn thiện (Thư mục `deploy/` chạy độc lập) | [ ] Đạt / [ ] Cần sửa | *Nhập ý kiến tại đây...* |

---

### 7.2 Đề xuất bổ sung tính năng mới hoặc thay đổi luồng nghiệp vụ
*(Bạn hãy viết thêm các gạch đầu dòng hoặc mô tả chi tiết yêu cầu thay đổi dưới đây, hệ thống sẽ đọc và tiến hành cập nhật mã nguồn theo đúng mong muốn của bạn)*:

- **Yêu cầu 1**: *(Ví dụ: Cần bổ sung thêm trường thông tin X vào form tiếp nhận văn bản...)*
- **Yêu cầu 2**: *(Ví dụ: Cần điều chỉnh mẫu văn bản Word mục Nơi nhận...)*
- **Yêu cầu 3**: *(Ví dụ: Bổ sung thêm luồng ký số điện tử hoặc xuất tệp PDF...)*
- **Yêu cầu khác**: ...
