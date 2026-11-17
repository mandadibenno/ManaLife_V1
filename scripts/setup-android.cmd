@echo off
setlocal
cd /d "%~dp0.."
echo.
echo [ManaLife] Installing Capacitor 8 Android dependencies...
call npm install @capacitor/core@8 @capacitor/android@8
if errorlevel 1 exit /b 1
call npm install -D @capacitor/cli@8
if errorlevel 1 exit /b 1
echo.
echo [ManaLife] Building native web assets...
node scripts\build-mobile.mjs
if errorlevel 1 exit /b 1
if not exist android\app (
  echo [ManaLife] Creating Android Studio project...
  call npx cap add android
  if errorlevel 1 exit /b 1
)
echo [ManaLife] Syncing Android assets...
call npx cap sync android
if errorlevel 1 exit /b 1
echo.
echo SUCCESS: Open Android Studio using: npx cap open android
echo Or push the provided GitHub Actions workflow to create a downloadable test APK.
endlocal
