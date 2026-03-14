# Subreddit Service Guidelines

## Run Locally

To run as a separate service:

1. Install Maven.
2. Compile the project:

```bash
mvn clean compile
```

3. Start the Spring Boot service:

This subreddit service will run on port **8082**.

## Database Setup

To start the PostgreSQL database container:

```bash
docker run -d --name subredditdb -e POSTGRES_DB=subredditdb -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
```

## Security and Access Rules

- Security is configured in [SecurityConfig](src/main/java/com/example/subredditservice/security/SecurityConfig.java)
- Requires valid JWT tokens passed via the `Authorization: Bearer <token>` header, sourced from the `user-service`.

## API Endpoints Provided

All endpoints are defined in [SubredditController.java](src/main/java/com/example/subredditservice/controller/SubredditController.java).

### Subreddit Core

1. `POST /api/subreddits`
- Purpose: Create a new subreddit community
- Request body: `CreateSubredditRequest` (name, description, type, isNsfw)

2. `GET /api/subreddits/{name}`
- Purpose: Retrieve full subreddit info by name
- Response: `SubredditDto`

3. `GET /api/subreddits/id/{id}`
- Purpose: Retrieve full subreddit info by numeric ID
- Response: `SubredditDto`

4. `GET /api/subreddits`
- Purpose: List all subreddits
- Response: `List<SubredditDto>`

5. `GET /api/subreddits/search?q={query}`
- Purpose: Search subreddits by name or description
- Response: `List<SubredditDto>`

6. `PUT /api/subreddits/{name}`
- Purpose: Update subreddit settings (description, bannerUrl, iconUrl)
- Request body: `UpdateSubredditRequest`
- Response: `SubredditDto`

7. `DELETE /api/subreddits/{name}`
- Purpose: Permanently delete a subreddit
- Response: `204 No Content`

### Subreddit Members

8. `POST /api/subreddits/{name}/join`
- Purpose: Join a subreddit (uses authenticated identity)
- Response: `SubredditMemberDto`

9. `DELETE /api/subreddits/{name}/join`
- Purpose: Leave a subreddit (uses authenticated identity)
- Response: `204 No Content`

10. `GET /api/subreddits/{name}/members`
- Purpose: List all members of the subreddit
- Response: `List<SubredditMemberDto>`

### Subreddit Rules

11. `POST /api/subreddits/{name}/rules`
- Purpose: Add a new rule to the subreddit
- Request body: `SubredditRuleDto` (title, description)
- Response: `SubredditRuleDto`

12. `PUT /api/subreddits/{name}/rules/{ruleId}`
- Purpose: Update an existing rule
- Request body: `SubredditRuleDto`
- Response: `SubredditRuleDto`

13. `DELETE /api/subreddits/{name}/rules/{ruleId}`
- Purpose: Remove a rule by ID
- Response: `204 No Content`

### Subreddit Flairs

14. `POST /api/subreddits/{name}/flairs?flair={text}`
- Purpose: Add a new flair text option
- Response: `SubredditDto`

15. `DELETE /api/subreddits/{name}/flairs/{flairText}`
- Purpose: Remove a flair text option
- Response: `SubredditDto`
