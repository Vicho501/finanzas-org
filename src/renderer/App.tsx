import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Cuentas from './pages/Cuentas'
import Movimientos from './pages/Movimientos'
import Reportes from './pages/Reportes'
import Categorias from './pages/Categorias'
import Configuracion from './pages/Configuracion'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="cuentas"       element={<Cuentas />} />
        <Route path="movimientos"   element={<Movimientos />} />
        <Route path="reportes"      element={<Reportes />} />
        <Route path="categorias"    element={<Categorias />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}
