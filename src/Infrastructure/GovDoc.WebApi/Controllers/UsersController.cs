using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.WebApi.Controllers
{
    [Authorize(Roles = "ADMIN")]
    [ApiController]
    [Route("api/v1/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? search = null)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u =>
                    u.Username.ToLower().Contains(term) ||
                    u.FullName.ToLower().Contains(term) ||
                    u.Department.ToLower().Contains(term) ||
                    (u.Email != null && u.Email.ToLower().Contains(term)));
            }

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserListItemDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    FullName = u.FullName,
                    Role = u.Role,
                    Department = u.Department,
                    Email = u.Email,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    PasswordChangedAt = u.PasswordChangedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Tên đăng nhập và mật khẩu không được để trống." });
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new { message = "Họ và tên cán bộ không được để trống." });
            }

            var normalizedUsername = request.Username.Trim().ToLower();
            bool exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == normalizedUsername);
            if (exists)
            {
                return BadRequest(new { message = $"Tên đăng nhập '{request.Username}' đã tồn tại trên hệ thống công vụ." });
            }

            var role = string.Equals(request.Role, "ADMIN", StringComparison.OrdinalIgnoreCase) ? "ADMIN" : "USER";

            var newUser = new User
            {
                Id = Guid.NewGuid(),
                Username = request.Username.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FullName = request.FullName.Trim(),
                Role = role,
                Department = string.IsNullOrWhiteSpace(request.Department) ? "Văn phòng Cơ quan" : request.Department.Trim(),
                Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Đã cấp mới tài khoản cán bộ thành công: {newUser.FullName} ({newUser.Role})",
                user = new UserListItemDto
                {
                    Id = newUser.Id,
                    Username = newUser.Username,
                    FullName = newUser.FullName,
                    Role = newUser.Role,
                    Department = newUser.Department,
                    Email = newUser.Email,
                    IsActive = newUser.IsActive,
                    CreatedAt = newUser.CreatedAt,
                    PasswordChangedAt = newUser.PasswordChangedAt
                }
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserRequestDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin cán bộ." });
            }

            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            bool isSelf = Guid.TryParse(currentUserIdClaim, out var curId) && curId == user.Id;

            // Nếu tự sửa chính mình, không được phép hạ quyền hoặc khóa tài khoản của mình
            if (isSelf && !request.IsActive)
            {
                return BadRequest(new { message = "Không thể tự khóa tài khoản quản trị của chính mình." });
            }

            if (isSelf && user.Role == "ADMIN" && request.Role != "ADMIN")
            {
                return BadRequest(new { message = "Không thể tự hạ quyền quản trị của chính mình." });
            }

            user.FullName = request.FullName.Trim();
            user.Role = string.Equals(request.Role, "ADMIN", StringComparison.OrdinalIgnoreCase) ? "ADMIN" : "USER";
            user.Department = string.IsNullOrWhiteSpace(request.Department) ? user.Department : request.Department.Trim();
            user.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã cập nhật thông tin cán bộ thành công.", user });
        }

        [HttpPut("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] AdminResetPasswordDto request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "Mật khẩu mới phải có tối thiểu 6 ký tự." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy cán bộ cần đặt lại mật khẩu." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordChangedAt = DateTimeOffset.UtcNow;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            // Xóa tất cả phiên đăng nhập cũ để buộc đăng nhập lại bằng mật khẩu mới
            var sessions = await _context.UserSessions.Where(s => s.UserId == user.Id).ToListAsync();
            _context.UserSessions.RemoveRange(sessions);

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã đặt lại mật khẩu thành công cho tài khoản {user.Username} ({user.FullName})." });
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(Guid id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin cán bộ." });
            }

            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(currentUserIdClaim, out var curId) && curId == user.Id)
            {
                return BadRequest(new { message = "Không thể tự khóa tài khoản của chính mình." });
            }

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            if (!user.IsActive)
            {
                // Xóa phiên làm việc hiện tại nếu bị khóa
                var sessions = await _context.UserSessions.Where(s => s.UserId == user.Id).ToListAsync();
                _context.UserSessions.RemoveRange(sessions);
            }

            await _context.SaveChangesAsync();

            string statusMsg = user.IsActive ? "kích hoạt hoạt động" : "tạm khóa quyền truy cập";
            return Ok(new
            {
                message = $"Đã {statusMsg} tài khoản {user.Username} ({user.FullName}).",
                isActive = user.IsActive
            });
        }

        /// <summary>
        /// Xóa tài khoản cán bộ với kiểm tra ràng buộc khóa ngoại (Smart Cascade Deletion)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id, [FromQuery] bool forceCascade = false)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy thông tin cán bộ." });
            }

            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(currentUserIdClaim, out var curId) && curId == user.Id)
            {
                return BadRequest(new { message = "Không thể tự xóa tài khoản của chính mình." });
            }

            if (string.Equals(user.Username, "admin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Không thể xóa tài khoản Quản trị viên hệ thống mặc định (@admin)." });
            }

            // Kiểm tra các bảng khóa ngoại phụ thuộc
            int logCount = await _context.ProcessingLogs.CountAsync(l => l.UserId == id);
            int proposalCount = await _context.LegalProposals.CountAsync(p => p.SubmittedBy == id);
            int sessionCount = await _context.UserSessions.CountAsync(s => s.UserId == id);
            int createdDocsCount = await _context.LegalDocuments.CountAsync(d => d.CreatedBy == id);

            bool hasForeignKeys = (logCount > 0 || proposalCount > 0 || sessionCount > 0 || createdDocsCount > 0);

            if (hasForeignKeys && !forceCascade)
            {
                var deps = new List<ForeignKeyDependencyDto>();
                if (logCount > 0)
                {
                    deps.Add(new ForeignKeyDependencyDto
                    {
                        TableName = "ProcessingLogs",
                        Label = "Hồ sơ công văn đã tiếp nhận & xử lý",
                        Count = logCount
                    });
                }
                if (proposalCount > 0)
                {
                    deps.Add(new ForeignKeyDependencyDto
                    {
                        TableName = "LegalProposals",
                        Label = "Đề xuất văn bản pháp lý đã gửi",
                        Count = proposalCount
                    });
                }
                if (sessionCount > 0)
                {
                    deps.Add(new ForeignKeyDependencyDto
                    {
                        TableName = "UserSessions",
                        Label = "Phiên làm việc đăng nhập",
                        Count = sessionCount
                    });
                }
                if (createdDocsCount > 0)
                {
                    deps.Add(new ForeignKeyDependencyDto
                    {
                        TableName = "LegalDocuments",
                        Label = "Văn bản pháp luật đã khởi tạo",
                        Count = createdDocsCount
                    });
                }

                return StatusCode(StatusCodes.Status409Conflict, new DeleteImpactResultDto
                {
                    HasForeignKeys = true,
                    RequiresCascadeConfirmation = true,
                    Message = $"Tài khoản cán bộ \"{user.FullName}\" (@{user.Username}) đang có dữ liệu phát sinh ở {deps.Count} bảng khác.",
                    Dependencies = deps
                });
            }

            // Dọn sạch dữ liệu khóa ngoại (Cascade Cleanup)
            var sessions = await _context.UserSessions.Where(s => s.UserId == id).ToListAsync();
            if (sessions.Count > 0)
            {
                _context.UserSessions.RemoveRange(sessions);
            }

            var createdDocs = await _context.LegalDocuments.Where(d => d.CreatedBy == id).ToListAsync();
            foreach (var doc in createdDocs)
            {
                doc.CreatedBy = null;
            }

            var reviewedProposals = await _context.LegalProposals.Where(p => p.ReviewedBy == id).ToListAsync();
            foreach (var p in reviewedProposals)
            {
                p.ReviewedBy = null;
            }

            var submittedProposals = await _context.LegalProposals.Where(p => p.SubmittedBy == id).ToListAsync();
            if (submittedProposals.Count > 0)
            {
                _context.LegalProposals.RemoveRange(submittedProposals);
            }

            var userLogs = await _context.ProcessingLogs.Where(l => l.UserId == id).ToListAsync();
            if (userLogs.Count > 0)
            {
                _context.ProcessingLogs.RemoveRange(userLogs);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            string successMsg = forceCascade
                ? $"Đã dọn sạch toàn bộ dữ liệu phát sinh liên quan và xóa tài khoản {user.FullName} (@{user.Username})."
                : $"Đã xóa tài khoản cán bộ {user.FullName} (@{user.Username}) thành công.";

            return Ok(new { message = successMsg });
        }
    }
}
