@echo off
setlocal
title JAUC-JS - Inicio
pushd "%~dp0"
if errorlevel 1 goto :directory_error

where wt.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Windows Terminal.
  echo Instala Windows Terminal desde Microsoft Store y vuelve a ejecutar iniciar.bat.
  goto :error
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js en PATH.
  echo Instala Node.js LTS desde https://nodejs.org/ y vuelve a abrir esta ventana.
  goto :error
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro npm. Reinstala Node.js con npm.
  goto :error
)
node scripts\check-node.cjs
if errorlevel 1 goto :error

if not exist node_modules\.package-lock.json goto :install
if not exist node_modules\.bin\vite.cmd goto :install
if not exist node_modules\.bin\tsx.cmd goto :install
goto :launch

:install
echo Instalando las dependencias del front y del back...
call npm ci --no-fund --no-audit
if errorlevel 1 goto :error

:launch
echo Abriendo Windows Terminal con dos pestanas. Espera a que ambos servicios indiquen que estan listos.
wt.exe -w new new-tab --title "JAUC-JS - Backend :5038" -d "%CD%" "%ComSpec%" /k "npm run dev:back" ; new-tab --title "JAUC-JS - Frontend :4200" -d "%CD%" "%ComSpec%" /k "npm run dev:front"
if errorlevel 1 goto :error
echo.
echo Frontend: http://127.0.0.1:4200
echo API:      http://127.0.0.1:5038/api/health
echo Detener: Ctrl+C en cada pestana y luego cerrarla.
popd
exit /b 0

:error
echo.
echo No se pudo iniciar JAUC-JS. Revisa el mensaje anterior.
pause
popd
exit /b 1

:directory_error
echo [ERROR] No se pudo abrir la carpeta del proyecto.
pause
exit /b 1
