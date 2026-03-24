# Reddit Clone - Service Startup Guide

## Prerequisites
✅ Java 21 installed
✅ Maven installed
✅ PostgreSQL 14 running
✅ Databases created: `subredditdb` and `contentdb`

---

## Service Architecture

Your Reddit Clone consists of 4 microservices + 1 frontend:

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| **user-service** | 8081 | H2 (in-memory) | User accounts, authentication, JWT |
| **subreddit-service** | 8082 | PostgreSQL (subredditdb) | Subreddits, members, rules |
| **content-service** | 8083 | PostgreSQL (contentdb) | Posts, voting, saved posts |
| **moderation-service** | 8084 | None | AutoModerator rule engine |
| **ui (frontend)** | 3000 | N/A | React application |

---

## Starting All Services

### Option 1: Start Each Service Individually (Recommended for Development)

Open **4 separate terminal windows** and run:

#### Terminal 1 - User Service
```bash
cd user-service
mvn clean install
mvn spring-boot:run
```
Wait for: `Started UserServiceApplication`

#### Terminal 2 - Subreddit Service
```bash
cd subreddit-service
mvn clean install
mvn spring-boot:run
```
Wait for: `Started SubredditServiceApplication`

#### Terminal 3 - Content Service
```bash
cd content-service
mvn clean install
mvn spring-boot:run
```
Wait for: `Started ContentServiceApplication`

#### Terminal 4 - Moderation Service
```bash
cd moderation-service
mvn clean install
mvn spring-boot:run
```
Wait for: `Started ModerationServiceApplication`

---

## Testing the Services

### 1. User Service (Port 8081)

**Register a user:**
```bash
curl -X POST http://localhost:8081/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```
**Save the JWT token from the response!**

---

### 2. Subreddit Service (Port 8082)

**Create a subreddit:**
```bash
curl -X POST http://localhost:8082/api/subreddits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "testsubreddit",
    "description": "A test subreddit"
  }'
```

**Get all subreddits:**
```bash
curl http://localhost:8082/api/subreddits
```

---

### 3. Content Service (Port 8083)

**Create a post:**
```bash
curl -X POST http://localhost:8083/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subredditName": "testsubreddit",
    "title": "My First Post",
    "content": "Hello Reddit Clone!",
    "type": "TEXT"
  }'
```

**Get posts:**
```bash
curl http://localhost:8083/api/posts
```

---

### 4. Moderation Service (Port 8084)

**Test AutoMod rules:**
```bash
curl -X POST http://localhost:8084/api/playground/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "subredditName": "testsubreddit",
    "config": "title: [\"spam\", \"test\"]\naction: remove",
    "scenario": {
      "type": "POST",
      "title": "This is a spam post",
      "content": "Test content"
    }
  }'
```

---

## Checking Service Health

### Verify all services are running:
```bash
# User Service
curl http://localhost:8081/api/users

# Subreddit Service  
curl http://localhost:8082/api/subreddits

# Content Service
curl http://localhost:8083/api/posts

# Moderation Service
curl http://localhost:8084/api/playground/test
```

---

## Starting the Frontend (UI)

In a **5th terminal window**:

```bash
cd ui
npm install          # First time only
npm run dev
```

Open browser: http://localhost:3000

---

## Troubleshooting

### "Port already in use" error
```bash
# Find and kill the process using the port (example for 8081)
lsof -ti:8081 | xargs kill -9
```

### PostgreSQL connection errors
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if not running
brew services start postgresql@14

# Verify databases exist in pgAdmin 4
# Should see: subredditdb and contentdb
```

### Build errors
```bash
# Clean and rebuild
cd <service-name>
mvn clean install -U
```

### Database tables not created
The services use `ddl-auto: update` so tables will be created automatically on first run.
Check the console logs for any SQL errors.

---

## Database Access

### H2 Console (User Service)
- URL: http://localhost:8081/h2-console
- JDBC URL: `jdbc:h2:mem:userdb`
- Username: `sa`
- Password: *(leave blank)*

### PostgreSQL (via pgAdmin 4)
- Databases: `subredditdb`, `contentdb`
- Username: `postgres`
- Password: *(no password)*

---

## Stopping Services

Press `Ctrl + C` in each terminal window to stop the services.

---

## Quick Start Summary

```bash
# Terminal 1
cd user-service && mvn spring-boot:run

# Terminal 2
cd subreddit-service && mvn spring-boot:run

# Terminal 3
cd content-service && mvn spring-boot:run

# Terminal 4
cd moderation-service && mvn spring-boot:run

# Terminal 5
cd ui && npm run dev
```

**Then test with Postman or browse to http://localhost:3000**

---

## API Documentation

For complete API documentation, see: `references/apidoc.yaml`

You can view it using:
- Swagger Editor: https://editor.swagger.io
- Import into Postman as OpenAPI spec

---

## Next Steps

1. ✅ Start all services
2. ✅ Register a user via user-service
3. ✅ Login and get JWT token
4. ✅ Create a subreddit via subreddit-service
5. ✅ Create posts via content-service
6. ✅ Test AutoMod rules via moderation-service
7. ✅ Explore the frontend UI

Happy coding! 🚀