using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using GovDoc.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;

namespace GovDoc.Infrastructure.Identity
{
    public class AesEncryptionService : IAesEncryptionService
    {
        private readonly byte[] _key;

        public AesEncryptionService(IConfiguration configuration)
        {
            var keyString = configuration["Security:EncryptionKey"]
                ?? configuration["Jwt:Secret"]
                ?? "GovDocAssistant_Administrative_Secret_Key_Super_Secure_2026_VnGov_Master_Key";

            using var sha256 = SHA256.Create();
            _key = sha256.ComputeHash(Encoding.UTF8.GetBytes(keyString)); // 256-bit key
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
            {
                return string.Empty;
            }

            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] nonce = new byte[AesGcm.NonceByteSizes.MaxSize]; // 12 bytes
            RandomNumberGenerator.Fill(nonce);

            byte[] cipherBytes = new byte[plainBytes.Length];
            byte[] tag = new byte[AesGcm.TagByteSizes.MaxSize]; // 16 bytes

            using (var aesGcm = new AesGcm(_key, AesGcm.TagByteSizes.MaxSize))
            {
                aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);
            }

            // Kết hợp [Nonce (12)] + [Tag (16)] + [CipherBytes]
            byte[] result = new byte[nonce.Length + tag.Length + cipherBytes.Length];
            Buffer.BlockCopy(nonce, 0, result, 0, nonce.Length);
            Buffer.BlockCopy(tag, 0, result, nonce.Length, tag.Length);
            Buffer.BlockCopy(cipherBytes, 0, result, nonce.Length + tag.Length, cipherBytes.Length);

            return Convert.ToBase64String(result);
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
            {
                return string.Empty;
            }

            try
            {
                byte[] fullCipher = Convert.FromBase64String(cipherText);
                int nonceSize = AesGcm.NonceByteSizes.MaxSize;
                int tagSize = AesGcm.TagByteSizes.MaxSize;

                if (fullCipher.Length < nonceSize + tagSize)
                {
                    return string.Empty;
                }

                byte[] nonce = new byte[nonceSize];
                byte[] tag = new byte[tagSize];
                int cipherLength = fullCipher.Length - nonceSize - tagSize;
                byte[] cipherBytes = new byte[cipherLength];

                Buffer.BlockCopy(fullCipher, 0, nonce, 0, nonceSize);
                Buffer.BlockCopy(fullCipher, nonceSize, tag, 0, tagSize);
                Buffer.BlockCopy(fullCipher, nonceSize + tagSize, cipherBytes, 0, cipherLength);

                byte[] plainBytes = new byte[cipherLength];
                using (var aesGcm = new AesGcm(_key, tagSize))
                {
                    aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);
                }

                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                return string.Empty;
            }
        }

        public string MaskApiKey(string apiKey)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return string.Empty;
            }

            string trimmed = apiKey.Trim();
            if (trimmed.Length <= 8)
            {
                return "********";
            }

            string prefix = trimmed.Length >= 7 ? trimmed.Substring(0, Math.Min(6, trimmed.Length)) : trimmed.Substring(0, 3);
            string suffix = trimmed.Substring(trimmed.Length - 4);

            return $"{prefix}...****...{suffix}";
        }
    }
}
