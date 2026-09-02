# 🎙️ Bitácora Hablada Enterprise & Personal (v2.0.0)

Una aplicación web progresiva (**PWA**) de alta fidelidad diseñada para la captura, dictado por voz, organización por departamentos y generación de reportes institucionales con respaldo en la nube (**Firebase Firestore & Authentication**) y almacenamiento local offline-first.

---

## ✨ Características Principales

### 🎙️ Captura y Accesibilidad por Voz
- **Dictado por Voz en Tiempo Real**: Transcripción rápida mediante `SpeechRecognition` nativo con detección de pausas y puntuación.
- **Lectura en Voz Alta (TTS)**: Síntesis de voz fluida (`SpeechSynthesis`) con selector de voces en español y acentos latinoamericanos.
- **Guardado Automático (Autosave)**: Guardado en caliente con debounce sin riesgo de pérdida de datos.

### 🏢 Workspaces Duales (Personal e Institucional)
- **Modo Personal**: Notas privadas, recordatorios, listas y carpetas individuales almacenadas en tu perfil privado `/users/{uid}/notes`.
- **Modo Institucional / Enterprise**: Espacio colaborativo multitenant por dominio organizacional (`@institucion.gob.cl`, `@empresa.com`).
  - Asignación de departamentos y folios automáticos (`ACT-2026-0001`, `OPE-2026-0001`, etc.).
  - Gestión de prioridades (`Baja`, `Media`, `Alta`, `Urgente`) y estados (`Borrador`, `En Proceso`, `Revisado`, `Finalizado`).
  - Asignación de responsables y seguimiento de plazos con selector de fecha de vencimiento.
  - Membrete oficial personalizable (Logo, Organismo, Departamento, Ciudad/Región).
  - Impresión formal y exportación a PDF con formato institucional estandarizado.

### ☁️ Sincronización y Seguridad en la Nube (Firebase Firestore)
- **Autenticación Segura**: Inicio de sesión mediante Google Popup y correo electrónico con contraseña.
- **Verificación de Correo Obrigatoria**: Validación de dominio institucional (`email_verified == true`) para el acceso y lectura/escritura en la colección `/reports`.
- **Papelera "Soft-Delete" Recuperable**: Las notas eliminadas se marcan con `isTrash: true` en Firestore y permanecen recuperables durante 30 días en cualquier dispositivo, borrándose definitivamente solo al vaciar la papelera.
- **Escrituras Atómicas Optimizadas**: Actualizaciones quirúrgicas por documento (`persistSingleNote`) para máximo rendimiento y ahorro de cuota.
- **Configuración Organizacional Compartida**: Los departamentos, miembros de equipo y membretes se sincronizan a nivel de dominio (`/orgs/{orgDomain}/config`).

### 📱 PWA & Modo Offline
- Instalable como aplicación nativa en Android, iOS, Windows y macOS.
- **Service Worker con Caché Inteligente**: Acceso garantizado a la interfaz y notas en memoria local incluso sin conexión a internet.
- **Respaldo Integral**: Exportación e importación completa en formato JSON.

---

## 📂 Arquitectura Modular

```text
bitacora-hablada/
├── index.html              # Estructura principal de la app y modales
├── vite.config.js          # Configuración de compilación Vite y PWA
├── firestore.rules         # Reglas de seguridad multitenant y validaciones estrictas
├── src/
│   ├── main.js             # Punto de entrada y orquestador principal
│   ├── auth.js             # Gestión de autenticación, sesiones y perfil
│   ├── firebase.js         # Inicialización SDK, detección segura de dominios y errores
│   ├── notes.js            # Lógica de notas, dictado, persistencia y filtros
│   ├── folders.js          # Gestión y sincronización de carpetas y departamentos
│   ├── trash.js            # Papelera recuperable (soft-delete y purga definitiva)
│   ├── print.js            # Modal de membrete oficial, equipo e impresión formal
│   ├── speech.js           # Reconocimiento de voz y síntesis auditiva
│   ├── state.js            # Estado global reactivo y helpers
│   ├── constants.js        # Constantes, plantillas institucionales y defaults
│   ├── dom.js              # Mapeo de elementos del DOM
│   └── style.css           # Estilos editorial Tailwind CSS, temas claro/oscuro
├── public/
│   ├── manifest.json       # Manifiesto PWA para instalación
│   ├── sw.js               # Service Worker offline
│   ├── icon-192.png        # Icono de la app (192x192)
│   └── icon-512.png        # Icono de la app (512x512)
└── package.json            # Metadatos del proyecto y dependencias
```

---

## 🚀 Instalación y Despliegue

### 1. Clonar el repositorio
```bash
git clone https://github.com/Yeremy-B/BITACORA-HABLADA-2.0.git
cd BITACORA-HABLADA-2.0
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el entorno de desarrollo
```bash
npm run dev
```
Abre en tu navegador `http://localhost:3000`.

### 4. Compilar para Producción
```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/`, listos para producción o despliegue en Google Cloud Run, Firebase Hosting, Vercel o Netlify.

---

## 🔒 Privacidad y Control de Acceso

- **Aislamiento Multitenant**: Las notas personales se encuentran restringidas estrictamente al usuario creador (`/users/{uid}/notes`). Los reportes institucionales (`/reports`) solo son legibles y editables por miembros con el mismo dominio de correo verificado (`@institucion.gob.cl`).
- **Seguridad en Reglas de Firestore**: Se aplican restricciones en el tamaño de cadenas de texto, validación de tipos, listas de tags y verificación de identidad en cada llamada de lectura y escritura.

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia [MIT](LICENSE).

