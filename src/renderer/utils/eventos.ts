export const EVENTO_CONFIG = 'finanzas:config-cambiada'
/** Se emite cuando cambian cuentas, movimientos o categorías: las páginas abiertas recargan sus datos. */
export const EVENTO_DATOS = 'finanzas:datos-cambiados'

export function avisarCambioDatos() {
  window.dispatchEvent(new Event(EVENTO_DATOS))
}
