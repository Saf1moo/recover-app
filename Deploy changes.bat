@echo off
echo.
echo 🌿 Recover App — Deploying to Cloudflare...
echo.

cd /d "D:\Claude\projects\recover-app\recover-app"

git add .

set /p msg="What did you change? (press Enter for 'update'): "
if "%msg%"=="" set msg=update

git commit -m "%msg%"
git push

echo.
echo ✅ Done! Your site will be live in ~60 seconds.
echo    Check: https://recover-app.pages.dev
echo.
pause
