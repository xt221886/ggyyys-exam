@echo off
echo ========================================
echo  考试系统 - 自动重连隧道
echo ========================================
:loop
echo [%time%] Connecting...
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R tcm-exam:80:localhost:8765 serveo.net
echo [%time%] Dropped, retry in 5s...
timeout /t 5 >nul
goto loop
