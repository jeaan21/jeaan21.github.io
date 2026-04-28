#!/usr/bin/env bash
# ============================================================
# SecurDrive — Script de construcción para Android APK
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        SecurDrive — Build Android APK                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar requisitos
echo "▶ Verificando requisitos..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js no encontrado. Instale desde https://nodejs.org"; exit 1; }
command -v java >/dev/null 2>&1 || { echo "❌ Java no encontrado. Instale JDK 17+"; exit 1; }
echo "  ✅ Node.js $(node -v)"
echo "  ✅ Java $(java -version 2>&1 | head -1)"

# 2. Verificar .env.local
if [ ! -f ".env.local" ]; then
  echo ""
  echo "⚠️  No se encontró .env.local"
  echo "   Creando desde .env.example..."
  cp .env.example .env.local
  echo ""
  echo "  ⚡ IMPORTANTE: Edite .env.local y agregue su GEMINI_API_KEY"
  echo "     Obtenga su clave en: https://aistudio.google.com/app/apikey"
  echo ""
  read -p "  Presione ENTER cuando haya configurado la API key..."
fi

# 3. Instalar dependencias
echo ""
echo "▶ Instalando dependencias npm..."
npm install

# 4. Build web
echo ""
echo "▶ Compilando aplicación web..."
npm run build
echo "  ✅ Build web completado en /dist"

# 5. Inicializar Capacitor si no existe android/
if [ ! -d "android" ]; then
  echo ""
  echo "▶ Inicializando proyecto Android con Capacitor..."
  npx cap init SecurDrive com.securdrive.app --web-dir dist
  npx cap add android
  echo "  ✅ Proyecto Android creado en /android"
fi

# 6. Sincronizar archivos web con Android
echo ""
echo "▶ Sincronizando archivos web → Android..."
npx cap sync android
echo "  ✅ Sincronización completada"

# 7. Compilar APK de debug
echo ""
echo "▶ Compilando APK de debug..."
cd android
./gradlew assembleDebug
cd ..

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  SIZE=$(du -sh "$APK_PATH" | cut -f1)
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║  ✅ APK COMPILADO EXITOSAMENTE                       ║"
  echo "╠══════════════════════════════════════════════════════╣"
  echo "║  📦 Archivo: $APK_PATH"
  echo "║  📏 Tamaño:  $SIZE"
  echo "╠══════════════════════════════════════════════════════╣"
  echo "║  📲 Para instalar en Android:                        ║"
  echo "║     adb install $APK_PATH  ║"
  echo "║  O copie el APK al teléfono y ábralo directamente   ║"
  echo "╚══════════════════════════════════════════════════════╝"
else
  echo ""
  echo "❌ No se encontró el APK. Revise los errores de Gradle arriba."
  exit 1
fi
