import { useEffect, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { EVENTO_CONFIG } from '../utils/eventos'
import ModalMovimiento from './ModalMovimiento'

const navItems = [
  { to: '/inicio',        icon: '🏠', label: 'Inicio',        ayuda: 'Cuánto dinero hay' },
  { to: '/movimientos',   icon: '↕️', label: 'Movimientos',   ayuda: 'Lo que entra y sale' },
  { to: '/cuentas',       icon: '🏦', label: 'Cuentas',       ayuda: 'Bancos y caja chica' },
  { to: '/reportes',      icon: '📄', label: 'Reportes',      ayuda: 'Resumen mensual en PDF' },
  { to: '/categorias',    icon: '🏷️', label: 'Categorías',    ayuda: 'Tipos de ingreso y gasto' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración', ayuda: 'Nombre y respaldos' },
]

export default function Layout() {
  const [organizacion, setOrganizacion] = useState('')
  const [version, setVersion] = useState('')
  const [registrando, setRegistrando] = useState(false)

  useEffect(() => {
    const cargar = () => window.api.getConfig('nombre_organizacion').then(n => setOrganizacion(n ?? ''))
    cargar()
    window.api.getSistemaInfo().then(i => setVersion(i.version)).catch(() => {})
    window.addEventListener(EVENTO_CONFIG, cargar)
    return () => window.removeEventListener(EVENTO_CONFIG, cargar)
  }, [])

  // Ctrl+N abre el registro de movimiento desde cualquier pantalla
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); setRegistrando(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-full bg-surface-100">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-surface-200 flex flex-col">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-800 rounded-lg flex items-center justify-center text-white text-base font-bold" aria-hidden>
              F
            </div>
            <div className="min-w-0">
              <p className="font-bold text-ink leading-tight line-clamp-2 break-words" title={organizacion}>{organizacion || 'Mi organización'}</p>
              <p className="text-xs text-surface-500">FinanzasOrg</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button className="btn-primary w-full !py-3" onClick={() => setRegistrando(true)} title="Atajo: Ctrl + N">
            <span aria-hidden className="text-lg leading-none">+</span> Registrar movimiento
          </button>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-auto" aria-label="Secciones">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ` +
                (isActive ? 'bg-primary-50 text-primary-900' : 'text-ink hover:bg-surface-100')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-lg w-6 text-center" aria-hidden>{item.icon}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
                    <span className="block text-xs text-surface-500 truncate">{item.ayuda}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-surface-200">
          <p className="text-xs text-surface-500 leading-relaxed">
            Tus datos se guardan solo en este computador.
            {version && <><br />Versión {version}</>}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {registrando && <ModalMovimiento onClose={() => setRegistrando(false)} />}
    </div>
  )
}
