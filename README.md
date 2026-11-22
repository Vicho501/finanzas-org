# FinanzasOrg

Sistema de gestión financiera para organizaciones. App desktop local construida con Electron + React + SQLite.

## Características

- Registro manual de ingresos y egresos por cuenta bancaria
- Gestión de múltiples cuentas bancarias
- Categorización de movimientos
- Reportes mensuales exportables a PDF y Excel
- Funciona 100% local, sin conexión a internet

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
│   └── renderer/          # Interfaz de usuario (React)
│       ├── components/    # Componentes reutilizables
│       ├── pages/         # Pantallas de la app
│       ├── hooks/         # Custom hooks
│       ├── utils/         # Funciones utilitarias
│       └── styles/        # Estilos globales
├── public/                # Recursos estáticos
├── docs/                  # Documentación del proyecto
└── package.json
```

## Fases de desarrollo

- [x] Fase 1: Configuración base (Electron + SQLite + navegación)
- [x] Fase 2: Cuentas y movimientos (CRUD completo)
- [x] Fase 3: Dashboard y categorías
- [x] Fase 4: Reportes y exportación
- [ ] Fase 5: Pulido y distribución

## Cómo ejecutar

```bash
npm install
npm run dev
```

> `npm install` ejecuta `electron-builder install-app-deps` (postinstall), que descarga el
> binario de `better-sqlite3` compilado para Electron. Si la instalación falla compilando
> `better-sqlite3` para Node, usa `npm install --ignore-scripts` y luego
> `npx electron-builder install-app-deps`.

Build de producción (instalador en `release/`):

```bash
npm run build
```
