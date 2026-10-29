using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.WebApi.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/user-settings")]
    public class UserSettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAesEncryptionService _encryptionService;
        private readonly System.Net.Http.IHttpClientFactory _httpClientFactory;

        public UserSettingsController(
            ApplicationDbContext context,
            IAesEncryptionService encryptionService,
            System.Net.Http.IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _encryptionService = encryptionService;
            _httpClientFactory = httpClientFactory;
        }

        public static readonly string[] GeminiPreferredFallbacks = new[]
        {
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-8b",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "gemini-pro"
        };

        public static string ResolveOptimalModel(string? provider, string? requestedModel)
        {
            if (!string.IsNullOrWhiteSpace(requestedModel) && !string.Equals(requestedModel, "auto", StringComparison.OrdinalIgnoreCase))
            {
                return requestedModel.Trim();
            }

            return (provider ?? "GEMINI").ToUpperInvariant() switch
            {
                "GEMINI" => "gemini-1.5-flash", // Mặc định Flash để tương thích 100% Free tier và Google AI Pro trên Google AI Studio
                "OPENAI" => "gpt-4o-mini",
                "ANTHROPIC" => "claude-3-5-sonnet-20241022",
                "OPENROUTER" => "deepseek/deepseek-chat",
                _ => "gemini-1.5-flash"
            };
        }

        /// <summary>
        /// Gọi Google AI Studio ListModels API để tự động dò tìm danh sách mô hình mà API Key thực tế được cấp quyền
        /// </summary>
        public static async Task<System.Collections.Generic.List<string>> FetchGeminiAvailableModelsAsync(System.Net.Http.HttpClient client, string apiKey)
        {
            var available = new System.Collections.Generic.List<string>();
            try
            {
                string listUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";
                var resp = await client.GetAsync(listUrl);
                if (resp.IsSuccessStatusCode)
                {
                    var json = await resp.Content.ReadAsStringAsync();
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("models", out var modelsElem) && modelsElem.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var m in modelsElem.EnumerateArray())
                        {
                            bool supportsGenerate = false;
                            if (m.TryGetProperty("supportedGenerationMethods", out var methods) && methods.ValueKind == System.Text.Json.JsonValueKind.Array)
                            {
                                foreach (var method in methods.EnumerateArray())
                                {
                                    if (method.GetString() == "generateContent")
                                    {
                                        supportsGenerate = true;
                                        break;
                                    }
                                }
                            }

                            if (supportsGenerate && m.TryGetProperty("name", out var nameProp))
                            {
                                string name = nameProp.GetString() ?? "";
                                if (name.StartsWith("models/"))
                                {
                                    name = name.Substring("models/".Length);
                                }
                                if (!string.IsNullOrWhiteSpace(name))
                                {
                                    available.Add(name);
                                }
                            }
                        }
                    }
                }
            }
            catch
            {
                // Bỏ qua lỗi kết nối và fallback danh sách mặc định
            }
            return available;
        }

        private async Task<GovDoc.Domain.Entities.User?> GetCurrentUserAsync()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("id")?.Value;

            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null)
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(username))
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.Trim().ToLower());
                }
            }
            return user;
        }

        /// <summary>
        /// Tự động dò tìm danh sách mô hình Gemini khả dụng theo API Key
        /// </summary>
        [HttpGet("detect-gemini-models")]
        public async Task<IActionResult> DetectGeminiModels([FromQuery] string? apiKey)
        {
            try
            {
                string keyToUse = apiKey?.Trim() ?? string.Empty;
                if (string.IsNullOrEmpty(keyToUse))
                {
                    var user = await GetCurrentUserAsync();
                    if (user != null && !string.IsNullOrEmpty(user.EncryptedApiKey))
                    {
                        try { keyToUse = _encryptionService.Decrypt(user.EncryptedApiKey); } catch { }
                    }
                }

                if (string.IsNullOrEmpty(keyToUse))
                {
                    return BadRequest(new { message = "Vui lòng cung cấp mã API Key để tự động nhận diện mô hình." });
                }

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);
                var availableModels = await FetchGeminiAvailableModelsAsync(client, keyToUse);

                string bestModel = "gemini-1.5-flash";
                foreach (var candidate in GeminiPreferredFallbacks)
                {
                    if (availableModels.Contains(candidate, StringComparer.OrdinalIgnoreCase))
                    {
                        bestModel = candidate;
                        break;
                    }
                }

                return Ok(new
                {
                    success = true,
                    availableModels = availableModels,
                    recommendedModel = bestModel,
                    count = availableModels.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi dò tìm mô hình: {ex.Message}" });
            }
        }

        private static ApiKeyVaultItemDto ToSafeDto(ApiKeyVaultItemDto item) => new ApiKeyVaultItemDto
        {
            Id = item.Id,
            Label = item.Label,
            Provider = item.Provider,
            Model = item.Model,
            MaskedKey = item.MaskedKey,
            EncryptedKey = null, // Giấu chuỗi mã hóa với client
            IsActive = item.IsActive,
            Status = item.Status,
            LatencyMs = item.LatencyMs,
            LastTestedAt = item.LastTestedAt,
            LastErrorReason = item.LastErrorReason
        };

        private List<ApiKeyVaultItemDto> GetOrCreateVault(GovDoc.Domain.Entities.User user)
        {
            var vault = new List<ApiKeyVaultItemDto>();
            if (!string.IsNullOrWhiteSpace(user.ApiKeysVaultJson))
            {
                try
                {
                    var items = System.Text.Json.JsonSerializer.Deserialize<List<ApiKeyVaultItemDto>>(user.ApiKeysVaultJson);
                    if (items != null)
                    {
                        vault = items;
                    }
                }
                catch { }
            }

            // Tự động di chuyển (Migrate) khóa đơn lẻ trước đây vào Két bảo mật đa khóa
            if (vault.Count == 0 && !string.IsNullOrEmpty(user.EncryptedApiKey))
            {
                string maskedKey = "••••••••••••••••";
                try
                {
                    string dec = _encryptionService.Decrypt(user.EncryptedApiKey);
                    maskedKey = _encryptionService.MaskApiKey(dec);
                }
                catch { }

                var legacyKey = new ApiKeyVaultItemDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Label = $"Khóa mặc định ({user.AiProvider ?? "GEMINI"})",
                    Provider = user.AiProvider ?? "GEMINI",
                    Model = ResolveOptimalModel(user.AiProvider, user.AiModel),
                    MaskedKey = maskedKey,
                    EncryptedKey = user.EncryptedApiKey,
                    IsActive = true,
                    Status = "UNCHECKED",
                    LastTestedAt = null
                };
                vault.Add(legacyKey);
                user.ApiKeysVaultJson = System.Text.Json.JsonSerializer.Serialize(vault);
            }

            // Đảm bảo có đúng 1 key Active nếu danh sách không rỗng
            if (vault.Count > 0 && !vault.Any(k => k.IsActive))
            {
                var preferred = vault.FirstOrDefault(k => k.Status == "HEALTHY") ?? vault.First();
                preferred.IsActive = true;
            }

            return vault;
        }

        private void SaveVaultAndSyncUser(GovDoc.Domain.Entities.User user, List<ApiKeyVaultItemDto> vault)
        {
            user.ApiKeysVaultJson = System.Text.Json.JsonSerializer.Serialize(vault);

            var active = vault.FirstOrDefault(k => k.IsActive);
            if (active != null)
            {
                user.EncryptedApiKey = active.EncryptedKey;
                user.AiProvider = active.Provider;
                user.AiModel = active.Model;
            }
            else if (vault.Count > 0)
            {
                var fallback = vault.FirstOrDefault(k => k.Status == "HEALTHY") ?? vault.First();
                fallback.IsActive = true;
                user.EncryptedApiKey = fallback.EncryptedKey;
                user.AiProvider = fallback.Provider;
                user.AiModel = fallback.Model;
            }
            else
            {
                user.EncryptedApiKey = null;
            }

            user.UpdatedAt = DateTimeOffset.UtcNow;
        }

        /// <summary>
        /// Lấy cấu hình AI và model của cá nhân (BYOK)
        /// </summary>
        [HttpGet("ai-config")]
        public async Task<IActionResult> GetAiConfig()
        {
            try
            {
                var user = await GetCurrentUserAsync();
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ công vụ." });
                }

                var vault = GetOrCreateVault(user);
                await _context.SaveChangesAsync();

                string maskedKey = string.Empty;
                if (!string.IsNullOrEmpty(user.EncryptedApiKey))
                {
                    try
                    {
                        string decrypted = _encryptionService.Decrypt(user.EncryptedApiKey);
                        maskedKey = _encryptionService.MaskApiKey(decrypted);
                    }
                    catch
                    {
                        maskedKey = "••••••••••••••••";
                    }
                }

                string provider = user.AiProvider ?? "GEMINI";
                string model = ResolveOptimalModel(provider, user.AiModel);

                var dto = new UserAiConfigDto
                {
                    Provider = provider,
                    Model = model,
                    EffectiveModel = model,
                    HasApiKey = !string.IsNullOrEmpty(user.EncryptedApiKey),
                    MaskedApiKey = maskedKey,
                    Department = user.Department,
                    CustomPrompt = user.CustomPrompt,
                    EnabledSkillsJson = user.EnabledSkillsJson,
                    NotificationPreferencesJson = user.NotificationPreferencesJson,
                    ApiKeysVault = vault.Select(ToSafeDto).ToList()
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi tải cấu hình trợ lý số: {ex.Message}" });
            }
        }

        /// <summary>
        /// Cập nhật và mã hóa API Key cá nhân chuẩn AES-256 (BYOK)
        /// </summary>
        [HttpPut("ai-config")]
        public async Task<IActionResult> UpdateAiConfig([FromBody] UpdateUserAiConfigRequestDto request)
        {
            try
            {
                var user = await GetCurrentUserAsync();
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ công vụ." });
                }

                var vault = GetOrCreateVault(user);

                if (!string.IsNullOrWhiteSpace(request.Provider))
                {
                    user.AiProvider = request.Provider.Trim().ToUpperInvariant();
                }
                else if (string.IsNullOrWhiteSpace(user.AiProvider))
                {
                    user.AiProvider = "GEMINI";
                }

                if (!string.IsNullOrWhiteSpace(request.Model) || !string.IsNullOrWhiteSpace(request.Provider))
                {
                    user.AiModel = ResolveOptimalModel(user.AiProvider, request.Model);
                }
                else if (string.IsNullOrWhiteSpace(user.AiModel))
                {
                    user.AiModel = ResolveOptimalModel(user.AiProvider, null);
                }

                string effectiveModel = user.AiModel;

                if (!string.IsNullOrWhiteSpace(request.ApiKey))
                {
                    if (!request.ApiKey.Contains("****") && !request.ApiKey.Contains("••••"))
                    {
                        string rawKey = request.ApiKey.Trim();
                        string enc = _encryptionService.Encrypt(rawKey);
                        string masked = _encryptionService.MaskApiKey(rawKey);
                        user.EncryptedApiKey = enc;

                        // Đồng bộ khóa mới này vào Vault làm Active Key
                        foreach (var k in vault) k.IsActive = false;
                        var existing = vault.FirstOrDefault(k => k.Provider == user.AiProvider && k.MaskedKey == masked);
                        if (existing != null)
                        {
                            existing.EncryptedKey = enc;
                            existing.Model = user.AiModel;
                            existing.IsActive = true;
                        }
                        else
                        {
                            vault.Add(new ApiKeyVaultItemDto
                            {
                                Id = Guid.NewGuid().ToString("N"),
                                Label = $"{user.AiProvider} Key ({DateTime.Now:dd/MM HH:mm})",
                                Provider = user.AiProvider,
                                Model = user.AiModel,
                                MaskedKey = masked,
                                EncryptedKey = enc,
                                IsActive = true,
                                Status = "UNCHECKED"
                            });
                        }
                    }
                }
                else if (request.ApiKey == string.Empty)
                {
                    user.EncryptedApiKey = null;
                }

                if (request.CustomPrompt != null)
                {
                    user.CustomPrompt = request.CustomPrompt;
                }

                if (request.EnabledSkillsJson != null)
                {
                    user.EnabledSkillsJson = request.EnabledSkillsJson;
                }

                if (request.NotificationPreferencesJson != null)
                {
                    user.NotificationPreferencesJson = request.NotificationPreferencesJson;
                }

                SaveVaultAndSyncUser(user, vault);
                await _context.SaveChangesAsync();

                string maskedKey = string.Empty;
                if (!string.IsNullOrEmpty(user.EncryptedApiKey))
                {
                    try
                    {
                        string decrypted = _encryptionService.Decrypt(user.EncryptedApiKey);
                        maskedKey = _encryptionService.MaskApiKey(decrypted);
                    }
                    catch
                    {
                        maskedKey = "••••••••••••••••";
                    }
                }

                var dto = new UserAiConfigDto
                {
                    Provider = user.AiProvider,
                    Model = user.AiModel,
                    EffectiveModel = effectiveModel,
                    HasApiKey = !string.IsNullOrEmpty(user.EncryptedApiKey),
                    MaskedApiKey = maskedKey,
                    Department = user.Department,
                    CustomPrompt = user.CustomPrompt,
                    EnabledSkillsJson = user.EnabledSkillsJson,
                    NotificationPreferencesJson = user.NotificationPreferencesJson,
                    ApiKeysVault = vault.Select(ToSafeDto).ToList()
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi lưu cấu hình khóa API: {ex.Message}" });
            }
        }

        /// <summary>
        /// Xử lý logic gọi thử nghiệm API Key trực tiếp tới nhà cung cấp AI
        /// </summary>
        public async Task<TestApiKeyResponseDto> PerformApiKeyTestInternalAsync(string provider, string? requestedModel, string apiKey, string? prompt, GovDoc.Domain.Entities.User? user = null)
        {
            provider = (provider ?? "GEMINI").Trim().ToUpperInvariant();
            string model = ResolveOptimalModel(provider, requestedModel);

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new TestApiKeyResponseDto
                {
                    Success = false,
                    Provider = provider,
                    Model = model,
                    Status = "MISSING_KEY",
                    ErrorMessage = "Chưa cung cấp khóa API Key. Vui lòng nhập khóa API để thử nghiệm.",
                    Recommendation = $"Vui lòng lấy khóa API tại cổng cung cấp của {provider}."
                };
            }

            string testPrompt = string.IsNullOrWhiteSpace(prompt)
                ? "Chào Trợ lý số, hãy kiểm tra kết nối API và phản hồi ngắn gọn xác nhận bạn đang hoạt động bình thường theo chuẩn thể thức văn bản hành chính Việt Nam (Nghị định 30/2020/NĐ-CP)."
                : prompt.Trim();

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(45);

            try
            {
                HttpResponseMessage response;
                string responseBody;
                bool autoDetectedFallback = false;
                string originalRequestedModel = model;

                if (provider == "GEMINI")
                {
                    string initialModel = (!string.IsNullOrWhiteSpace(model) && !model.Equals("auto", StringComparison.OrdinalIgnoreCase))
                        ? model.Trim()
                        : "gemini-1.5-flash";

                    var candidateModels = new System.Collections.Generic.List<string> { initialModel };
                    foreach (var fb in GeminiPreferredFallbacks)
                    {
                        if (!candidateModels.Contains(fb, StringComparer.OrdinalIgnoreCase))
                        {
                            candidateModels.Add(fb);
                        }
                    }

                    response = new HttpResponseMessage(System.Net.HttpStatusCode.NotFound);
                    responseBody = string.Empty;

                    foreach (var tryModel in candidateModels)
                    {
                        string url = $"https://generativelanguage.googleapis.com/v1beta/models/{tryModel}:generateContent?key={apiKey}";

                        var payload = new
                        {
                            contents = new[]
                            {
                                new { role = "user", parts = new[] { new { text = testPrompt } } }
                            },
                            generationConfig = new
                            {
                                maxOutputTokens = 200,
                                temperature = 0.3
                            }
                        };

                        var content = new System.Net.Http.StringContent(
                            System.Text.Json.JsonSerializer.Serialize(payload),
                            System.Text.Encoding.UTF8,
                            "application/json"
                        );

                        response = await client.PostAsync(url, content);
                        responseBody = await response.Content.ReadAsStringAsync();

                        if (response.IsSuccessStatusCode)
                        {
                            if (!string.Equals(tryModel, initialModel, StringComparison.OrdinalIgnoreCase))
                            {
                                autoDetectedFallback = true;
                            }
                            model = tryModel;
                            break;
                        }

                        if (response.StatusCode != System.Net.HttpStatusCode.NotFound)
                        {
                            model = tryModel;
                            break;
                        }
                    }

                    // Tự động lưu mô hình hoạt động tối ưu vào cơ sở dữ liệu nếu có fallback
                    if (response.IsSuccessStatusCode && (autoDetectedFallback || string.Equals(originalRequestedModel, "auto", StringComparison.OrdinalIgnoreCase)))
                    {
                        try
                        {
                            var currentUser = user ?? await GetCurrentUserAsync();
                            if (currentUser != null)
                            {
                                currentUser.AiModel = model;
                                await _context.SaveChangesAsync();
                            }
                        }
                        catch { }
                    }
                }
                else if (provider == "OPENAI")
                {
                    string openaiModel = !string.IsNullOrEmpty(model) && model.StartsWith("gpt") ? model : "gpt-4o-mini";
                    string url = "https://api.openai.com/v1/chat/completions";

                    var payload = new
                    {
                        model = openaiModel,
                        messages = new[]
                        {
                            new { role = "user", content = testPrompt }
                        },
                        max_tokens = 200,
                        temperature = 0.3
                    };

                    var requestMsg = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, url);
                    requestMsg.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                    requestMsg.Content = new System.Net.Http.StringContent(
                        System.Text.Json.JsonSerializer.Serialize(payload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );

                    response = await client.SendAsync(requestMsg);
                    responseBody = await response.Content.ReadAsStringAsync();
                }
                else if (provider == "ANTHROPIC")
                {
                    string claudeModel = !string.IsNullOrEmpty(model) && model.Contains("claude") ? model : "claude-3-5-sonnet-20241022";
                    string url = "https://api.anthropic.com/v1/messages";

                    var payload = new
                    {
                        model = claudeModel,
                        max_tokens = 200,
                        messages = new[]
                        {
                            new { role = "user", content = testPrompt }
                        }
                    };

                    var requestMsg = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, url);
                    requestMsg.Headers.Add("x-api-key", apiKey);
                    requestMsg.Headers.Add("anthropic-version", "2023-06-01");
                    requestMsg.Content = new System.Net.Http.StringContent(
                        System.Text.Json.JsonSerializer.Serialize(payload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );

                    response = await client.SendAsync(requestMsg);
                    responseBody = await response.Content.ReadAsStringAsync();
                }
                else // OPENROUTER
                {
                    string orModel = !string.IsNullOrEmpty(model) ? model : "deepseek/deepseek-chat";
                    string url = "https://openrouter.ai/api/v1/chat/completions";

                    var payload = new
                    {
                        model = orModel,
                        messages = new[]
                        {
                            new { role = "user", content = testPrompt }
                        },
                        max_tokens = 200
                    };

                    var requestMsg = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, url);
                    requestMsg.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                    requestMsg.Headers.TryAddWithoutValidation("HTTP-Referer", "http://localhost:5050");
                    requestMsg.Headers.TryAddWithoutValidation("X-Title", "TroLySoVanBanHanhChinh");
                    requestMsg.Content = new System.Net.Http.StringContent(
                        System.Text.Json.JsonSerializer.Serialize(payload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );

                    response = await client.SendAsync(requestMsg);
                    responseBody = await response.Content.ReadAsStringAsync();
                }

                stopwatch.Stop();

                if (response.IsSuccessStatusCode)
                {
                    string replyText = "";
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(responseBody);
                        if (provider == "GEMINI")
                        {
                            var candidates = doc.RootElement.GetProperty("candidates");
                            if (candidates.GetArrayLength() > 0)
                            {
                                var parts = candidates[0].GetProperty("content").GetProperty("parts");
                                if (parts.GetArrayLength() > 0)
                                {
                                    replyText = parts[0].GetProperty("text").GetString() ?? "";
                                }
                            }
                        }
                        else if (provider == "ANTHROPIC")
                        {
                            var contentArr = doc.RootElement.GetProperty("content");
                            if (contentArr.GetArrayLength() > 0)
                            {
                                replyText = contentArr[0].GetProperty("text").GetString() ?? "";
                            }
                        }
                        else
                        {
                            var choices = doc.RootElement.GetProperty("choices");
                            if (choices.GetArrayLength() > 0)
                            {
                                replyText = choices[0].GetProperty("message").GetProperty("content").GetString() ?? "";
                            }
                        }
                    }
                    catch
                    {
                        replyText = "Kết nối thành công! Khóa API và mô hình AI đã phản hồi dữ liệu hợp lệ.";
                    }

                    if (string.IsNullOrWhiteSpace(replyText))
                    {
                        replyText = "Kết nối thành công! Khóa API và mô hình AI đã phản hồi dữ liệu hợp lệ.";
                    }

                    string successRecommendation;
                    if (provider == "GEMINI" && autoDetectedFallback)
                    {
                        successRecommendation = $"Đã tự động nhận diện tài khoản Google AI và kết nối thành công với mô hình '{model}'. (Hệ thống đã tự động gán model tối ưu cho gói Free Tier/Google AI Pro).";
                    }
                    else if (provider == "GEMINI")
                    {
                        successRecommendation = $"Đã kết nối thành công tới Google Gemini với mô hình '{model}' tối ưu cho thể thức Nghị định 30/2020.";
                    }
                    else
                    {
                        successRecommendation = $"Kết nối API thành công tới {provider} với mô hình '{model}'.";
                    }

                    return new TestApiKeyResponseDto
                    {
                        Success = true,
                        Reply = replyText.Trim(),
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Provider = provider,
                        Model = model,
                        Status = "HEALTHY",
                        Recommendation = successRecommendation
                    };
                }
                else
                {
                    int statusCode = (int)response.StatusCode;
                    string errorMsg;
                    string recommendation;

                    if (statusCode == 401 || statusCode == 403)
                    {
                        errorMsg = $"Khóa API không hợp lệ hoặc không có quyền truy cập mô hình này (Mã lỗi {statusCode}).";
                        recommendation = $"Vui lòng kiểm tra lại tính chính xác của chuỗi API Key tại trang quản trị nhà cung cấp {provider}.";
                    }
                    else if (statusCode == 429)
                    {
                        errorMsg = $"Khóa API đã hết hạn mức (Quota Exceeded) hoặc vượt quá tần suất gọi cho phép (Mã lỗi 429).";
                        recommendation = $"Khóa API của bạn đã dùng hết số lượt miễn phí hoặc hết số dư. Vui lòng nạp thêm tiền, nâng cấp gói cước hoặc đổi sang khóa API mới.";
                    }
                    else if (statusCode == 404)
                    {
                        errorMsg = $"Mô hình AI ({model}) không tồn tại hoặc tài khoản không được cấp quyền sử dụng mô hình này (Mã lỗi 404).";
                        recommendation = provider == "GEMINI"
                            ? "Khóa API Free Tier trên Google AI Studio chỉ hỗ trợ các mô hình Flash (gemini-1.5-flash, gemini-2.0-flash). Hãy chọn chế độ 'Tự động nhận diện' hoặc chọn mô hình gemini-1.5-flash để sử dụng."
                            : "Hãy chọn lại mô hình mặc định được đề xuất hoặc kiểm tra gói đăng ký hỗ trợ model.";
                    }
                    else
                    {
                        errorMsg = $"Máy chủ AI phản hồi lỗi: {statusCode} ({response.ReasonPhrase}).";
                        recommendation = $"Có thể dịch vụ của nhà cung cấp {provider} đang bảo trì. Vui lòng thử lại sau.";
                    }

                    return new TestApiKeyResponseDto
                    {
                        Success = false,
                        LatencyMs = stopwatch.ElapsedMilliseconds,
                        Provider = provider,
                        Model = model,
                        Status = statusCode == 429 ? "QUOTA_EXCEEDED" : (statusCode == 401 || statusCode == 403 ? "INVALID_KEY" : "API_ERROR"),
                        ErrorMessage = errorMsg,
                        DetailedError = responseBody.Length > 400 ? responseBody.Substring(0, 400) + "..." : responseBody,
                        Recommendation = recommendation
                    };
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new TestApiKeyResponseDto
                {
                    Success = false,
                    LatencyMs = stopwatch.ElapsedMilliseconds,
                    Provider = provider,
                    Model = model,
                    Status = "NETWORK_ERROR",
                    ErrorMessage = $"Không thể kết nối đến máy chủ AI của {provider}: {ex.Message}",
                    DetailedError = ex.ToString(),
                    Recommendation = "Vui lòng kiểm tra lại kết nối mạng Internet hoặc cấu hình tường lửa/proxy của cơ quan."
                };
            }
        }

        /// <summary>
        /// Thử nghiệm API Key và chat trực tiếp với AI (tương thích backward)
        /// </summary>
        [HttpPost("test-api-key")]
        public async Task<IActionResult> TestApiKey([FromBody] TestApiKeyRequestDto request)
        {
            var user = await GetCurrentUserAsync();
            string provider = (request.Provider ?? user?.AiProvider ?? "GEMINI").Trim().ToUpperInvariant();
            string model = ResolveOptimalModel(provider, request.Model ?? user?.AiModel);

            string apiKey = request.ApiKey?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("****") || apiKey.Contains("••••"))
            {
                if (user != null && !string.IsNullOrEmpty(user.EncryptedApiKey))
                {
                    try
                    {
                        apiKey = _encryptionService.Decrypt(user.EncryptedApiKey);
                    }
                    catch
                    {
                        return Ok(new TestApiKeyResponseDto
                        {
                            Success = false,
                            Provider = provider,
                            Model = model,
                            Status = "DECRYPTION_ERROR",
                            ErrorMessage = "Không thể giải mã khóa API đã lưu. Vui lòng nhập lại khóa API mới.",
                            Recommendation = "Vui lòng nhập lại chuỗi khóa API tại ô cài đặt và bấm Lưu trước khi thử nghiệm."
                        });
                    }
                }
            }

            var result = await PerformApiKeyTestInternalAsync(provider, model, apiKey, request.Prompt, user);
            return Ok(result);
        }

        /// <summary>
        /// Lấy danh sách toàn bộ các khóa API trong Két bảo mật (Vault) của người dùng
        /// </summary>
        [HttpGet("api-keys")]
        public async Task<IActionResult> GetApiKeysVault()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            await _context.SaveChangesAsync();
            return Ok(vault.Select(ToSafeDto).ToList());
        }

        /// <summary>
        /// Thêm một API Key mới vào két bảo mật, có tùy chọn kiểm tra và kích hoạt ngay
        /// </summary>
        [HttpPost("api-keys")]
        public async Task<IActionResult> AddApiKey([FromBody] AddApiKeyRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.ApiKey))
            {
                return BadRequest(new { message = "Khóa API không được để trống." });
            }

            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            string provider = (req.Provider ?? "GEMINI").Trim().ToUpperInvariant();
            string model = ResolveOptimalModel(provider, req.Model);
            string rawKey = req.ApiKey.Trim();
            string encryptedKey = _encryptionService.Encrypt(rawKey);
            string maskedKey = _encryptionService.MaskApiKey(rawKey);

            var vault = GetOrCreateVault(user);

            var newItem = new ApiKeyVaultItemDto
            {
                Id = Guid.NewGuid().ToString("N"),
                Label = string.IsNullOrWhiteSpace(req.Label) ? $"{provider} Key ({DateTime.Now:dd/MM HH:mm})" : req.Label.Trim(),
                Provider = provider,
                Model = model,
                MaskedKey = maskedKey,
                EncryptedKey = encryptedKey,
                IsActive = false,
                Status = "UNCHECKED",
                LastTestedAt = null
            };

            TestApiKeyResponseDto? testResult = null;
            if (req.AutoTestAndActivate)
            {
                testResult = await PerformApiKeyTestInternalAsync(provider, model, rawKey, null, user);
                newItem.LatencyMs = testResult.LatencyMs;
                newItem.LastTestedAt = DateTimeOffset.UtcNow;
                if (testResult.Success)
                {
                    newItem.Status = "HEALTHY";
                    newItem.Model = testResult.Model;
                    newItem.LastErrorReason = null;
                    // Kích hoạt ngay key mới vì đã test thành công
                    foreach (var k in vault) k.IsActive = false;
                    newItem.IsActive = true;
                }
                else
                {
                    newItem.Status = "ERROR";
                    newItem.LastErrorReason = testResult.ErrorMessage;
                    if (vault.Count == 0) newItem.IsActive = true;
                }
            }
            else
            {
                if (vault.Count == 0) newItem.IsActive = true;
            }

            vault.Add(newItem);
            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                item = ToSafeDto(newItem),
                testResult = testResult,
                message = newItem.Status == "HEALTHY" ? "Đã thêm và kích hoạt khóa API thành công." : "Đã thêm khóa API vào két bảo mật."
            });
        }

        /// <summary>
        /// Kiểm tra tính hoạt động của một khóa API cụ thể trong két bảo mật
        /// </summary>
        [HttpPost("api-keys/{id}/test")]
        public async Task<IActionResult> TestApiKeyInVault(string id, [FromBody] TestApiKeyRequestDto? customReq)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            var item = vault.FirstOrDefault(k => k.Id == id);
            if (item == null) return NotFound(new { message = "Không tìm thấy khóa API trong két bảo mật." });

            if (string.IsNullOrEmpty(item.EncryptedKey))
            {
                return BadRequest(new { message = "Khóa API không có dữ liệu mã hóa hợp lệ." });
            }

            string rawKey;
            try
            {
                rawKey = _encryptionService.Decrypt(item.EncryptedKey);
            }
            catch
            {
                item.Status = "ERROR";
                item.LastErrorReason = "Không thể giải mã khóa bảo mật.";
                await _context.SaveChangesAsync();
                return Ok(new { item = ToSafeDto(item), success = false, message = "Lỗi giải mã khóa." });
            }

            var testResult = await PerformApiKeyTestInternalAsync(item.Provider, item.Model, rawKey, customReq?.Prompt, user);
            item.LastTestedAt = DateTimeOffset.UtcNow;
            item.LatencyMs = testResult.LatencyMs;

            if (testResult.Success)
            {
                item.Status = "HEALTHY";
                item.Model = testResult.Model;
                item.LastErrorReason = null;
            }
            else
            {
                item.Status = "ERROR";
                item.LastErrorReason = testResult.ErrorMessage;
            }

            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = testResult.Success,
                item = ToSafeDto(item),
                testResult = testResult
            });
        }

        /// <summary>
        /// Kích hoạt một khóa API làm khóa chính xử lý văn bản
        /// </summary>
        [HttpPut("api-keys/{id}/activate")]
        public async Task<IActionResult> ActivateApiKey(string id)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            var target = vault.FirstOrDefault(k => k.Id == id);
            if (target == null) return NotFound(new { message = "Không tìm thấy khóa API chỉ định." });

            foreach (var k in vault)
            {
                k.IsActive = (k.Id == id);
            }

            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                activeKey = ToSafeDto(target),
                vault = vault.Select(ToSafeDto).ToList(),
                message = $"Đã kích hoạt khóa '{target.Label}' ({target.Provider} - {target.Model}) làm nguồn xử lý AI chính."
            });
        }

        /// <summary>
        /// Xóa một khóa API khỏi két bảo mật
        /// </summary>
        [HttpDelete("api-keys/{id}")]
        public async Task<IActionResult> DeleteApiKey(string id)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            var item = vault.FirstOrDefault(k => k.Id == id);
            if (item == null) return NotFound(new { message = "Không tìm thấy khóa API cần xóa." });

            bool wasActive = item.IsActive;
            vault.Remove(item);

            if (wasActive && vault.Count > 0)
            {
                var nextActive = vault.FirstOrDefault(k => k.Status == "HEALTHY") ?? vault.First();
                nextActive.IsActive = true;
            }

            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                vault = vault.Select(ToSafeDto).ToList(),
                message = $"Đã xóa khóa '{item.Label}' khỏi hệ thống."
            });
        }

        /// <summary>
        /// Cập nhật nhãn (Label) mô tả khóa API
        /// </summary>
        [HttpPut("api-keys/{id}/label")]
        public async Task<IActionResult> UpdateApiKeyLabel(string id, [FromBody] UpdateApiKeyLabelRequestDto req)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            var item = vault.FirstOrDefault(k => k.Id == id);
            if (item == null) return NotFound(new { message = "Không tìm thấy khóa API." });

            item.Label = string.IsNullOrWhiteSpace(req.Label) ? item.Label : req.Label.Trim();
            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, item = ToSafeDto(item) });
        }

        /// <summary>
        /// Kiểm tra đồng loạt toàn bộ các khóa API trong két bảo mật
        /// </summary>
        [HttpPost("api-keys/test-all")]
        public async Task<IActionResult> TestAllApiKeys()
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return NotFound(new { message = "Không tìm thấy thông tin tài khoản cán bộ." });

            var vault = GetOrCreateVault(user);
            int healthy = 0;
            int error = 0;

            foreach (var item in vault)
            {
                if (string.IsNullOrEmpty(item.EncryptedKey))
                {
                    item.Status = "ERROR";
                    item.LastErrorReason = "Thiếu dữ liệu mã hóa";
                    error++;
                    continue;
                }

                string rawKey;
                try
                {
                    rawKey = _encryptionService.Decrypt(item.EncryptedKey);
                }
                catch
                {
                    item.Status = "ERROR";
                    item.LastErrorReason = "Lỗi giải mã chuỗi khóa";
                    error++;
                    continue;
                }

                var res = await PerformApiKeyTestInternalAsync(item.Provider, item.Model, rawKey, null, user);
                item.LastTestedAt = DateTimeOffset.UtcNow;
                item.LatencyMs = res.LatencyMs;

                if (res.Success)
                {
                    item.Status = "HEALTHY";
                    item.Model = res.Model;
                    item.LastErrorReason = null;
                    healthy++;
                }
                else
                {
                    item.Status = "ERROR";
                    item.LastErrorReason = res.ErrorMessage;
                    error++;
                }
            }

            SaveVaultAndSyncUser(user, vault);
            await _context.SaveChangesAsync();

            return Ok(new TestAllApiKeysResponseDto
            {
                TotalKeys = vault.Count,
                HealthyKeys = healthy,
                ErrorKeys = error,
                Items = vault.Select(ToSafeDto).ToList(),
                SummaryMessage = $"Đã kiểm tra xong {vault.Count} khóa: {healthy} hoạt động tốt, {error} gặp lỗi."
            });
        }

        /// <summary>
        /// Lấy cấu hình Header & Footer mẫu cơ quan/địa phương
        /// </summary>
        [HttpGet("template")]
        public async Task<IActionResult> GetTemplate()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("id")?.Value;
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null)
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(username))
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.Trim().ToLower());
                }
            }

            if (user != null && !string.IsNullOrWhiteSpace(user.DocumentTemplateJson))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<DocumentTemplateDto>(user.DocumentTemplateJson);
                    if (parsed != null) return Ok(parsed);
                }
                catch { }
            }

            // Default fallback template
            return Ok(new DocumentTemplateDto());
        }

        /// <summary>
        /// Cập nhật Header & Footer mẫu cơ quan/địa phương
        /// </summary>
        [HttpPut("template")]
        public async Task<IActionResult> UpdateTemplate([FromBody] DocumentTemplateDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("id")?.Value;
            Guid currentUserId = Guid.TryParse(userIdClaim, out var parsedGuid) ? parsedGuid : Guid.Empty;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
            if (user == null)
            {
                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name;
                if (!string.IsNullOrEmpty(username))
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.Trim().ToLower());
                }
            }

            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy tài khoản cán bộ." });
            }

            user.DocumentTemplateJson = System.Text.Json.JsonSerializer.Serialize(dto);
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(dto);
        }
    }
}
