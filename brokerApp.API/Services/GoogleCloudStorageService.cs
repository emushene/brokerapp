using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Configuration;
using Google.Apis.Auth.OAuth2;
using System.IO;
using Microsoft.Extensions.Logging;

namespace brokerApp.API.Services;

public class GoogleCloudStorageService : IFileStorageService
{
    private readonly StorageClient _storageClient;
    private readonly string _bucketName;
    private readonly GoogleCredential _credential;
    private readonly ILogger<GoogleCloudStorageService> _logger;

    public GoogleCloudStorageService(IConfiguration configuration, ILogger<GoogleCloudStorageService> logger)
    {
        _logger = logger;
        var keyFilePath = configuration["GoogleDrive:KeyFilePath"] ?? "broker-app-key.json";
        
        if (File.Exists(keyFilePath))
        {
            _logger.LogInformation("GCS: Loading credentials from {Path}", keyFilePath);
            _credential = GoogleCredential.FromFile(keyFilePath);
        }
        else
        {
            var apiPath = Path.Combine("brokerApp.API", keyFilePath);
            if (File.Exists(apiPath))
            {
                _logger.LogInformation("GCS: Loading credentials from fallback {Path}", apiPath);
                _credential = GoogleCredential.FromFile(apiPath);
            }
            else
            {
                _logger.LogWarning("GCS: Key file not found, using Application Default Credentials");
                _credential = GoogleCredential.GetApplicationDefault();
            }
        }

        _storageClient = StorageClient.Create(_credential);
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
        try 
        {
            _logger.LogInformation("GCS: Attempting to generate signed URL for {Key}", storageKey);
            // Generate a Signed URL valid for 2 hours
            UrlSigner urlSigner = UrlSigner.FromCredential(_credential);
            string signedUrl = await urlSigner.SignAsync(_bucketName, storageKey, TimeSpan.FromHours(2), HttpMethod.Get);
            _logger.LogInformation("GCS: Successfully generated signed URL");
            return signedUrl;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "GCS: Failed to generate signed URL for {Key}. Falling back to public URL.", storageKey);
            return $"https://storage.googleapis.com/{_bucketName}/{storageKey}";
        }
    }

    public async Task DeleteFileAsync(string storageKey)
    {
        await _storageClient.DeleteObjectAsync(_bucketName, storageKey);
    }
}
