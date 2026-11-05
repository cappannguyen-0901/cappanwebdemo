@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "dist\index.html" (
  start "" "dist\index.html"
  exit /b 0
)

echo Chua co ban dong goi dist. Dang thu build bang Node...
where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node 20 tro len roi chay: node scripts\build.mjs
  pause
  exit /b 1
)

node scripts\build.mjs
if exist "dist\index.html" (
  start "" "dist\index.html"
) else (
  echo Build that bai. Xem loi o tren.
  pause
)
