@echo off
REM ============================================================
REM SecurDrive — Script de construccion para Android APK (Windows)
REM ============================================================
echo.
echo  =====================================================
echo    SecurDrive -- Build Android APK (Windows)
echo  =====================================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Node.js no encontrado. Instale desde https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js encontrado

REM Verificar .env.local
IF NOT EXIST ".env.local" (
    echo.
    echo [AVISO] No se encontro .env.local
    copy .env.example .env.local
    echo Archivo .env.local creado.
    echo.
    echo IMPORTANTE: Edite .env.local y agregue su GEMINI_API_KEY
    echo Obtenga su clave en: https://aistudio.google.com/app/apikey
    echo.
    pause
)

REM Instalar dependencias
echo.
echo [1/4] Instalando dependencias npm...
call npm install
IF ERRORLEVEL 1 ( echo [ERROR] npm install fallo & pause & exit /b 1 )

REM Build web
echo.
echo [2/4] Compilando aplicacion web...
call npm run build
IF ERRORLEVEL 1 ( echo [ERROR] Build fallo & pause & exit /b 1 )
echo [OK] Build web completado en /dist

REM Inicializar Android si no existe
IF NOT EXIST "android" (
    echo.
    echo [3/4] Inicializando proyecto Android...
    call npx cap init SecurDrive com.securdrive.app --web-dir dist
    call npx cap add android
) ELSE (
    echo [3/4] Proyecto Android ya existe, omitiendo init...
)

REM Sincronizar
echo.
echo [4/4] Sincronizando con Android...
call npx cap sync android
IF ERRORLEVEL 1 ( echo [ERROR] cap sync fallo & pause & exit /b 1 )

REM Compilar APK
echo.
echo Compilando APK de debug...
cd android
call gradlew.bat assembleDebug
cd ..

IF EXIST "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo  =====================================================
    echo    APK COMPILADO EXITOSAMENTE
    echo  =====================================================
    echo  Archivo: android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo  Para instalar: adb install android\app\build\outputs\apk\debug\app-debug.apk
    echo  O copie el APK al telefono y abralo directamente.
    echo  =====================================================
) ELSE (
    echo [ERROR] No se encontro el APK. Revise los errores de Gradle.
)

pause
