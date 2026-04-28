# 🚗 SecurDrive — Control Vehicular Android

Sistema profesional para el control de entrada y salida de vehículos.
Construido con React + Vite + Capacitor → APK nativa para Android.

---

## 📱 ¿Cómo obtener la APK?

### Opción A — Script automático (recomendado)

**Linux / Mac:**
```bash
chmod +x build-android.sh
./build-android.sh
```

**Windows:**
```
Doble clic en build-android.bat
```

El APK quedará en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Opción B — Paso a paso manual

#### Requisitos previos
| Herramienta | Versión mínima | Descarga |
|-------------|---------------|----------|
| Node.js | 20+ | https://nodejs.org |
| JDK | 17+ | https://adoptium.net |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |

> ⚠️ **Android Studio** es necesario para que Gradle descargue el SDK de Android automáticamente.
> Al abrirlo por primera vez, instale el SDK sugerido (API 34).

#### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar API Key de Gemini
cp .env.example .env.local
# Editar .env.local → agregar GEMINI_API_KEY=AIza...
# Obtener clave en: https://aistudio.google.com/app/apikey

# 3. Compilar la web
npm run build

# 4. Inicializar Capacitor (solo la primera vez)
npx cap init SecurDrive com.securdrive.app --web-dir dist
npx cap add android

# 5. Sincronizar web → Android
npx cap sync android

# 6. OPCIÓN A: Abrir en Android Studio y compilar desde ahí
npx cap open android

# 6. OPCIÓN B: Compilar APK desde terminal
cd android
./gradlew assembleDebug        # Linux/Mac
gradlew.bat assembleDebug      # Windows
cd ..
```

#### APK resultante
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📲 Instalar en el teléfono

### Método 1 — Cable USB
```bash
# Habilitar "Opciones de desarrollador" y "Depuración USB" en el teléfono
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Método 2 — Transferencia directa
1. Copie el APK al teléfono (WhatsApp, correo, USB, Google Drive)
2. Abra el archivo desde el teléfono
3. Acepte instalar desde fuentes desconocidas si se solicita

---

## 🌐 Alternativa — PWA instalable (sin compilar)

Si no quiere compilar una APK, puede instalar la app directamente desde el navegador:

1. Suba los archivos de `/dist` a cualquier hosting (Vercel, Netlify, GitHub Pages)
2. Abra la URL en Chrome Android
3. Aparecerá un banner **"Añadir a pantalla de inicio"**
4. La app se instala como una aplicación nativa

```bash
# Build para PWA/hosting
npm run build
# Suba la carpeta /dist a su servidor
```

---

## ⚙️ Configuración

### Variables de entorno (.env.local)
```env
# Clave de Google Gemini AI (para escaneo OCR de placas)
GEMINI_API_KEY=AIzaSy...
```

### Permisos Android
El archivo `capacitor.config.ts` ya configura los permisos necesarios.
El `AndroidManifest.xml` generado por Capacitor incluirá:
- `CAMERA` — Para escanear placas
- `INTERNET` — Para llamar a la API de Gemini
- `WRITE_EXTERNAL_STORAGE` — Para guardar PDFs

---

## 🏗️ Estructura del proyecto

```
securdrive-android/
├── src/
│   ├── App.tsx                 # Componente principal
│   ├── db.ts                   # Base de datos IndexedDB (Dexie)
│   ├── main.tsx                # Punto de entrada React
│   ├── index.css               # Estilos + Tailwind
│   └── services/
│       ├── geminiService.ts    # OCR con Google Gemini AI
│       └── pdfService.ts       # Generación PDF + WhatsApp
├── public/
│   ├── manifest.json           # Manifiesto PWA
│   ├── sw.js                   # Service Worker (offline)
│   ├── favicon.svg
│   └── icons/                  # Íconos PNG (72-512px)
├── android/                    # Proyecto Android (generado por Capacitor)
├── dist/                       # Build web (generado por Vite)
├── capacitor.config.ts         # Configuración Capacitor
├── vite.config.ts
├── package.json
├── build-android.sh            # Script build Linux/Mac
├── build-android.bat           # Script build Windows
└── .env.example                # Plantilla variables de entorno
```

---

## ✨ Características

| Característica | Descripción |
|----------------|-------------|
| 📷 OCR de placas | Google Gemini AI detecta la placa automáticamente |
| 💾 Offline first | Datos en IndexedDB, funciona sin internet |
| 📄 Reportes PDF | Genera PDF profesional con jsPDF |
| 💬 WhatsApp | Comparte el reporte con un toque |
| 🌙 Turno día/noche | Gestión de turnos de vigilancia |
| 🔦 Linterna | Control de flash en el escáner |
| 📱 APK nativa | Empaquetado con Capacitor para Android |

---

## 🐛 Solución de problemas

**"SDK location not found"**
→ Abra Android Studio al menos una vez y deje que instale el SDK.
→ O cree el archivo `android/local.properties`:
```
sdk.dir=/Users/TU_USUARIO/Library/Android/sdk    # Mac
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk  # Windows
sdk.dir=/home/TU_USUARIO/Android/Sdk              # Linux
```

**"JAVA_HOME not set"**
→ Instale JDK 17 y configure JAVA_HOME en sus variables de entorno.

**La cámara no funciona en producción**
→ Asegúrese de que la API Key de Gemini esté configurada correctamente en `.env.local`.

**"No se detectó placa"**
→ Mejore la iluminación, use la linterna, o ingrésela manualmente.

---

Desarrollado con React 19 + Vite 6 + Capacitor 6 + Tailwind CSS 4 + Google Gemini AI
