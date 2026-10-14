using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Identity;
using GovDoc.Infrastructure.Services;
using GovDoc.WebApi.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GovDoc.Tests
{
    public class SecurityAuditTests
    {
        [Fact]
        public void AllControllers_MustHaveAuthorizationOrAllowAnonymous_OnEveryAction()
        {
            var webApiAssembly = typeof(AuthController).Assembly;
            var controllerTypes = webApiAssembly.GetTypes()
                .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
                .ToList();

            Assert.NotEmpty(controllerTypes);

            foreach (var controller in controllerTypes)
            {
                bool classHasAuthorize = controller.GetCustomAttribute<AuthorizeAttribute>() != null;

                var publicActions = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
                    .Where(m => !m.IsSpecialName && m.GetCustomAttributes().Any(a => a is HttpMethodAttribute))
                    .ToList();

                foreach (var action in publicActions)
                {
                    bool actionHasAuthorize = action.GetCustomAttribute<AuthorizeAttribute>() != null;
                    bool actionHasAllowAnonymous = action.GetCustomAttribute<AllowAnonymousAttribute>() != null;

                    bool isProtected = classHasAuthorize || actionHasAuthorize || actionHasAllowAnonymous;

                    Assert.True(isProtected,
                        $"LỖ HỔNG BẢO MẬT: Action '{action.Name}' trong '{controller.Name}' không có Authorize hoặc AllowAnonymous!");
                }
            }
        }

        [Fact]
        public void AdminSensitiveActions_MustRequireAdminRole()
        {
            var sensitiveActions = new[]
            {
                nameof(LegalKBController.QuickImportLegalDoc),
                nameof(LegalKBController.AddManualDoc),
                nameof(LegalKBController.UpdateDoc),
                nameof(LegalKBController.UpdateDocumentStatus),
                nameof(LegalKBController.DeleteDoc),
                nameof(LegalKBController.ReviewProposal)
            };

            foreach (var actionName in sensitiveActions)
            {
                var method = typeof(LegalKBController).GetMethod(actionName);
                Assert.NotNull(method);

                var authAttr = method.GetCustomAttribute<AuthorizeAttribute>();
                Assert.NotNull(authAttr);
                Assert.Equal(UserRole.Admin, authAttr.Roles);
            }
        }

        [Fact]
        public void LocalFileStorageService_MustPreventPathTraversal()
        {
            var storageService = new LocalFileStorageService();

            // Attempt to traverse outside base storage directory
            var maliciousPaths = new[]
            {
                "../../appsettings.json",
                "..\\..\\appsettings.json",
                "folder/../../../Windows/System32/cmd.exe",
                "/etc/passwd"
            };

            foreach (var path in maliciousPaths)
            {
                Assert.Throws<UnauthorizedAccessException>(() =>
                {
                    storageService.GetPhysicalPath(path);
                });
            }
        }

        [Fact]
        public void TokenService_ShouldGenerateValidAccessToken_WithExpectedClaims()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new[]
                {
                    new System.Collections.Generic.KeyValuePair<string, string?>("Jwt:Secret", "TestSecretKeyLongEnoughForHmacSha256_32Characters!"),
                    new System.Collections.Generic.KeyValuePair<string, string?>("Jwt:Issuer", "GovDocTest"),
                    new System.Collections.Generic.KeyValuePair<string, string?>("Jwt:Audience", "GovDocClientTest")
                })
                .Build();

            var tokenService = new TokenService(config);

            var testUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "chuyenvien01",
                FullName = "Trần Thị Lan",
                Role = UserRole.Specialist,
                Department = "Phòng Pháp chế",
                Email = "lan.tt@binhduong.gov.vn"
            };

            string token = tokenService.GenerateAccessToken(testUser);
            Assert.False(string.IsNullOrWhiteSpace(token));

            var principal = tokenService.GetPrincipalFromExpiredToken(token);
            Assert.NotNull(principal);

            var idClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value;
            var nameClaim = principal.FindFirst(ClaimTypes.Name)?.Value;

            Assert.Equal(testUser.Id.ToString(), idClaim);
            Assert.Equal(UserRole.Specialist, roleClaim);
            Assert.Equal("chuyenvien01", nameClaim);
        }
    }
}
