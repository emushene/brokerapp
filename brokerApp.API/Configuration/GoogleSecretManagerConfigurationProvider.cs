using Google.Cloud.SecretManager.V1;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace brokerApp.API.Configuration;

public class GoogleSecretManagerConfigurationProvider : ConfigurationProvider
{
    private readonly string _projectId;
    private readonly IDictionary<string, string> _secretKeys;

    public GoogleSecretManagerConfigurationProvider(string projectId, IDictionary<string, string> secretKeys)
    {
        _projectId = projectId;
        _secretKeys = secretKeys;
    }

    public override void Load()
    {
        try
        {
            var client = SecretManagerServiceClient.Create();

            foreach (var (configKey, secretId) in _secretKeys)
            {
                try
                {
                    var secretVersionName = new SecretVersionName(_projectId, secretId, "latest");
                    var result = client.AccessSecretVersion(secretVersionName);
                    var payload = result.Payload.Data.ToStringUtf8();

                    // If it's a JSON object, we might want to flatten it into the config
                    // But for service accounts, we usually want the whole JSON string.
                    // We'll check if the configKey is intended to be a parent or a direct value.
                    
                    if (payload.Trim().StartsWith("{") && payload.Trim().EndsWith("}"))
                    {
                        // It's JSON. We store it as a direct value AND try to parse it if it's not a service account key
                        Data[configKey] = payload;

                        // Also parse it to allow nested access (e.g. Firebase:ProjectId from the JSON)
                        // UNLESS it's a known service account key where we want the raw string mostly.
                        using var doc = JsonDocument.Parse(payload);
                        ParseElement(configKey, doc.RootElement);
                    }
                    else
                    {
                        Data[configKey] = payload;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] Failed to load secret {secretId}: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CRITICAL] Error initializing Secret Manager client: {ex.Message}");
        }
    }

    private void ParseElement(string prefix, JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    ParseElement(Combine(prefix, property.Name), property.Value);
                }
                break;
            case JsonValueKind.Array:
                int index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    ParseElement(Combine(prefix, index.ToString()), item);
                    index++;
                }
                break;
            case JsonValueKind.String:
            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
                Data[prefix] = element.ToString();
                break;
        }
    }

    private string Combine(string prefix, string name)
    {
        return string.IsNullOrEmpty(prefix) ? name : $"{prefix}{ConfigurationPath.KeyDelimiter}{name}";
    }
}

public class GoogleSecretManagerConfigurationSource : IConfigurationSource
{
    public string ProjectId { get; set; } = string.Empty;
    public IDictionary<string, string> SecretKeys { get; set; } = new Dictionary<string, string>();

    public IConfigurationProvider Build(IConfigurationBuilder builder)
    {
        return new GoogleSecretManagerConfigurationProvider(ProjectId, SecretKeys);
    }
}

public static class GoogleSecretManagerConfigurationExtensions
{
    public static IConfigurationBuilder AddGoogleSecrets(
        this IConfigurationBuilder builder, string projectId, IDictionary<string, string> secretKeys)
    {
        return builder.Add(new GoogleSecretManagerConfigurationSource
        {
            ProjectId = projectId,
            SecretKeys = secretKeys
        });
    }
}
