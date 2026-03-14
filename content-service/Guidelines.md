# Content Service Guidelines

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

All microservices use a centralized Postgres database in Production but use a local Postgres instance for development.
This content service will run on port **8083**.

## Database Setup

To start the PostgreSQL database container:

```bash
docker run -d --name contentdb -e POSTGRES_DB=contentdb -e POSTGRES_PASSWORD=postgres -p 5434:5432 postgres:16
```

## Security and Access Rules

- Security is configured in [SecurityConfig](src/main/java/com/example/contentservice/security/SecurityConfig.java).
- Requires valid JWT tokens passed via the `Authorization: Bearer <token>` header, sourced from the `user-service`.
- Public endpoints (read-only):
    - `GET /api/posts/**`
    - `GET /api/r/*/posts/**`
- All other endpoints require authentication.

## API Endpoints Provided

All endpoints are defined in [PostController.java](src/main/java/com/example/contentservice/controller/PostController.java) and implemented in [ContentService.java](src/main/java/com/example/contentservice/service/ContentService.java).

### Posts Core

1. `GET /api/posts`
- Purpose: Retrieve a paginated list of posts globally.
- Query params: `sort` (hot, new), `limit`, `after` (cursor).
- Response: `PaginatedResponse<Post>`.

2. `GET /api/r/{subreddit}/posts`
- Purpose: Retrieve posts from a specific subreddit.
- Response: `PaginatedResponse<Post>`.

3. `POST /api/r/{subreddit}/posts`
- Purpose: Create a new post in a subreddit.
- Access: Requires JWT.
- Request body ([PostCreateRequest.java](src/main/java/com/example/contentservice/dto/PostCreateRequest.java)): `title`, `content`, `type`, `url`, `flair`.

4. `GET /api/posts/{postId}`
- Purpose: Retrieve detailed info for a single post.
- Response: `Post`.

5. `PATCH /api/posts/{postId}`
- Purpose: Update an existing post.
- Access: Requires JWT (Owner only).
- Request body ([PostUpdateRequest.java](src/main/java/com/example/contentservice/dto/PostUpdateRequest.java)).

6. `DELETE /api/posts/{postId}`
- Purpose: Delete a post (redacts content).
- Access: Requires JWT (Owner only).

### User Interactions

7. `PUT /api/posts/{postId}/votes`
- Purpose: Upvote or downvote a post.
- Request body ([VoteRequest.java](src/main/java/com/example/contentservice/dto/VoteRequest.java)): (direction: 1, -1, 0).

8. `PUT /api/posts/{postId}/saves`
- Purpose: Save a post to user profile.

9. `DELETE /api/posts/{postId}/saves`
- Purpose: Unsave a post.

## Error Responses

Centralized exception handling is implemented in [GlobalExceptionHandler](src/main/java/com/example/contentservice/exception/GlobalExceptionHandler.java).

- `404 Not Found`: Returned for missing posts.
- `401 Unauthorized`: Returned when attempting to modify a post not owned by the user.
- `400 Bad Request`: Returned for validation failures.
