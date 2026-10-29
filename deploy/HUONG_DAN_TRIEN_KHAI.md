# HƯỚNG DẪN TRIỂN KHAI
## Trợ lý số Văn bản Hành chính Công

---

## CẤU TRÚC FOLDER DEPLOY (1 FOLDER DUY NHẤT)

```
deploy/                         ← Copy toàn bộ folder này lên máy chủ
├── GovDoc.WebApi.dll           ← Ứng dụng chính (.NET 8)
├── web.config                  ← IIS tự nhận diện và chạy
├── appsettings.json            ← Cấu hình mặc định
├── appsettings.Production.json ← Cấu hình production (chỉnh Connection String tại đây)
├── wwwroot/                    ← React SPA (ASP.NET Core tự serve)
│   ├── index.html
│   └── assets/
├── logs/                       ← Log tự động ghi vào đây
└── *.dll                       ← Các thư viện phụ thuộc
```

> **IIS chỉ cần trỏ Physical Path vào folder `deploy/` — xong.**  
> Không cần ARR, không cần URL Rewrite, không cần cấu hình proxy.

---

## YÊU CẦU HẠ TẦNG

| Thành phần | Yêu cầu |
|---|---|
| **IIS** | Windows Server / Windows 10+ với IIS 10+ |
| **ASP.NET Core Hosting Bundle** | **.NET 8** — bắt buộc |
| **SQL Server** | SQL Server 2019/2022 hoặc **SQL Server Express** |

> ✅ **Không cần cài URL Rewrite Module.**  
> ✅ **Không cần cài Application Request Routing (ARR).**

---

## BƯỚC 1: CÀI ĐẶT TIỀN ĐIỀU KIỆN

### 1.1 Cài .NET 8 ASP.NET Core Hosting Bundle
Tải từ: https://dotnet.microsoft.com/download/dotnet/8.0

→ Chọn **"ASP.NET Core Runtime 8.x – Windows Hosting Bundle"**  
→ Cài xong **phải restart IIS**: mở Command Prompt với quyền Admin rồi chạy:
```cmd
iisreset
```

### 1.2 Đảm bảo SQL Server đang chạy
- SQL Server Express: https://www.microsoft.com/sql-server/sql-server-downloads
- Kiểm tra service `MSSQL$SQLEXPRESS` đang Running trong Services (services.msc)

---

## BƯỚC 2: CHỈNH CONNECTION STRING (NẾU CẦN)

Mở file `appsettings.Production.json` trong folder `deploy/`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.\\SQLEXPRESS;Database=GovDocAssistantDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;"
}
```

| Tình huống | Thay đổi |
|---|---|
| SQL Server Express mặc định | Giữ nguyên `Server=.\\SQLEXPRESS` |
| SQL Server full, instance mặc định | Đổi thành `Server=.` hoặc `Server=localhost` |
| SQL Server trên máy khác | Đổi thành `Server=TÊN_MÁY_CHỦ\\SQLEXPRESS` |
| Dùng SQL Authentication (sa) | Thêm `User Id=sa;Password=...;` và xóa `Trusted_Connection=True` |

---

## BƯỚC 3: TẠO WEBSITE TRÊN IIS

1. Mở **IIS Manager** (`inetmgr`)
2. Chuột phải **Sites** → **Add Website**
3. Điền thông tin:

| Trường | Giá trị |
|---|---|
| **Site name** | `GovDocAssistant` |
| **Physical path** | `C:\đường-dẫn\deploy` ← trỏ thẳng vào folder deploy |
| **Port** | `80` (hoặc port tùy ý) |

4. Nhấn **OK**

5. **Chỉnh Application Pool**:
   - Vào **Application Pools** → chuột phải pool vừa tạo → **Advanced Settings**
   - **.NET CLR version** → chọn **No Managed Code**
   - **Identity** → nếu dùng Windows Auth cho SQL: chọn `NetworkService` hoặc tài khoản có quyền SQL

---

## BƯỚC 4: PHÂN QUYỀN THƯ MỤC

Mở Command Prompt với quyền **Administrator**:

```cmd
icacls "C:\đường-dẫn\deploy" /grant "IIS AppPool\GovDocAssistant:(OI)(CI)F"
```

*(Thay `GovDocAssistant` bằng tên Application Pool nếu đặt tên khác)*

---

## KHỞI ĐỘNG TỰ ĐỘNG DATABASE

Khi API chạy **lần đầu tiên**, hệ thống tự động:

| # | Hành động |
|---|---|
| 1 | ✅ Tạo database `GovDocAssistantDb` nếu chưa tồn tại |
| 2 | ✅ Tạo tất cả bảng dữ liệu |
| 3 | ✅ Thêm cột mới nếu có nâng cấp schema |
| 4 | ✅ Tạo tài khoản Admin mặc định |
| 5 | ✅ Nạp dữ liệu pháp lý mẫu |

**Không cần chạy bất kỳ script SQL nào.**

---

## TÀI KHOẢN MẶC ĐỊNH

| Vai trò | Username | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin` | `Admin@123` |
| Chuyên viên | `chuyenvien` | `User@123` |

> ⚠️ **Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!**

---

## KIỂM TRA SAU TRIỂN KHAI

Sau khi cài xong, mở trình duyệt:
- **Ứng dụng**: `http://localhost` (hoặc IP máy chủ)
- **API Health**: `http://localhost/health`
- **Swagger API**: `http://localhost/swagger`

---

## XỬ LÝ SỰ CỐ

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| HTTP Error 500.19 | Thiếu ASP.NET Core Module | Cài .NET 8 Hosting Bundle, chạy `iisreset` |
| HTTP Error 500.30 | Lỗi khởi động app | Xem log tại `deploy\logs\stdout_*.log` |
| Lỗi kết nối DB | Connection String sai hoặc SQL chưa chạy | Kiểm tra `appsettings.Production.json` và SQL Server service |
| Trang trắng sau đăng nhập | Chưa phân quyền thư mục | Chạy lệnh `icacls` phân quyền |
| Application Pool dừng | App crash khi khởi động | Bật `stdoutLogEnabled=true` trong `web.config`, xem log |
| HTTP Error 405 Method Not Allowed | WebDAV Module trên IIS chặn PUT/DELETE/PATCH | Đã được cấu hình tự động loại bỏ WebDAV trong `web.config` đi kèm; nếu vẫn bị, vào IIS Manager -> Modules -> gỡ bỏ `WebDAVModule`. |
