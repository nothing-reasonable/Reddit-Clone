# Moderation Service Guidelines

## Overview
`moderation-service` currently provides an in-memory AutoMod rule evaluation engine and a test playground API for trying custom YAML rules against a scenario payload.

## Quick Links
- [Application config](./src/main/resources/application.yaml)
- [Main app class](./src/main/java/com/example/moderationservice/ModerationServiceApplication.java)
- [AutoMod engine](./src/main/java/com/example/moderationservice/engine/AutoModEngine.java)
- [Test playground controller](./src/main/java/com/example/moderationservice/testplayground/TestPlaygroundController.java)
- [Auth service](./src/main/java/com/example/moderationservice/auth/ModeratorAuthService.java)
- [Security config](./src/main/java/com/example/moderationservice/security/SecurityConfig.java)
- [JWT filter](./src/main/java/com/example/moderationservice/security/JwtAuthenticationFilter.java)
- [JWT util](./src/main/java/com/example/moderationservice/security/JwtUtil.java)
- [Subreddit member client DTO](./src/main/java/com/example/moderationservice/client/SubredditMemberDto.java)
- [JWT auth test](./src/test/java/com/example/moderationservice/security/JwtUtilTest.java)
- [Engine unit test](./src/test/java/com/example/moderationservice/engine/AutoModEngineTest.java)

## Implemented So Far

### 1. Service Setup
- Spring Boot service is configured and runnable.
- Default server port is `8084` (`src/main/resources/application.yaml`).
- Maven build and `spring-boot:run` are working.

### 2. AutoMod Rule Evaluation Engine
Implemented in `src/main/java/com/example/moderationservice/engine/AutoModEngine.java`.

Supported behavior:
- Parses rule map and evaluates conditions.
- Action mapping:
  - `remove` -> `remove`
  - `approve` -> `approve`
  - `filter` -> `flag`
  - `set_flair` inferred as `set_flair`
  - `modmail/message/comment` inferred as `send_modmail`
- Message mapping priority:
  - `message`, then `comment`, then `modmail`
- Condition fields supported:
  - `title`, `body`, `domain`/`url`, `flair_text`
  - `author` block with `name`, `account_age`, `post_karma`, `comment_karma`, `combined_karma`
- Matching modifiers supported:
  - `case-sensitive`, `regex`, `full-exact`, `starts-with`, `ends-with`, `full-text`, `includes`, `includes-word`
- Negation support via key prefix `~`.
- Numeric thresholds (`<`, `<=`, `>`, `>=`, `==`) for karma/account age checks.
- Time-unit conversion support for `account_age` (`hour`, `day`, `week`, `month`, `year`).

### 3. Test Playground API
Implemented in [`src/main/java/com/example/moderationservice/testplayground/`](./src/main/java/com/example/moderationservice/testplayground/).

Available endpoint:
- `POST /api/moderation/tests`

Request model:
- `subredditName`: subreddit name used for moderator authorization
- `ruleYaml`: YAML rule string
- `scenario`: test content and author info (`title`, `body`, `author`, `karma`, `accountAge`, `domain`, `flair`)

Response model:
- `triggered`, `action`, `message`, `error`

Validation/error handling already present:
- Empty rule YAML
- Invalid YAML syntax
- Runtime evaluation errors

### 4. Authentication and Authorization
Implemented in [`src/main/java/com/example/moderationservice/security/`](./src/main/java/com/example/moderationservice/security/) and [`src/main/java/com/example/moderationservice/auth/`](./src/main/java/com/example/moderationservice/auth/).

Current access policy for moderation endpoints (`/api/moderation/**`):
- User must be logged in with the same Bearer JWT pattern used by the other services.
- JWT validation uses the shared signing secret already used by `user-service`, `content-service`, and `subreddit-service`.
- Authenticated username is read from the JWT subject via Spring Security.
- Moderator access is verified by checking subreddit membership in `subreddit-service` and requiring role `MODERATOR`.
- The playground request must include `subredditName` so authorization is evaluated for the target community.

### 5. Test Coverage Status
- Base Spring context test exists: [`ModerationServiceApplicationTests`](./src/test/java/com/example/moderationservice/ModerationServiceApplicationTests.java)
- JWT utility tests exist for the shared token validation path.
- Engine regression test exists for malformed modifier syntax handling.

## Pending Work (To Be Done)

### 1. Rule Add/Edit
- Add persistent rule storage (DB-backed or file-backed).
- Create APIs for:
  - add rule
  - edit rule
  - list rules
  - delete/disable rule (recommended)
- Add rule validation before save (required keys, supported condition keys, valid operators/modifiers).
- Track metadata (rule id, subreddit id, createdBy, updatedBy, createdAt, updatedAt, priority, enabled flag).

### 2. Modqueue
- Introduce moderation queue entity/model for flagged submissions/comments.
- Create APIs for:
  - list modqueue items (filter by status/subreddit/date)
  - get item detail
- Save AutoMod evaluation outputs to queue when action requires review (for example `flag/filter`).
- Define queue statuses (for example `PENDING`, `APPROVED`, `REJECTED`, `AUTO_REMOVED`).

### 3. Mod Manual Approve/Reject
- Create moderator action APIs:
  - approve queued item
  - reject/remove queued item
- Apply moderation action side effects (status update, action reason, moderator id, timestamp).
- Add audit logging for manual decisions.
- Add authorization checks so only moderators can approve/reject.

## Suggested Next Implementation Order
1. Design domain models and persistence schema (`Rule`, `ModQueueItem`, `ModerationActionLog`).
2. Implement Rule Add/Edit APIs with validation.
3. Wire AutoMod evaluation results into Modqueue creation.
4. Implement manual approve/reject APIs and audit trail.
5. Add unit and integration tests for all workflows.
