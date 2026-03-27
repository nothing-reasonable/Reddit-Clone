# Mod-Mail Service Guidelines

## Overview

`mod-mail-service` provides a comprehensive direct messaging and modmail system enabling:
- **User-to-User messaging**: private conversations between regular users
- **User-to-Moderator messaging**: users messaging moderators of a subreddit (mod responds as the subreddit)
- **Moderator-to-Moderator messaging**: moderators of the same subreddit messaging each other
- **Moderator Applications**: system for users to apply as moderators, with moderators accepting/rejecting in a dedicated system message flow

All messaging is tracked with unread states, and supports rich display logic based on conversation type.

---

## Quick Links

**Core Files:**
- [Messaging Controller](./src/main/java/com/example/modmailservice/controller/MessagingController.java) — REST endpoints for all messaging operations
- [Messaging Service](./src/main/java/com/example/modmailservice/service/MessagingService.java) — Core business logic, DTO transformation, application handling
- [Conversation Entity](./src/main/java/com/example/modmailservice/model/Conversation.java) — Two-user conversation model
- [Message Entity](./src/main/java/com/example/modmailservice/model/Message.java) — Individual message records with sender metadata
- [Security & Auth](./src/main/java/com/example/modmailservice/security/) — JWT validation, authorization checks
- [Configuration](./src/main/resources/application.yaml) — Database, port, and service URLs

---

## Service Setup

| Config | Value |
|--------|-------|
| Port | **8085** |
| Database | PostgreSQL `modmaildb` (port 5435) |
| Persistence | JPA with `ddl-auto: update` |
| Build | Maven: `./mvnw spring-boot:run` |

---

## Domain Model

### Conversation

Represents a 2-party conversation thread.

| Column | Type | Notes |
|---|---|---|
| id | Long (PK) | Auto-increment |
| user1 | String | First participant (user, moderator, or subreddit name) |
| user2 | String | Second participant |
| status | Enum | `OPEN` or `CLOSED` |
| last_read_by_user1 | DateTime | Track unread for user1 |
| last_read_by_user2 | DateTime | Track unread for user2 |
| created_at | DateTime | Auto-set on creation |
| updated_at | DateTime | Updated on new message |

**Unique constraint**: `(user1, user2)` — only one conversation per pair.

### Message

Individual message in a conversation.

| Column | Type | Notes |
|---|---|---|
| id | Long (PK) | Auto-increment |
| conversation_id | FK | References Conversation |
| sender_name | String | Who sent it (username, "SYSTEM", or subreddit name) |
| body | Text | Message content |
| acting_as_subreddit | String | If not null, sender is a moderator acting as this subreddit |
| created_at | DateTime | Auto-set on creation |

**Key fields for application messages:**
- `sender_name = "SYSTEM"` → System-generated moderator application message
- Body format: `"Application from <username> to moderate r/<subreddit>. Accept or reject."`

---

## REST API Endpoints

All endpoints require `Authorization: Bearer <JWT>` header unless noted.

### Messaging Endpoints

#### 1. **Create or Re-open Conversation**
```
POST /api/messages/conversations
Body: { "recipientName": "string", "body": "string", "actingAsSubreddit"?: "string" }
Returns: ConversationDto
```
- Creates a new conversation or re-opens if one exists between user and recipient.
- `actingAsSubreddit` (optional): if provided, moderator is messaging as the subreddit; call is validated against moderator's list.
- Response includes conversation ID, title (`otherUser`), last message preview, and unread flag.

#### 2. **Get All Conversations for User**
```
GET /api/messages/conversations
Returns: List<ConversationDto>
```
- Returns all conversations where the authenticated user is a participant.
- Includes moderator-managed conversations (where user moderates a subreddit).
- Each conversation shows:
  - `otherUser`: Smart display — may be `u/username`, `r/subreddit`, or `u/username[r/subreddit]` depending on context
  - `unread`: boolean flag based on `last_read_by_user*` timestamps
  - `lastMessagePreview`: first 100 chars of most recent message

#### 3. **Get Messages in Conversation**
```
GET /api/messages/conversations/{id}/messages
Returns: List<MessageDto>
```
- Retrieves all messages in a conversation (ordered by creation time).
- **Side effect**: marks conversation as read for the authenticated user (updates `lastReadByUser1` or `lastReadByUser2`).
- Each message includes:
  - `senderType`: `"USER"`, `"MODERATOR"`, or `"SYSTEM"`
  - `senderDisplayName`: formatted display name (e.g., `"u/alice"`, `"u/bob[r/ravens]"`, `"System"`)
  - `body`, `createdAt`

#### 4. **Send Message in Conversation**
```
POST /api/messages/conversations/{id}/messages
Body: { "body": "string" }
Returns: MessageDto
```
- Sends a message in an existing conversation.
- If the authenticated user is a moderator of the subreddit in this conversation, automatically tags message as `actingAsSubreddit` for display.
- Updates conversation's `updated_at` timestamp and marks as read for sender.

#### 5. **Close/Archive Conversation**
```
PUT /api/messages/conversations/{id}/close
Returns: 204 No Content
```
- Closes a conversation (prevents further messages).
- Only moderators of the relevant subreddit can close.

---

### Moderator Application Endpoints

#### 6. **Create Moderator Application**
```
POST /api/messages/applications
Body: { "subreddit": "string" }
Returns: ConversationDto
```
- Called by frontend when a user clicks "Apply as Moderator" on a subreddit page.
- Creates a system conversation between the subreddit and `__SYSTEM__` (internal user).
- Inserts a `SYSTEM` sender message with body: `"Application from <username> to moderate r/<subreddit>. Accept or reject."`
- All moderators of that subreddit will see this message when they check Messages.
- Response includes the conversation ID (used for accept/reject calls).

#### 7. **Accept Moderator Application**
```
PUT /api/messages/applications/{id}/accept
Returns: 204 No Content
```
- Called by a subreddit moderator via the accept button in mod-mail UI.
- Extracts applicant username from the system message body.
- **Calls subreddit-service** at `POST http://localhost:8082/api/subreddits/{subreddit}/moderators/add/{applicant}` to promote the user.
- Deletes the conversation (application message vanishes for all moderators).
- Throws 500 if promotion fails; throws 403 if caller is not a moderator of the subreddit.

#### 8. **Reject Moderator Application**
```
PUT /api/messages/applications/{id}/reject
Returns: 204 No Content
```
- Called by a subreddit moderator via the reject button in mod-mail UI.
- Verifies caller is a moderator of the subreddit.
- Deletes the conversation (application message vanishes for all moderators).
- No external API calls; purely removes the conversation record.

#### 9. **Get Pending Applications for User**
```
GET /api/messages/applications/me
Returns: List<String> (subreddit names)
```
- Returns list of subreddit names where the authenticated user has pending moderator applications.
- Scans all system conversations (`__SYSTEM__` participant) and extracts subreddit names from message bodies matching pattern `"Application from <username> to moderate r/<subreddit>."`.
- Used by frontend to show "Application Pending" badge on subreddit pages.

---

## Implementation Details

### Main Service Class: MessagingService

**Key Methods:**

- **`createConversation(username, recipient, body, actingAsSubreddit)`**
  - Validates `actingAsSubreddit` against moderator list if provided.
  - Uses unique constraint `findBetweenUsers()` to locate or create conversation.
  - Sets `lastReadByUser1` to now (sender has read the initial message).
  - Returns DTO with smart display logic applied.

- **`getConversations(username)`**
  - Fetches moderator list via REST call to subreddit-service.
  - Finds all conversations where username or a moderated subreddit is a participant.
  - Applies DTO transformation with smart display rules.

- **`getMessages(conversationId, username)`**
  - Validates access (user must be a participant or moderator).
  - Updates `lastReadBy*` timestamp for the user.
  - Returns messages transformed via `toMessageDto()`.

- **`toDtoWithLastMessage(conversation, currentUsername, moderatedSubreddits)`**
  - **Smart title logic**:
    - If one participant is a subreddit the user moderates:
      - Check if other participant also moderates it → show `r/<subreddit>`
      - Else → show `<username> [r/<subreddit>]` (for moderator view)
    - Else → show the other participant's username as-is
  - Handles unread flag based on `lastReadBy*` vs `updatedAt`.
  - Returns conversation DTO with last message preview.

- **`toMessageDto(message, moderatedSubreddits)`**
  - If `senderName == "SYSTEM"` → `senderType = SYSTEM`, `senderDisplayName = "System"`
  - Else if `actingAsSubreddit` is set:
    - `senderType = MODERATOR`
    - `senderDisplayName = "u/<senderName>[<subreddit>]"` (formatted for mod-as-subreddit display)
  - Else → `senderType = USER`, `senderDisplayName = <senderName>`

- **`createModeratorApplication(applicant, subreddit)`**
  - Finds or creates a conversation with `user1=<subreddit>`, `user2=__SYSTEM__`.
  - Inserts system message with body `"Application from <applicant> to moderate r/<subreddit>. Accept or reject."`
  - Returns DTO (visible to all moderators of the subreddit).

- **`acceptModeratorApplication(conversationId, actingModerator)`**
  - Extracts applicant from system message body.
  - Calls `restClient.post()` to subreddit-service to add moderator.
  - Throws exception (500) if subreddit call fails (user sees error in UI).
  - Deletes conversation on success.

- **`getApplicationsForUser(username)`**
  - Scans system conversations and extracts subreddit names where username has pending applications.
  - Used by frontend to populate pending application list.

### Controller: MessagingController

Maps HTTP routes to service methods:
- `POST /conversations` → `createConversation()`
- `GET /conversations` → `getConversations()`
- `GET /conversations/{id}/messages` → `getMessages()`
- `POST /conversations/{id}/messages` → `sendMessage()`
- `PUT /conversations/{id}/close` → `closeConversation()`
- `POST /applications` → `createModeratorApplication()`
- `PUT /applications/{id}/accept` → `acceptModeratorApplication()`
- `PUT /applications/{id}/reject` → `rejectModeratorApplication()`
- `GET /applications/me` → `getApplicationsForUser()`

### DTOs

- **`ConversationDto`**: `id`, `otherUser`, `username`, `status`, `lastMessagePreview`, `createdAt`, `updatedAt`, `unread`
- **`MessageDto`**: `id`, `senderType` (USER/MODERATOR/SYSTEM), `senderDisplayName`, `body`, `createdAt`

---

## Changes to Other Services & Files

### Frontend (UI) Changes

#### **SubredditContext.tsx**
- **Added**: `removePendingApplication(subreddit: string)` function to clear pending flag after accept/reject.
- **Added**: `useEffect` to fetch pending applications from mod-mail at context load.
  - Calls `GET /api/messages/applications/me` and updates local `pendingModApplications` from server.
  - Ensures UI reflects authoritative server state (not just localStorage).

#### **SubredditPage.tsx**
- **Modified**: `handleApplyModerator()` now calls `createApplication(token, subreddit)` API instead of just setting localStorage.
  - Creates system message on backend immediately.
  - Marks application pending locally.
- **Modified**: Placeholder text in mod message input changed from "e.g. almaksud" to "e.g. ravens".

#### **MessagingPage.tsx**
- **Added**: Accept/reject handlers for system application messages.
  - Render system messages with Accept/Reject buttons (visible to moderators only).
  - Call `acceptApplication()` / `rejectApplication()` endpoints.
  - Refresh conversation list and clear pending flag on success.
- **Modified**: Message rendering logic to detect system messages and show themed UI (centered, with action buttons).
- **Modified**: Conversation list keys changed to composite (`conv-<id>-<otherUser>-<index>`) to avoid React key warnings when conversations have same ID/name.
- **Added**: Deduplication of conversations after fetch to prevent transient duplicates.

#### **messagingApi.ts**
- **Added**: Functions:
  - `createApplication(token, subreddit)` → `POST /api/messages/applications`
  - `acceptApplication(token, conversationId)` → `PUT /api/messages/applications/{id}/accept`
  - `rejectApplication(token, conversationId)` → `PUT /api/messages/applications/{id}/reject`

### Backend (Subreddit Service) Changes

#### **SecurityConfig.java**
- **Added**: Permitted `POST /api/subreddits/*/moderators/add/*` for unauthenticated access.
- **Reason**: Allows mod-mail service to call the endpoint without JWT (internal service-to-service call).

#### **SubredditService.java & SubredditServiceImpl.java**
- **Added**: `addModerator(subredditName, username)` method.
  - Finds or creates `SubredditMember` with role `MODERATOR`.
  - Called by mod-mail when accepting an application.

#### **SubredditController.java**
- **Added**: `POST /api/subreddits/{name}/moderators/add/{username}` endpoint.
  - Exposed for mod-mail to call when promoting applicants.

---

## Security & Authorization

- **JWT Validation**: All endpoints require valid JWT token (except `/api/subreddits/*/moderators/add/*` endpoint).
- **Moderator Verification**: Service calls `http://localhost:8082/api/subreddits/{name}/members` to verify moderator status.
- **Conversation Access**: Users can only see their own conversations; moderators can see all for their subreddits.
- **Application Acceptance**: Only moderators of the target subreddit can accept/reject.

---

## Data Flow: Moderator Application Example

1. **User applies**:
   - Clicks "Apply as Moderator" on subreddit page.
   - Frontend calls `POST /api/messages/applications` with subreddit name.
   - Backend creates conversation (`subreddit` ↔ `__SYSTEM__`) and inserts system message.
   - Frontend marks application as pending in `SubredditContext`.

2. **Moderator reviews**:
   - Logs in, opens Messages.
   - Frontend polls `GET /api/messages/conversations` every 5 seconds.
   - Returns system application conversation with `senderType = SYSTEM`.
   - UI renders system message with Accept/Reject buttons.

3. **Moderator accepts**:
   - Clicks Accept button.
   - Frontend calls `PUT /api/messages/applications/{id}/accept`.
   - Backend:
     - Extracts applicant username from message body.
     - Calls `POST http://localhost:8082/api/subreddits/{sub}/moderators/add/{user}`.
     - Deletes conversation.
   - Frontend removes pending flag and refreshes.
   - **Applicant** (if refreshes SubredditPage) sees no "Application Pending" badge and moderator role granted.

---

## Prerequisites & Startup

### Database
```bash
createdb -p 5435 modmaildb
```

### Running Services (in order)
1. **Subreddit Service** (8082):
   ```bash
   cd subreddit-service
   java -jar target/subreddit-service-0.0.1-SNAPSHOT.jar
   ```

2. **Mod-Mail Service** (8085):
   ```bash
   cd mod-mail
   ./mvnw spring-boot:run
   # or: java -jar target/mod-mail-service-0.0.1-SNAPSHOT.jar
   ```

3. **Frontend** (5173):
   ```bash
   cd ui
   npm run dev
   ```

### Troubleshooting

- **403 Forbidden on accept/reject**: Ensure subreddit service is running and `/moderators/add/*` pattern is in security config.
- **Applicant not promoted**: Check mod-mail logs for debug lines; ensure moderator calling accept is indeed a moderator of the subreddit.
- **Pending application doesn't clear**: Ensure `SubredditContext` polling is fetching from `GET /api/messages/applications/me` successfully.
