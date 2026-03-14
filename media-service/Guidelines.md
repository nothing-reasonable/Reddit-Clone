# Media Service Guidelines

## Run Locally

To run as a separate service:

1. Install Maven.
2. Compile the project:

```bash
mvn clean compile
```

3. Start the Spring Boot service:

```bash
mvn spring-boot:run
```

This media service will run on port **8084**.

## Database Setup

To start the PostgreSQL database container:

```bash
docker run -d --name mediadb -e POSTGRES_DB=mediadb -e POSTGRES_PASSWORD=postgres -p 5435:5432 postgres:16
```

## Security and Access Rules

- Security is configured in [SecurityConfig](src/main/java/com/example/mediaservice/security/SecurityConfig.java).
- Requires valid JWT tokens passed via the `Authorization: Bearer <token>` header, sourced from the `user-service`.
- Public endpoints (read-only):
    - `GET /api/media/**`
- All other endpoints require authentication.

## API Endpoints Provided

All endpoints are defined in [MediaController.java](src/main/java/com/example/mediaservice/controller/MediaController.java) and implemented in [MediaService.java](src/main/java/com/example/mediaservice/service/MediaService.java).

### Media Assets

1. `POST /api/media`
- Purpose: Upload a new media asset (currently a placeholder/mock).
- Access: Requires JWT.
- Response: `MediaAsset` (metadata and URL).

2. `DELETE /api/media/{assetId}`
- Purpose: Remove a media asset.
- Access: Requires JWT (Uploader only).
- Response: `204 No Content`.

## Error Responses

Centralized exception handling is implemented in [GlobalExceptionHandler](src/main/java/com/example/mediaservice/exception/GlobalExceptionHandler.java).

- `404 Not Found`: Returned for missing assets.
- `401 Unauthorized`: Returned when attempting to delete an asset not uploaded by the requester.
