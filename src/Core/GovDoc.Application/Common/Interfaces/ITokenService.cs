using System;
using System.Security.Claims;
using GovDoc.Domain.Entities;

namespace GovDoc.Application.Common.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
