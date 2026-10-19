using System;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Infrastructure.Persistence;
using GovDoc.Infrastructure.Services;
using GovDoc.Infrastructure.WordEngine;
using GovDoc.WebApi.Middlewares;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Hệ thống Trợ lý số Văn bản Hành chính Công - API",
        Version = "v1",
        Description = "Cung cấp API phân tích thể thức công văn, tra cứu thứ bậc pháp lý và soạn thảo văn bản chuẩn Nghị định 30/2020/NĐ-CP"
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "Nhập Token xác thực công vụ theo định dạng: Bearer {token}",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "GovDocAssistant_Administrative_Secret_Key_Super_Secure_2026_VnGov";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GovDocAssistant";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "GovDocAssistantClient";
var key = System.Text.Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(GovDoc.Domain.Enums.UserRole.Admin));
});

// Configure Database Connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=.\\SQLEXPRESS;Database=GovDocAssistantDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
    });
});

builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

// Register Application Services
builder.Services.AddSingleton<IDocxBuilderService, Decree30DocxBuilder>();
builder.Services.AddSingleton<IOcrService, OcrService>();
builder.Services.AddSingleton<IAdministrativeAppraisalEngine, AdministrativeAppraisalEngine>();
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddScoped<ILegalSearchEngine, LegalSearchEngine>();
builder.Services.AddScoped<ITokenService, GovDoc.Infrastructure.Identity.TokenService>();

// Configure CORS for Vite React client
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure Middleware Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger luôn bật để dễ kiểm tra (có thể giới hạn lại sau)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "GovDocAssistant API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTimeOffset.UtcNow, system = "Trợ lý số Văn bản Hành chính Công" }));

// ─── Phục vụ React SPA (Frontend) ──────────────────────────────────────────
// Serve file tĩnh từ thư mục wwwroot (index.html, assets, images…)
app.UseDefaultFiles();   // Trỏ / → /index.html
app.UseStaticFiles();    // Serve CSS, JS, fonts, ảnh…

// SPA Fallback: mọi route không phải API → trả về index.html để React Router xử lý
app.MapFallbackToFile("index.html");

// Initialize & Seed Database automatically
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        logger.LogInformation("Khởi tạo và kiểm tra kết nối Cơ sở dữ liệu SQL Server...");
        await DatabaseSeeder.SeedAsync(context);
        logger.LogInformation("Khởi tạo và nạp dữ liệu pháp lý mẫu thành công!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Lỗi khi kết nối hoặc khởi tạo dữ liệu SQL Server: {Message}", ex.Message);
    }
}

app.Run();
