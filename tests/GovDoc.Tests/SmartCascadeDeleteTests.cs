using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Persistence;
using GovDoc.WebApi.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace GovDoc.Tests
{
    public class SmartCascadeDeleteTests
    {
        private ApplicationDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new ApplicationDbContext(options);
        }

        private ClaimsPrincipal CreateUserPrincipal(Guid userId, string role = "ADMIN", string username = "admin")
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.Role, role)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        }

        // =========================================================================
        // 1. VĂN BẢN PHÁP LUẬT (LegalDocument)
        // =========================================================================

        [Fact]
        public async Task DeleteDoc_WithoutForeignKeys_ShouldDeleteImmediatelyWithSingleStep()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var doc = new LegalDocument
            {
                Id = Guid.NewGuid(),
                CodeNumber = "01/2026/NĐ-CP",
                Title = "Nghị định quy định một số điều",
                DocType = "NGHI_DINH",
                Issuer = "Chính phủ",
                Status = LegalStatus.Active
            };
            context.LegalDocuments.Add(doc);
            await context.SaveChangesAsync();

            var controller = new LegalKBController(context, null!, null!, null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(Guid.NewGuid()) }
                }
            };

            // Act: forceCascade = false (Default 1-step confirm)
            var result = await controller.DeleteDoc(doc.Id, forceCascade: false);

            // Assert: Thành công ngay trong 1 bước
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Null(await context.LegalDocuments.FindAsync(doc.Id));
        }

        [Fact]
        public async Task DeleteDoc_WithForeignKeys_ForceCascadeFalse_ShouldReturn409ConflictWithDependencies()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var docId = Guid.NewGuid();
            var targetDocId = Guid.NewGuid();

            var doc = new LegalDocument
            {
                Id = docId,
                CodeNumber = "02/2026/NĐ-CP",
                Title = "Nghị định quản lý đô thị",
                DocType = "NGHI_DINH",
                Issuer = "Chính phủ"
            };
            var targetDoc = new LegalDocument
            {
                Id = targetDocId,
                CodeNumber = "03/2026/NĐ-CP",
                Title = "Nghị định quy hoạch xây dựng",
                DocType = "NGHI_DINH",
                Issuer = "Chính phủ"
            };

            context.LegalDocuments.AddRange(doc, targetDoc);

            // Add 2 child clauses (LegalClauseNodes)
            context.LegalClauseNodes.AddRange(
                new LegalClauseNode { Id = Guid.NewGuid(), DocId = docId, ArticleNumber = "Điều 1", RawContent = "Phạm vi điều chỉnh" },
                new LegalClauseNode { Id = Guid.NewGuid(), DocId = docId, ArticleNumber = "Điều 2", RawContent = "Đối tượng áp dụng" }
            );

            // Add 1 relation (LegalRelation)
            context.LegalRelations.Add(new LegalRelation
            {
                Id = Guid.NewGuid(),
                SourceDocId = docId,
                TargetDocId = targetDocId,
                RelationType = "CAN_CU"
            });

            await context.SaveChangesAsync();

            var controller = new LegalKBController(context, null!, null!, null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(Guid.NewGuid()) }
                }
            };

            // Act: forceCascade = false
            var result = await controller.DeleteDoc(docId, forceCascade: false);

            // Assert: Trả về HTTP 409 Conflict với cờ yêu cầu xác nhận lần 2 và danh sách phụ thuộc
            var conflictResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status409Conflict, conflictResult.StatusCode);

            var impact = Assert.IsType<DeleteImpactResultDto>(conflictResult.Value);
            Assert.True(impact.RequiresCascadeConfirmation);
            Assert.True(impact.HasForeignKeys);
            Assert.Equal(2, impact.Dependencies.Count);

            var clauseDep = impact.Dependencies.FirstOrDefault(d => d.TableName == "LegalClauseNodes");
            Assert.NotNull(clauseDep);
            Assert.Equal(2, clauseDep.Count);

            var relDep = impact.Dependencies.FirstOrDefault(d => d.TableName == "LegalRelations");
            Assert.NotNull(relDep);
            Assert.Equal(1, relDep.Count);

            // Dữ liệu vẫn được bảo vệ, chưa bị xóa
            Assert.NotNull(await context.LegalDocuments.FindAsync(docId));
        }

        [Fact]
        public async Task DeleteDoc_WithForeignKeys_ForceCascadeTrue_ShouldCleanUpAllRelatedData()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var docId = Guid.NewGuid();
            var targetDocId = Guid.NewGuid();

            var doc = new LegalDocument { Id = docId, CodeNumber = "10/2026/NĐ-CP", Title = "Doc 10", DocType = "LUAT", Issuer = "Quốc hội" };
            var targetDoc = new LegalDocument { Id = targetDocId, CodeNumber = "11/2026/NĐ-CP", Title = "Doc 11", DocType = "LUAT", Issuer = "Quốc hội" };
            context.LegalDocuments.AddRange(doc, targetDoc);

            context.LegalClauseNodes.Add(new LegalClauseNode { Id = Guid.NewGuid(), DocId = docId, ArticleNumber = "Điều 1", RawContent = "Nội dung" });
            context.LegalRelations.Add(new LegalRelation { Id = Guid.NewGuid(), SourceDocId = docId, TargetDocId = targetDocId, RelationType = "SUA_DOI" });
            await context.SaveChangesAsync();

            var controller = new LegalKBController(context, null!, null!, null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(Guid.NewGuid()) }
                }
            };

            // Act: forceCascade = true (Xác nhận lần 2 để dọn sạch dữ liệu)
            var result = await controller.DeleteDoc(docId, forceCascade: true);

            // Assert: Trả về 200 OK và dọn sạch toàn bộ điều khoản lẫn quan hệ
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Null(await context.LegalDocuments.FindAsync(docId));
            Assert.Empty(await context.LegalClauseNodes.Where(c => c.DocId == docId).ToListAsync());
            Assert.Empty(await context.LegalRelations.Where(r => r.SourceDocId == docId || r.TargetDocId == docId).ToListAsync());
            // Target doc vẫn tồn tại độc lập
            Assert.NotNull(await context.LegalDocuments.FindAsync(targetDocId));
        }

        // =========================================================================
        // 2. TÀI KHOẢN CÁN BỘ (User)
        // =========================================================================

        [Fact]
        public async Task DeleteUser_WithoutForeignKeys_ShouldDeleteImmediately()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var adminId = Guid.NewGuid();
            var targetUserId = Guid.NewGuid();

            var targetUser = new User
            {
                Id = targetUserId,
                Username = "chuyenvien_moi",
                FullName = "Chuyên viên mới",
                Department = "Phòng Nội vụ",
                PasswordHash = "hash"
            };
            context.Users.Add(targetUser);
            await context.SaveChangesAsync();

            var controller = new UsersController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(adminId) }
                }
            };

            // Act: forceCascade = false
            var result = await controller.DeleteUser(targetUserId, forceCascade: false);

            // Assert: Xóa thành công ngay
            Assert.IsType<OkObjectResult>(result);
            Assert.Null(await context.Users.FindAsync(targetUserId));
        }

        [Fact]
        public async Task DeleteUser_WithForeignKeys_ForceCascadeFalse_ShouldReturn409Conflict()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var adminId = Guid.NewGuid();
            var targetUserId = Guid.NewGuid();

            var targetUser = new User
            {
                Id = targetUserId,
                Username = "chuyenvien_kinhnghiem",
                FullName = "Chuyên viên có hồ sơ",
                Department = "Phòng Tư pháp",
                PasswordHash = "hash"
            };
            context.Users.Add(targetUser);

            // Gắn 2 hồ sơ công văn (ProcessingLogs)
            context.ProcessingLogs.AddRange(
                new ProcessingLog { Id = Guid.NewGuid(), UserId = targetUserId, OriginalFileName = "CV1.pdf", SelectedOptionId = "OPT1" },
                new ProcessingLog { Id = Guid.NewGuid(), UserId = targetUserId, OriginalFileName = "CV2.pdf", SelectedOptionId = "OPT1" }
            );

            // Gắn 1 phiên đăng nhập (UserSessions)
            context.UserSessions.Add(new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = targetUserId,
                RefreshToken = "token123",
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(7)
            });

            await context.SaveChangesAsync();

            var controller = new UsersController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(adminId) }
                }
            };

            // Act: forceCascade = false
            var result = await controller.DeleteUser(targetUserId, forceCascade: false);

            // Assert: Trả về HTTP 409 Conflict với các bảng phụ thuộc
            var conflictResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status409Conflict, conflictResult.StatusCode);

            var impact = Assert.IsType<DeleteImpactResultDto>(conflictResult.Value);
            Assert.True(impact.RequiresCascadeConfirmation);

            var logDep = impact.Dependencies.FirstOrDefault(d => d.TableName == "ProcessingLogs");
            Assert.NotNull(logDep);
            Assert.Equal(2, logDep.Count);

            var sessionDep = impact.Dependencies.FirstOrDefault(d => d.TableName == "UserSessions");
            Assert.NotNull(sessionDep);
            Assert.Equal(1, sessionDep.Count);

            // User chưa bị xóa
            Assert.NotNull(await context.Users.FindAsync(targetUserId));
        }

        [Fact]
        public async Task DeleteUser_WithForeignKeys_ForceCascadeTrue_ShouldCascadeCleanAllData()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var adminId = Guid.NewGuid();
            var targetUserId = Guid.NewGuid();

            var targetUser = new User
            {
                Id = targetUserId,
                Username = "chuyenvien_xoa",
                FullName = "Chuyên viên xóa",
                Department = "Phòng Kế hoạch",
                PasswordHash = "hash"
            };
            context.Users.Add(targetUser);

            context.ProcessingLogs.Add(new ProcessingLog { Id = Guid.NewGuid(), UserId = targetUserId, OriginalFileName = "CV.pdf", SelectedOptionId = "OPT1" });
            context.UserSessions.Add(new UserSession { Id = Guid.NewGuid(), UserId = targetUserId, RefreshToken = "token_abc", ExpiresAt = DateTimeOffset.UtcNow.AddDays(1) });
            await context.SaveChangesAsync();

            var controller = new UsersController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(adminId) }
                }
            };

            // Act: forceCascade = true (Xác nhận lần 2)
            var result = await controller.DeleteUser(targetUserId, forceCascade: true);

            // Assert: Dọn sạch toàn bộ hồ sơ, session và xóa cán bộ
            Assert.IsType<OkObjectResult>(result);
            Assert.Null(await context.Users.FindAsync(targetUserId));
            Assert.Empty(await context.ProcessingLogs.Where(l => l.UserId == targetUserId).ToListAsync());
            Assert.Empty(await context.UserSessions.Where(s => s.UserId == targetUserId).ToListAsync());
        }

        [Fact]
        public async Task DeleteUser_CannotDeleteSelfOrDefaultAdmin()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var adminId = Guid.NewGuid();
            var adminUser = new User { Id = adminId, Username = "admin", FullName = "Admin", Department = "UBND", PasswordHash = "h" };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();

            var controller = new UsersController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(adminId) }
                }
            };

            // Act 1: Tự xóa chính mình
            var selfDeleteResult = await controller.DeleteUser(adminId, forceCascade: false);
            var badRequestSelf = Assert.IsType<BadRequestObjectResult>(selfDeleteResult);
            Assert.Contains("tự xóa tài khoản của chính mình", badRequestSelf.Value?.ToString());

            // Act 2: Cố tình xóa tài khoản admin mặc định từ tài khoản admin phụ
            var otherAdminId = Guid.NewGuid();
            var otherController = new UsersController(context)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(otherAdminId) }
                }
            };
            var adminDeleteResult = await otherController.DeleteUser(adminId, forceCascade: true);
            var badRequestAdmin = Assert.IsType<BadRequestObjectResult>(adminDeleteResult);
            Assert.Contains("Quản trị viên hệ thống mặc định", badRequestAdmin.Value?.ToString());
        }

        // =========================================================================
        // 3. HỒ SƠ ĐÃ XỬ LÝ (ProcessingLog)
        // =========================================================================

        [Fact]
        public async Task DeleteProcessedRecord_WithoutForeignKeys_ShouldDeleteWithSingleConfirm()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var userId = Guid.NewGuid();
            var log = new ProcessingLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                IncomingDocCode = "99/UBND-VP",
                OriginalFileName = "VanBan99.pdf",
                SelectedOptionId = "OPT1"
            };
            context.ProcessingLogs.Add(log);
            await context.SaveChangesAsync();

            var controller = new DocumentsController(context, null!, null!, null!, null!, null!, null!)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(userId, role: "USER", username: "chuyenvien") }
                }
            };

            // Act: forceCascade = false (Chỉ xác nhận 1 lần vì không có bảng khác trỏ khóa ngoại vào nó)
            var result = await controller.DeleteProcessedRecord(log.Id, forceCascade: false);

            // Assert: Xóa thành công
            Assert.IsType<OkObjectResult>(result);
            Assert.Null(await context.ProcessingLogs.FindAsync(log.Id));
        }
    }
}
