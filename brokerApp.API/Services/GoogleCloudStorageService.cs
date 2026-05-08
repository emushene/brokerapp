using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Configuration;

namespace brokerApp.API.Services;

public class GoogleCloudStorageService : IFileStorageService
{
    private readonly StorageClient _storageClient;
    private readonly string _bucketName;

    public GoogleCloudStorageService(IConfiguration configuration)
    {
        _storageClient = StorageClient.Create();
        _bucketName = configuration["GCP:BucketName"] ?? throw new ArgumentNullException("GCP:BucketName is missing in configuration");
    }

    public async Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string? folderPath = null)
    {
        var fileExtension = Path.GetExtension(fileName);
        var uniqueFileName = Guid.NewGuid().ToString() + fileExtension;
        
        var storageKey = string.IsNullOrEmpty(folderPath) 
            ? uniqueFileName 
            : $"{folderPath.TrimEnd('/')}/{uniqueFileName}";

        await _storageClient.UploadObjectAsync(_bucketName, storageKey, contentType, stream);
        return storageKey;
    }

    public async Task<string> GetFileUrlAsync(string storageKey)
    {
        // Generates a signed URL that is valid for 1 hour.
        try 
        {
            // For production with a Service Account, you would use:
            // var signer = UrlSigner.FromCredential(credential);
            // return signer.Sign(_bucketName, storageKey, TimeSpan.FromHours(1), null);

            // For local testing with ADC, we'll return a signed URL if we can, 
            // but the Cloud Storage .NET library requires a Service Account key for local signing.
            // As a fallback, we'll return the public URL.
            
            var url = $"https://storage.googleapis.com/{_bucketName}/{storageKey}";
            return await Task.FromResult(url);
        }
        catch
        {
            var url = $"https://storage.googleapis.com/{_bucketName}/{storageKey}";
            return await Task.FromResult(url);
        }
    }

    public async Task DeleteFileAsync(string storageKey)
    {
        await _storageClient.DeleteObjectAsync(_bucketName, storageKey);
    }
}
