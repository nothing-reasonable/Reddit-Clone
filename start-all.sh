#!/bin/bash
echo "==================================="
echo "Starting Reddit Clone Services"
echo "==================================="

echo "Ensuring DBs are up..."
docker-compose up -d postgres-user postgres-subreddit postgres-content postgres-moderation postgres-modmail redis

echo "Starting user-service (Port 8081)..."
cd user-service
nohup mvn spring-boot:run > ../user-service.log 2>&1 &
cd ..

echo "Starting subreddit-service (Port 8082)..."
cd subreddit-service
nohup mvn spring-boot:run > ../subreddit-service.log 2>&1 &
cd ..

echo "Starting content-service (Port 8083)..."
cd content-service
nohup mvn spring-boot:run > ../content-service.log 2>&1 &
cd ..

echo "Starting moderation-service (Port 8084)..."
cd moderation-service
nohup mvn spring-boot:run > ../moderation-service.log 2>&1 &
cd ..

echo "Starting mod-mail (Port 8085)..."
cd mod-mail
nohup mvn spring-boot:run > ../mod-mail.log 2>&1 &
cd ..

echo "Starting UI (Port 5173)..."
cd ui
nohup npm run dev > ../ui.log 2>&1 &
cd ..

echo "==================================="
echo "All services started in background!"
echo "Check the following files for logs:"
echo " - user-service.log"
echo " - subreddit-service.log"
echo " - content-service.log"
echo " - moderation-service.log"
echo " - mod-mail.log"
echo " - ui.log"
echo "==================================="
echo "To quickly stop them all, use: ./stop-all.sh"
