#!/bin/bash

# Define colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}      Starting Legal-AI Assistant...         ${NC}"
echo -e "${CYAN}=============================================${NC}"

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n${YELLOW}[*] Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM to clean up background tasks
trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${YELLOW}[*] Launching FastAPI Backend on Port 8000...${NC}"
(
    cd backend || exit
    # Try to activate virtual environment if it exists (Linux/Mac structure)
    if [ -f "../.venv/bin/activate" ]; then
        source ../.venv/bin/activate
    elif [ -f "./.venv/bin/activate" ]; then
        source ./.venv/bin/activate
    fi
    uvicorn app.main:app --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Start Frontend
echo -e "${YELLOW}[*] Launching React Vite Frontend on Port 5173...${NC}"
(
    cd frontend || exit
    npm run dev
) &
FRONTEND_PID=$!

echo -e "\n${GREEN}[+] Servers are running in the background.${NC}"
echo -e "${GREEN}[+] Backend API: http://localhost:8000${NC}"
echo -e "${GREEN}[+] Frontend UI: http://localhost:5173${NC}"
echo -e "${CYAN}=============================================${NC}"
echo -e "${YELLOW}[*] Press Ctrl+C to safely stop both servers.${NC}\n"

# Wait for background processes to keep script running
wait
