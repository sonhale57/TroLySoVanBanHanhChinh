using System;
using System.Collections.Generic;
using GovDoc.Infrastructure.Identity;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GovDoc.Tests
{
    public class ByokAesEncryptionTests
    {
        private readonly AesEncryptionService _encryptionService;

        public ByokAesEncryptionTests()
        {
            var myConfiguration = new Dictionary<string, string?>
            {
                { "Security:EncryptionKey", "TestGovSecretKey_For_Phase_1_5_Testing_Purpose_2026_Secure!" }
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(myConfiguration)
                .Build();

            _encryptionService = new AesEncryptionService(configuration);
        }

        [Fact]
        public void EncryptAndDecrypt_ShouldRestoreOriginalPlainText()
        {
            // Arrange
            string originalKey = "sk-proj-abc123456789xyzGovApiKeyDecree30Personal";

            // Act
            string encrypted = _encryptionService.Encrypt(originalKey);
            string decrypted = _encryptionService.Decrypt(encrypted);

            // Assert
            Assert.False(string.IsNullOrWhiteSpace(encrypted));
            Assert.NotEqual(originalKey, encrypted);
            Assert.Equal(originalKey, decrypted);
        }

        [Fact]
        public void Encrypt_SameInputTwice_ShouldYieldDifferentCiphertextsDueToRandomNonce()
        {
            // Arrange
            string key = "sk-ant-api03-abcdef1234567890-test";

            // Act
            string encrypted1 = _encryptionService.Encrypt(key);
            string encrypted2 = _encryptionService.Encrypt(key);

            // Assert
            Assert.NotEqual(encrypted1, encrypted2);
            Assert.Equal(key, _encryptionService.Decrypt(encrypted1));
            Assert.Equal(key, _encryptionService.Decrypt(encrypted2));
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public void Encrypt_EmptyOrNull_ShouldReturnEmptyString(string? input)
        {
            // Act
            string result = _encryptionService.Encrypt(input!);

            // Assert
            Assert.Equal(string.Empty, result);
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public void Decrypt_EmptyOrNull_ShouldReturnEmptyString(string? input)
        {
            // Act
            string result = _encryptionService.Decrypt(input!);

            // Assert
            Assert.Equal(string.Empty, result);
        }

        [Fact]
        public void Decrypt_TamperedCiphertext_ShouldReturnEmptyStringSafelyWithoutCrashing()
        {
            // Arrange
            string key = "sk-openrouter-secret-key-12345";
            string encrypted = _encryptionService.Encrypt(key);

            // Tamper with base64 bytes
            byte[] bytes = Convert.FromBase64String(encrypted);
            bytes[^1] ^= 0xFF; // Flip last byte
            string tampered = Convert.ToBase64String(bytes);

            // Act
            string decrypted = _encryptionService.Decrypt(tampered);

            // Assert
            Assert.Equal(string.Empty, decrypted);
        }

        [Fact]
        public void MaskApiKey_StandardApiKey_ShouldMaskMiddleCharacters()
        {
            // Arrange
            string apiKey = "sk-ant-api03-1234567890abcdef9999";

            // Act
            string masked = _encryptionService.MaskApiKey(apiKey);

            // Assert
            Assert.StartsWith("sk-ant", masked);
            Assert.EndsWith("9999", masked);
            Assert.Contains("...****...", masked);
            Assert.DoesNotContain("1234567890abcdef", masked);
        }

        [Fact]
        public void MaskApiKey_ShortKey_ShouldReturnEightStars()
        {
            // Arrange
            string shortKey = "1234567";

            // Act
            string masked = _encryptionService.MaskApiKey(shortKey);

            // Assert
            Assert.Equal("********", masked);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void MaskApiKey_EmptyOrWhitespace_ShouldReturnEmpty(string? key)
        {
            // Act
            string masked = _encryptionService.MaskApiKey(key!);

            // Assert
            Assert.Equal(string.Empty, masked);
        }

        [Fact]
        public void MultiKeyVault_EncryptionAndStatusManagement_ShouldWorkReliably()
        {
            // Arrange
            var rawKeys = new[]
            {
                new { Provider = "GEMINI", Key = "AIzaSyTestGeminiKey1234567890", Label = "Google AI Pro 1" },
                new { Provider = "OPENAI", Key = "sk-proj-openai9876543210abcd", Label = "OpenAI Dự Phòng" }
            };

            var vault = new List<GovDoc.Application.DTOs.ApiKeyVaultItemDto>();

            // Act
            foreach (var item in rawKeys)
            {
                string encrypted = _encryptionService.Encrypt(item.Key);
                string masked = _encryptionService.MaskApiKey(item.Key);

                vault.Add(new GovDoc.Application.DTOs.ApiKeyVaultItemDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Label = item.Label,
                    Provider = item.Provider,
                    Model = "auto",
                    MaskedKey = masked,
                    EncryptedKey = encrypted,
                    IsActive = item.Provider == "GEMINI",
                    Status = "HEALTHY",
                    LatencyMs = 245
                });
            }

            // Serialize to simulate SQL Server JSON storage
            string json = System.Text.Json.JsonSerializer.Serialize(vault);
            var restoredVault = System.Text.Json.JsonSerializer.Deserialize<List<GovDoc.Application.DTOs.ApiKeyVaultItemDto>>(json);

            // Assert
            Assert.NotNull(restoredVault);
            Assert.Equal(2, restoredVault.Count);

            var activeKey = restoredVault.Find(k => k.IsActive);
            Assert.NotNull(activeKey);
            Assert.Equal("GEMINI", activeKey.Provider);
            Assert.Equal("Google AI Pro 1", activeKey.Label);
            Assert.Equal("HEALTHY", activeKey.Status);

            // Verify decrypt of both stored keys
            string decryptedGemini = _encryptionService.Decrypt(activeKey.EncryptedKey!);
            Assert.Equal("AIzaSyTestGeminiKey1234567890", decryptedGemini);

            var backupKey = restoredVault.Find(k => !k.IsActive);
            Assert.NotNull(backupKey);
            Assert.Equal("OPENAI", backupKey.Provider);
            string decryptedOpenAi = _encryptionService.Decrypt(backupKey.EncryptedKey!);
            Assert.Equal("sk-proj-openai9876543210abcd", decryptedOpenAi);
        }
    }
}
