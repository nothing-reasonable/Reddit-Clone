# User Service Guidelines

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

## Security and Access Rules

- Security is configured in [SecurityConfig](src/main/java/com/example/userservice/security/SecurityConfig.java).
- Public endpoints:
	- `POST /api/auth/login`
	- `POST /api/users/register`
- All other endpoints require a valid JWT Bearer token.

## API Endpoints Provided

### Authentication

1. `POST /api/auth/login`
- Purpose: Authenticates a user and returns a JWT plus user profile data.
- Request body (`AuthRequest`): `username`, `password`.
- Response (`AuthResponse`): `token`, `user`.
- Implemented in:
	- [AuthController](src/main/java/com/example/userservice/controller/AuthController.java)
	- Request DTO: [AuthRequest](src/main/java/com/example/userservice/dto/AuthRequest.java)
	- Response DTO: [AuthResponse](src/main/java/com/example/userservice/dto/AuthResponse.java)

### Users

1. `POST /api/users/register`
- Purpose: Creates a new user account.
- Access: Public.
- Request body (`CreateUserRequest`): `username`, `email`, `password`.
- Validation: username 3-50 chars, valid email, password min 6 chars.
- Response: `201 Created` with created `UserDto`.
- Implemented in:
	- [UserController](src/main/java/com/example/userservice/controller/UserController.java)
	- Request DTO: [CreateUserRequest](src/main/java/com/example/userservice/dto/CreateUserRequest.java)
	- Response DTO: [UserDto](src/main/java/com/example/userservice/dto/UserDto.java)

2. `GET /api/users/id/{id}`
- Purpose: Fetches a user by numeric user ID.
- Access: Requires JWT.
- Response: `200 OK` with `UserDto`.
- Implemented in:
	- [UserController](src/main/java/com/example/userservice/controller/UserController.java)

3. `GET /api/users/{username}`
- Purpose: Fetches a user by username.
- Access: Requires JWT.
- Response: `200 OK` with `UserDto`.
- Implemented in:
	- [UserController](src/main/java/com/example/userservice/controller/UserController.java)

4. `GET /api/users`
- Purpose: Returns all users.
- Access: Requires JWT.
- Response: `200 OK` with `List<UserDto>`.
- Implemented in:
	- [UserController](src/main/java/com/example/userservice/controller/UserController.java)

5. `DELETE /api/users/id/{id}`
- Purpose: Deletes a user by internal ID.
- Access: Requires JWT.
- Response: `204 No Content`.
- Implemented in:
	- [UserController](src/main/java/com/example/userservice/controller/UserController.java)

## Error Responses

Centralized exception handling is implemented in [GlobalExceptionHandler](src/main/java/com/example/userservice/exception/GlobalExceptionHandler.java).

- `404 Not Found`: Returned for missing resources.
- `409 Conflict`: Returned when creating a duplicate user.
- `400 Bad Request`: Returned for validation failures on request payloads.