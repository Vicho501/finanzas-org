import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { UIProvider } from './components/UI'
// Fuente empaquetada localmente: la app funciona sin conexión
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <UIProvider>
        <App />
      </UIProvider>
    </HashRouter>
  </React.StrictMode>
)
