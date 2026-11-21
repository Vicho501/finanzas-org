# Plan de Sistema — FinanzasOrg

## Modelo de datos (SQLite)

### Tabla: cuenta_bancaria
| Campo | Tipo | Notas |
|-------|------|-------|
| id | INTEGER PK | Autoincremental |
| nombre | TEXT | Nombre descriptivo |
| banco | TEXT | Nombre del banco |
| tipo | TEXT | corriente / ahorro / vista |
| moneda | TEXT | CLP, USD, etc. |
| saldo_inicial | REAL | Al momento de crear |
| activa | INTEGER | 1 = activa, 0 = archivada |
| creada_en | TEXT | Timestamp ISO |

### Tabla: categoria
| Campo | Tipo | Notas |
|-------|------|-------|
| id | INTEGER PK | |
| nombre | TEXT | |
| tipo | TEXT | ingreso / egreso / ambos |
| color | TEXT | Hex color |
| icono | TEXT | Emoji o nombre de icono |
| activa | INTEGER | |

### Tabla: movimiento
| Campo | Tipo | Notas |
|-------|------|-------|
| id | INTEGER PK | |
| cuenta_id | INTEGER FK | → cuenta_bancaria |
| tipo | TEXT | ingreso / egreso |
| monto | REAL | Siempre positivo |
| fecha | TEXT | YYYY-MM-DD |
| descripcion | TEXT | Opcional |
| categoria_id | INTEGER FK | → categoria |
| creado_en | TEXT | Timestamp ISO |

> **Regla clave:** El saldo de una cuenta = saldo_inicial + SUM(ingresos) - SUM(egresos).
> Nunca se guarda el saldo directamente.

### Tabla: reporte_generado
| Campo | Tipo | Notas |
|-------|------|-------|
| id | INTEGER PK | |
| mes | INTEGER | 1–12 |
| año | INTEGER | |
| generado_en | TEXT | Timestamp ISO |
| ruta_archivo | TEXT | Ruta local del PDF/Excel |

### Tabla: configuracion
| Campo | Tipo | Notas |
|-------|------|-------|
| clave | TEXT PK | |
| valor | TEXT | |

**Claves de configuración:**
- `nombre_organizacion`
- `moneda_base`
- `tema` (light / dark)

## Pantallas

1. **Dashboard** — resumen del mes actual, saldos por cuenta, gráfico ingresos vs egresos
2. **Cuentas** — lista de cuentas con saldo calculado
3. **Movimientos** — tabla filtrable de todos los movimientos
4. **Nuevo movimiento** — formulario de ingreso
5. **Reporte mensual** — generación y exportación
6. **Categorías** — gestión de categorías personalizadas
7. **Configuración** — ajustes generales

## Decisiones pendientes

- [ ] ¿Soporte múltiples monedas?
- [ ] ¿Transferencias entre cuentas?
- [ ] ¿Backup automático?
- [ ] ¿Contraseña de acceso?
- [ ] ¿Bloqueo de edición en meses cerrados?
