namespace GovDoc.Application.Common.Interfaces
{
    public interface IAesEncryptionService
    {
        /// <summary>
        /// Mã hóa 2 chiều chuẩn AES-256 (GCM / CBC với HMAC)
        /// </summary>
        string Encrypt(string plainText);

        /// <summary>
        /// Giải mã chuẩn AES-256
        /// </summary>
        string Decrypt(string cipherText);

        /// <summary>
        /// Ẩn chuỗi API Key chỉ hiển thị tiền tố và hậu tố an toàn (VD: sk-proj-...8AbC)
        /// </summary>
        string MaskApiKey(string apiKey);
    }
}
