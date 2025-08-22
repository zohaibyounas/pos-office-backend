@echo off
start cmd /k "node index.js"
timeout /t 3 >nul
start cmd /k "ngrok http 5000"
