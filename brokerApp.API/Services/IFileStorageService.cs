namespace brokerApp.API.Services;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string? folderPath = null);
    Task<string> GetFileUrlAsync(string storageKey);
    Task DeleteFileAsync(string storageKey);
}
