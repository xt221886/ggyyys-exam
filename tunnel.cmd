@echo off
echo 考试隧道 - 地址: https://tcm-exam.loca.lt
:loop
npx localtunnel --port 8765 --subdomain tcm-exam
echo [%time%] 断开，5秒后重连...
timeout /t 5 >nul
goto loop
