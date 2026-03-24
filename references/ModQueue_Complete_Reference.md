# ModQueue Complete Reference Guide

> **Source**: This document details the implementation of the ModQueue and its integration across the microservice ecosystem (Content Service, Moderation Service, Subreddit Service, and User Service). It serves as a comprehensive reference for understanding the architecture and usage of the moderation queue.

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Content Service Changes](#content-service-changes)
4. [Moderation Service Changes](#moderation-service-changes)
5. [Subreddit Service Changes](#subreddit-service-changes)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Testing & Usage Flow](#testing--usage-flow)

---

## Introduction

The ModQueue is an asynchronous and bulk-action-capable moderation queue that allows Subreddit Moderators to review content reported by users. When regular users report a post, it disappears from their feed and enters a pending state within the ModQueue. Moderators can then review these flagged posts and either approve them (restoring visibility) or definitively remove them.

### How It Works

- A user reports a post using the Content Service.
- The `reports` counter on the `Post` entity is incremented, and `flagged` logic is applied.
- The Moderation Service acts as the interface for moderators, securely verifying permissions via the Subreddit Service before querying the Content Service internally for flagged items.
- Moderators submit a `PATCH` request with bulk actions (`approved` or `removed`) via the Moderation Service.
- The Moderation Service proxies this decision back to the Content Service to persist the final state.

---

## Architecture Overview

The system is heavily distributed across 4 services, meaning the ModQueue requires inter-service communication (currently via HTTP REST using `RestClient`):

- **User Service (8081):** Authenticates users issuing reports and moderators reviewing the queue.
- **Subreddit Service (8082):** Maintains the `MODERATOR` roster for each subreddit.
- **Content Service (8083):** Owns the `Post` database, tracks the `reports` count, and filters removed items from the public feed.
- **Moderation Service (8084):** Provides the ModQueue interface, authenticates moderator status, and delegates state changes to the Content Service.

---

## Content Service Changes

### Database Schema Limits
PostgreSQL requires strict schema validation. The `Post.java` entity was updated to explicitly account for database constraints:
- Added `@Column(columnDefinition = "integer default 0", nullable = false) private int reports = 0;` to store report limits.
- Handled the existing database requirement for `private boolean flagged = false;` to prevent 500 Constraint Violation Errors.

### Inter-Service APIs
Created `InternalPostController.java` exclusively for the Moderation Service to consume:
- `GET /api/internal/posts/flagged`: Returns only posts where `reports > 0`.
- `PATCH /api/internal/posts/modqueue-action`: Accepts `ModQueueActionRequest` and bulk-updates post states (resetting `reports` or setting `removed = true`).

### End-User Interactions
- Built `POST /api/posts/{postId}/reports` for standard users to flag a post.
- Modified feed retrievals (`GET /api/posts`) to proactively filter out `removed == true` content.

---

## Moderation Service Changes

### ModeratorAuthService
Introduced a rigid authorization layer to prevent standard API users from viewing queues they don't own:
- On every ModQueue request, a REST call is made to `GET /api/subreddits/{subreddit}/members` on the Subreddit Service.
- The service extracts the requesting username from the JWT and ensures they appear locally in the list with `role == "MODERATOR"`. Throws `403 Forbidden` otherwise.

### Controllers and DTOs
- Implemented `ModQueueController` to house the `GET` and `PATCH` routes.
- Built explicit DTO mapping classes (`ModQueueItem`, `ModQueueActionRequest`, `PostDto`) to negotiate payloads seamlessly between the standard client, Moderation Service, and Content Service without tight coupling.

---

## Subreddit Service Changes

No massive database modifications were required here. The existing `GET /api/subreddits/{name}/members` endpoint was successfully utilized. Future expansions for ModLog tracking or automated actions (AutoModerator) will interface heavily with this service's rule definitions.

---

## API Endpoints Reference

### End-User Facing

| Method | Endpoint | Authenticated | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/posts/{postId}/reports` | Yes | Standard user flags a post, causing it to enter the queue |

### Moderator Facing (Requires `MODERATOR` Role)

| Method | Endpoint | Payload / Params | Description |
|--------|----------|-------------------|-------------|
| `GET` | `/api/r/{subreddit}/modqueue` | `?page=0&limit=25` | Returns a paginated view of all reported items in the subreddit |
| `PATCH` | `/api/r/{subreddit}/modqueue` | `{ "ids": ["id-1", ...], "status": "approved" }` | Bulk actions multiple reported posts (approved or removed) |

---

## Testing & Usage Flow

### Creating the ModQueue Scenario
1. Authenticate as a standard user (`POST :8081/api/auth/login`).
2. Discover a post on `http://localhost:8083/api/r/{subreddit}/posts`.
3. Report the post: `POST http://localhost:8083/api/posts/{postId}/reports`.

### ModManager Lifecycle
1. Authenticate as the Subreddit Creator/Moderator (`POST :8081/api/auth/login`).
2. Make a `GET` request to `http://localhost:8084/api/r/{subreddit}/modqueue` passing the Authorization token.
3. Identify the nested `id` inside the `content` array representing the reported item.
4. Execute a `PATCH` request to `http://localhost:8084/api/r/{subreddit}/modqueue`:
```json
{
  "ids": ["target-uuid-here"],
  "status": "removed"
}
```
5. Confirm the item disappears from both the ModQueue and the public `/api/r/{subreddit}/posts` feed.
