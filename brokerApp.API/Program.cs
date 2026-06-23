using brokerApp.API.Data;
using brokerApp.API.Repositories;
using brokerApp.API.Services;
using brokerApp.API.Configuration;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Load secrets from Google Secret Manager
var gcpProjectId = builder.Configuration["GCP:ProjectId"] ?? "project-d4757723-0bc3-412e-b9f";
builder.Configuration.AddGoogleSecrets(gcpProjectId, new Dictionary<string, string>
{
    { "ConnectionStrings:DefaultConnection", "broker-db-connection-string" },
    { "Firebase:AdminKeyJson", "firebase-admin-key" },
    { "GoogleDrive:ServiceAccountJson", "google-drive-service-account" }
});

var firebaseProjectId = builder.Configuration["Firebase:ProjectId"] ?? builder.Configuration["Firebase:AdminKeyJson:project_id"];

// --------------------
// SERVICES
// --------------------

// Controllers support
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Caching
builder.Services.AddMemoryCache();

// IHttpContextAccessor (for Service layer identity)
builder.Services.AddHttpContextAccessor();

// Repositories & Services
builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();
builder.Services.AddScoped<ISubmissionService, SubmissionService>();
builder.Services.AddScoped<IFinancialsService, FinancialsService>();
builder.Services.AddScoped<IReconciliationService, ReconciliationService>();
builder.Services.AddScoped<IFileStorageService, GoogleCloudStorageService>();
builder.Services.AddScoped<IGoogleDriveSyncService, GoogleDriveSyncService>();
builder.Services.AddScoped<IGoogleSheetsService, GoogleSheetsService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHostedService<GoogleDriveSyncWorker>();

// --------------------
// FIREBASE AUTH FIXED
// --------------------
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",

            ValidateAudience = true,
            ValidAudience = firebaseProjectId,

            ValidateLifetime = true
        };
    });

// PostgreSQL DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddOpenTelemetryTracing(tracerProviderBuilder =>
{
    tracerProviderBuilder
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(builder.Configuration["OTEL_SERVICE_NAME"] ?? "brokerapp-api"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(opt =>
        {
            opt.Endpoint = new Uri(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317");
        });
});

builder.Services.AddOpenTelemetryMetrics(metricsBuilder =>
{
    metricsBuilder
        .SetResourceBuilder(ResourceBuilder.CreateDefault().AddService(builder.Configuration["OTEL_SERVICE_NAME"] ?? "brokerapp-api"))
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter(opt =>
        {
            opt.ScrapeEndpointPath = "/metrics";
        });
});

// --------------------
// SWAGGER FIX (THIS IS WHAT YOU ARE MISSING)
// --------------------
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter Firebase JWT token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// CORS (for React later)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// --------------------
// PIPELINE
// --------------------

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowReact");

app.UseAuthentication();   // ✔ Firebase validation
app.UseAuthorization();    // ✔ [Authorize] enforcement

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapPrometheusScrapingEndpoint("/metrics");

app.Run();