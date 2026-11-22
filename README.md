# FinanzasOrg

Sistema de gestión financiera para organizaciones. App desktop local construida con Electron + React + SQLite.

## Características

- Registro manual de ingresos y egresos por cuenta bancaria
- Gestión de múltiples cuentas bancarias
- Categorización de movimientos
- Reportes mensuales exportables a PDF y Excel
- Respaldo automático diario y respaldo/restauración manual
- Funciona 100% local, sin conexión a internet (fuentes incluidas en la app)

## Stack tecnológico

- **Framework:** Electron
- **UI:** React + TypeScript
- **Base de datos:** SQLite (better-sqlite3)
- **Estilos:** Tailwind CSS
- **Reportes PDF:** jsPDF
- **Reportes Excel:** ExcelJS

## Estructura del proyecto

```
finanzas-org/
├── src/
│   ├── main/              # Proceso principal de Electron
│   │   ├── handlers/      # Handlers IPC por módulo
│   │   └── reportes/      # Generación de PDF y Excel
│   └── renderer/          # Interfaz de usuario (React)
│       ├── components/    # Componentes reutilizables
│       ├── pages/         # Pantallas de la app
│       ├── hooks/         # Custom hooks
│       ├── utils/         # Funciones utilitarias
│       └── styles/        # Estilos globales
├── build/                 # Recursos del instalador (ícono)
├── scripts/               # Utilidades (generar ícono)
├── docs/                  # Documentación del proyecto
└── package.json
```

## Fases de desarrollo

- [x] Fase 1: Configuración base (Electron + SQLite + navegación)
- [x] Fase 2: Cuentas y movimientos (CRUD completo)
- [x] Fase 3: Dashboard y categorías
- [x] Fase 4: Reportes y exportación
- [x] Fase 5: Pulido y distribución

## Cómo ejecutar

```bash
npm install
npm run dev
```

> `npm install` ejecuta `electron-builder install-app-deps` (postinstall), que descarga el
> binario de `better-sqlite3` compilado para Electron. Si la instalación falla compilando
> `better-sqlite3` para Node, usa `npm install --ignore-scripts` y luego
> `npx electron-builder install-app-deps`.

## Distribución

```bash
npm run dist       # instalador Windows: release/FinanzasOrg-Setup-<versión>.exe
npm run dist:dir   # solo la app sin instalador (release/win-unpacked), más rápido para probar
```

- El instalador permite elegir la carpeta de instalación y crea accesos directos.
  No está firmado digitalmente, así que Windows SmartScreen mostrará una advertencia
  la primera vez ("Más información" → "Ejecutar de todas formas").
- Los datos del usuario viven en `%APPDATA%FinanzasOrg` (`finanzas.db` y la carpeta
  `respaldos/`). Desinstalar la app **no** borra los datos.
- En modo desarrollo la carpeta de datos es `%APPDATA%inanzas-org`, separada de la app instalada.
- Para cambiar el ícono, edita `scripts/generar-icono.js` y ejecuta `npm run build:icon`.

### Si `npm run dist` falla con "cannot execute ... winCodeSign"

electron-builder descarga `winCodeSign`, un .7z que trae enlaces simbólicos de macOS que
Windows no puede crear sin el Modo de desarrollador. Solución: activar el Modo de
desarrollador de Windows, o extraer el archivo omitiendo esa carpeta:

```bash
cd "$LOCALAPPDATA/electron-builder/Cache/winCodeSign"
<proyecto>/node_modules/7zip-bin/win/x64/7za.exe x <archivo>.7z -o"winCodeSign-2.6.0" '-xr!darwin'
```

### Respaldos

- Al iniciar, la app guarda un respaldo diario en `respaldos/` (conserva los últimos 10).
- Desde **Configuración** se puede crear un respaldo en cualquier carpeta y restaurar
  desde un archivo o desde un respaldo automático. Antes de restaurar se guarda una copia
  de los datos actuales (`finanzas-antes-de-restaurar-*.db`) y la app se reinicia.
