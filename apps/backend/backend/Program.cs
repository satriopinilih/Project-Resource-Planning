using System.Reflection;
using backend.Controllers;
using backend.Services;
using Entities;
using FluentValidation;
using FluentValidation.AspNetCore;
using MediatR;
using Microsoft.AspNetCore.Mvc;
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

// 2. Controllers with JsonStringEnumConverter so enum fields (e.g. WorkingType) 
// are deserialized from strings like "NonDedicated" instead of silently defaulting to 0
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || uri.Host.Equals("127.0.0.1");
            })
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

// 4b. Application Services (business logic layer)
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ContractExtensionService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<HireRequestService>();
builder.Services.AddScoped<HolidayService>();
builder.Services.AddScoped<SkillService>();
builder.Services.AddScoped<PMProjectService>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<RecommendationService>();
builder.Services.AddScoped<RequestHistoryService>();

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

    await dbContext.Database.MigrateAsync();

    await dbContext.Database.ExecuteSqlRawAsync(@"
INSERT INTO ""StaffRoles"" (""RoleName"")
VALUES ('PM')
ON CONFLICT (""RoleName"") DO NOTHING;
");

    if (app.Environment.IsDevelopment() && !await dbContext.Users.AnyAsync())
    {
        Log.Information("Database appears empty. Running automatic seed for development.");

        var seedController = new SeedController(dbContext);
        var seedResult = await seedController.Seed();

        if (seedResult.Result is ObjectResult { StatusCode: >= 400 } errorResult)
        {
            Log.Warning("Automatic seed failed with status {StatusCode}: {@Payload}", errorResult.StatusCode, errorResult.Value);
        }
        else
        {
            Log.Information("Automatic seed completed.");
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
