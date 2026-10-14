using System;
using System.IO;
using System.Threading.Tasks;

namespace GovDoc.Infrastructure.Services
{
    public interface IFileStorageService
    {
        Task<string> SaveFileAsync(Stream fileStream, string originalFileName, string subFolder);
        Task<byte[]> GetFileBytesAsync(string relativePath);
        string GetPhysicalPath(string relativePath);
    }

    public class LocalFileStorageService : IFileStorageService
    {
        private readonly string _baseStoragePath;

        public LocalFileStorageService()
        {
            _baseStoragePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "StorageFiles");
            if (!Directory.Exists(_baseStoragePath))
            {
                Directory.CreateDirectory(_baseStoragePath);
            }
        }

        public async Task<string> SaveFileAsync(Stream fileStream, string originalFileName, string subFolder)
        {
            var folder = Path.Combine(_baseStoragePath, subFolder);
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }

            var extension = Path.GetExtension(originalFileName);
            var safeFileName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(folder, safeFileName);

            using var output = new FileStream(fullPath, FileMode.Create, FileAccess.Write);
            if (fileStream.CanSeek)
            {
                fileStream.Seek(0, SeekOrigin.Begin);
            }
            await fileStream.CopyToAsync(output);

            return $"{subFolder}/{safeFileName}".Replace("\\", "/");
        }

        public async Task<byte[]> GetFileBytesAsync(string relativePath)
        {
            var fullPath = GetPhysicalPath(relativePath);
            if (!File.Exists(fullPath))
            {
                return Array.Empty<byte>();
            }
            return await File.ReadAllBytesAsync(fullPath);
        }

        public string GetPhysicalPath(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath))
            {
                throw new ArgumentException("Đường dẫn tệp tin không được để trống.", nameof(relativePath));
            }

            if (Path.IsPathRooted(relativePath) || relativePath.StartsWith("/") || relativePath.StartsWith("\\"))
            {
                throw new UnauthorizedAccessException("Cảnh báo bảo mật: Không được sử dụng đường dẫn tuyệt đối hoặc gốc hệ điều hành.");
            }

            var sanitized = relativePath.Replace("/", Path.DirectorySeparatorChar.ToString());
            var combined = Path.Combine(_baseStoragePath, sanitized);
            var fullPath = Path.GetFullPath(combined);
            var fullBase = Path.GetFullPath(_baseStoragePath);
            var basePrefix = fullBase.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

            if (!fullPath.StartsWith(basePrefix, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Cảnh báo bảo mật: Đường dẫn truy cập tệp tin nằm ngoài thư mục lưu trữ cho phép.");
            }

            return fullPath;
        }
    }
}
