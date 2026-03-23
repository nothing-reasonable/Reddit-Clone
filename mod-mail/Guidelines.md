# Mod-Mail Service Guidelines

## Overview
`mod-mail-service` provides a simple modmail system where **users** can message **moderators of a subreddit**, and all moderators see and reply to those messages as "the subreddit" (e.g. `r/SomeSubreddit`). One continuous conversation per user–subreddit pair.

## Quick Links
- [Application config](./src/main/resources/application.yaml)
- [Main app class](./src/main/java/com/example/modmailservice/ModMailServiceApplication.java)
- [Controller](./src/main/java/com/example/modmailservice/controller/ModMailController.java)
- [Service](./src/main/java/com/example/modmailservice/service/ModMailService.java)
- [Conversation entity](./src/main/java/com/example/modmailservice/model/Conversation.java)
- [Message entity](./src/main/java/com/example/modmailservice/model/Message.java)
- [Auth service](./src/main/java/com/example/modmailservice/auth/ModeratorAuthService.java)
- [Security config](./src/main/java/com/example/modmailservice/security/SecurityConfig.java)
- [JWT filter](./src/main/java/com/example/modmailservice/security/JwtAuthenticationFilter.java)
- [JWT util](./src/main/java/com/example/modmailservice/security/JwtUtil.java)

## Service Setup
- Spring Boot service on port **8085**.
- PostgreSQL database: `modmaildb` on port **5435**.
- JPA with `ddl-auto: update` — tables are created/updated automatically.
- Maven build: `./mvnw clean compile` / `./mvnw spring-boot:run`.

## Domain Model

### Conversation
| Column | Type | Notes |
|---|---|---|
| id | Long (auto) | Primary key |
| subreddit_name | String | Target subreddit |
| username | String | The non-mod user who started the conversation |
| status | Enum | `OPEN` or `CLOSED` |
| created_at | DateTime | Auto-set on create |
| updated_at | DateTime | Auto-updated |

Unique constraint on `(subreddit_name, username)` — one conversation per user per subreddit.

### Message
| Column | Type | Notes |
|---|---|---|
| id | Long (auto) | Primary key |
| conversation_id | FK → Conversation | |
| sender_type | Enum | `USER` or `MODERATOR` |
| sender_name | String | Actual username (for audit) |
| body | Text | Message content |
| created_at | DateTime | Auto-set on create |

## REST API

All endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Who | Description |
|---|---|---|---|
| `POST` | `/api/modmail/conversations` | User | Start/re-open a conversation (`{subredditName, body}`) |
| `GET` | `/api/modmail/conversations/user` | User | List the user's own conversations |
| `GET` | `/api/modmail/conversations/subreddit/{name}` | Mod | List all conversations for a subreddit |
| `GET` | `/api/modmail/conversations/{id}/messages` | User/Mod | Get messages in a conversation |
| `POST` | `/api/modmail/conversations/{id}/messages` | User/Mod | Send a message (`{body}`) |
| `PUT` | `/api/modmail/conversations/{id}/close` | Mod | Close a conversation |

### Key Behaviors
- **Moderator replies** appear as `r/SubredditName` (not the mod's personal username).
- **One conversation per user–subreddit pair**: if a conversation already exists, `POST /conversations` re-opens it instead of creating a duplicate.
- **Access control**: users can only see their own conversations; moderators can see all conversations for their subreddit.
- **Closed conversations** cannot receive new messages.

## Authentication & Authorization
- JWT validation uses the same shared HMAC signing key as all other services.
- Moderator role is verified by calling `subreddit-service` at `http://localhost:8082/api/subreddits/{name}/members`.
- CORS allows `http://localhost:5173` (Vite UI).

## Prerequisites
1. PostgreSQL running on port **5435** with database `modmaildb`:
   ```bash
   createdb -p 5435 modmaildb
   ```
2. `subreddit-service` running on port **8082** (for moderator verification).

## Running
```bash
cd mod-mail
./mvnw spring-boot:run
```
