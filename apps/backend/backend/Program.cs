using System.Reflection;
using Entities;
using FluentValidation;
using FluentValidation.AspNetCore;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Serilog;
using System.Text;
using System.IdentityModel.Tokens.Jwt;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog
builder.Host.UseSerilog((context, config) =>
{
     config.ReadFrom.Configuration(context.Configuration);
});

// 2. Controllers (NO FluentValidation here anymore)
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:3001")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ✅ NEW FluentValidation setup
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddFluentValidationClientsideAdapters();

// ✅ Register validators from assembly
builder.Services.AddValidatorsFromAssembly(Assembly.Load("Commons"));

// 3. DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. MediatR
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssemblies(
        Assembly.Load("Commons")
    ));

// 5. JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"] ?? "super-secret-key-with-minimum-32-chars!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ClockSkew = TimeSpan.Zero
    };
});

// 6. Authorization
builder.Services.AddAuthorization();

// 7. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();

    try
    {
        await dbContext.Database.MigrateAsync();
    }
    catch (PostgresException ex) when (
        ex.SqlState == PostgresErrorCodes.DuplicateTable ||
        ex.SqlState == PostgresErrorCodes.DuplicateObject ||
        ex.SqlState == PostgresErrorCodes.DuplicateColumn ||
        ex.SqlState == PostgresErrorCodes.UniqueViolation)
    {
        Log.Warning("Ignoring migration conflict ({SqlState}) and continuing startup: {Message}", ex.SqlState, ex.MessageText);

        if (pendingMigrations.Count > 0)
        {
            var efVersion = typeof(DbContext).Assembly.GetName().Version?.ToString() ?? "10.0.0";

            await dbContext.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
    ""MigrationId"" character varying(150) NOT NULL,
    ""ProductVersion"" character varying(32) NOT NULL,
    CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
);");

            foreach (var migrationId in pendingMigrations)
            {
                await dbContext.Database.ExecuteSqlRawAsync(
                    @"INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"") VALUES ({0}, {1}) ON CONFLICT (""MigrationId"") DO NOTHING;",
                    migrationId,
                    efVersion);
            }

            Log.Warning("Marked pending migrations as applied after conflict: {Count}", pendingMigrations.Count);
        }
    }
}

// 8. Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
