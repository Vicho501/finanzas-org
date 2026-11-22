import { useEffect, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { EVENTO_CONFIG } from '../utils/eventos'

const navItems = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/cuentas',       icon: '🏦', label: 'Cuentas' },
  { to: '/movimientos',   icon: '↕️',  label: 'Movimientos' },
  { to: '/reportes',      icon: '📋', label: 'Reportes' },
  { to: '/categorias',    icon: '🏷️',  label: 'Categorías' },
  { to: '/configuracion', icon: '⚙️',  label: 'Configuración' },
]

export default function Layout() {
  const [organizacion, setOrganizacion] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    const cargar = () => window.api.getConfig('nombre_organizacion').then(n => setOrganizacion(n ?? ''))
    cargar()
    window.api.getSistemaInfo().then(i => setVersion(i.version)).catch(() => {})
    window.addEventListener(EVENTO_CONFIG, cargar)
    return () => window.removeEventListener(EVENTO_CONFIG, cargar)
  }, [])

  return (
    <div className="flex h-full bg-surface-100">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-surface-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              F
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">FinanzasOrg</p>
              <p className="text-xs text-gray-400 truncate" title={organizacion}>{organizacion || 'Gestión financiera'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ` +
                (isActive
                  ? 'bg-primary-50 text-primary-800 font-medium'
                  : 'text-gray-600 hover:bg-surface-100 hover:text-gray-900')
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-5 py-4 border-t border-surface-200">
          <p className="text-xs text-gray-400">{version ? `v${version} · ` : ''}datos locales</p>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
