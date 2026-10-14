using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.WebApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(ApplicationDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Vui lòng nhập tên đăng nhập và mật khẩu công vụ." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.Trim().ToLower());
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa quyền truy cập." });
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Mật khẩu xác thực công vụ không chính xác." });
            }

            // Sinh Access Token và Refresh Token
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            var sessionExpiry = request.RememberMe
                ? DateTimeOffset.UtcNow.AddDays(30)
                : DateTimeOffset.UtcNow.AddHours(8);

            var session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                RefreshToken = refreshToken,
                IsPersistent = request.RememberMe,
                ExpiresAt = sessionExpiry,
                ClientIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _context.UserSessions.AddAsync(session);
            await _context.SaveChangesAsync();

            // Gắn HttpOnly Cookie cho Refresh Token
            Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = sessionExpiry.UtcDateTime
            });

            var response = new LoginResponseDto
            {
                AccessToken = accessToken,
                ExpiresIn = 28800, // 8 hours in seconds
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FullName = user.FullName,
                    Role = user.Role,
                    Department = user.Department,
                    Email = user.Email,
                    Token = accessToken
                }
            };

            return Ok(response);
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "Mật khẩu mới phải có độ dài tối thiểu 6 ký tự." });
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return BadRequest(new { message = "Mật khẩu xác nhận không khớp với mật khẩu mới." });
            }

            // Lấy User nghiêm ngặt từ Claims của Access Token
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính cán bộ thực hiện. Vui lòng đăng nhập lại." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "Tài khoản cán bộ không tồn tại hoặc đã bị khóa quyền truy cập." });
            }

            bool isCurrentMatch = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash);
            if (!isCurrentMatch)
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không chính xác." });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.PasswordChangedAt = DateTimeOffset.UtcNow;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đổi mật khẩu công vụ thành công. Mật khẩu mới đã được cập nhật an toàn." });
        }

        [AllowAnonymous]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refreshToken"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.RefreshToken == refreshToken);
                if (session != null)
                {
                    session.IsRevoked = true;
                    await _context.SaveChangesAsync();
                }
            }

            Response.Cookies.Delete("refreshToken");
            return Ok(new { message = "Đã đăng xuất và thu hồi phiên làm việc thành công." });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new { message = "Phiên làm việc chưa được xác thực." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { message = "Tài khoản cán bộ không tồn tại hoặc đã bị khóa." });
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                Department = user.Department,
                Email = user.Email
            });
        }

        [AllowAnonymous]
        [HttpGet("demo-users")]
        public async Task<IActionResult> GetDemoUsers()
        {
            var users = await _context.Users
                .AsNoTracking()
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    FullName = u.FullName,
                    Role = u.Role,
                    Department = u.Department,
                    Email = u.Email
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
