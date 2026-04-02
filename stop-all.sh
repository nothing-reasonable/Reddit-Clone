#!/bin/bash
echo "Stopping all microservices..."
kill $(lsof -t -i:8081) 2>/dev/null
kill $(lsof -t -i:8082) 2>/dev/null
kill $(lsof -t -i:8083) 2>/dev/null
kill $(lsof -t -i:8084) 2>/dev/null
kill $(lsof -t -i:8085) 2>/dev/null
kill $(lsof -t -i:5173) 2>/dev/null
echo "Done!"
