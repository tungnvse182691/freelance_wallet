# ---------- Build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj truoc de tan dung Docker layer cache (doi code khong phai restore lai)
COPY src/Api/Api.csproj src/Api/
COPY src/Domain/Domain.csproj src/Domain/
COPY src/Infrastructure/Infrastructure.csproj src/Infrastructure/
RUN dotnet restore src/Api/Api.csproj

# Copy toan bo source roi publish
COPY src/ src/
RUN dotnet publish src/Api/Api.csproj -c Release -o /app/out --no-restore

# ---------- Runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS runtime
WORKDIR /app

# QuestPDF/SkiaSharp can fontconfig + font de gen PDF tren Linux
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/out ./

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

# Render tu inject $PORT (mac dinh 10000); chay local thi fallback 8080
ENTRYPOINT ["sh", "-c", "dotnet Api.dll --urls http://+:${PORT:-8080}"]
