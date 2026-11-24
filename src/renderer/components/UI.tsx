import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/* Diálogos de confirmación y avisos breves compartidos por toda la app. */

interface OpcionesConfirmar {
  titulo: string
  mensaje: React.ReactNode
  confirmar: string          // texto del botón: el verbo de lo que va a pasar
  peligro?: boolean
}

type TipoAviso = 'ok' | 'error'
interface Aviso { id: number; texto: string; tipo: TipoAviso }

interface UIContexto {
  confirmar: (op: OpcionesConfirmar) => Promise<boolean>
  avisar: (texto: string, tipo?: TipoAviso) => void
}

const Contexto = createContext<UIContexto | null>(null)

export function useUI(): UIContexto {
  const c = useContext(Contexto)
  if (!c) throw new Error('useUI debe usarse dentro de UIProvider')
  return c
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [pregunta, setPregunta] = useState<(OpcionesConfirmar & { responder: (v: boolean) => void }) | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguienteId = useRef(1)

  const confirmar = useCallback((op: OpcionesConfirmar) =>
    new Promise<boolean>(resolve => setPregunta({ ...op, responder: resolve })), [])

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'ok') => {
    const id = siguienteId.current++
    setAvisos(a => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos(a => a.filter(x => x.id !== id)), tipo === 'error' ? 7000 : 3500)
  }, [])

  function responder(v: boolean) {
    pregunta?.responder(v)
    setPregunta(null)
  }

  return (
    <Contexto.Provider value={{ confirmar, avisar }}>
      {children}

      {pregunta && (
        <Modal titulo={pregunta.titulo} onClose={() => responder(false)} ancho="max-w-md">
          <div className="text-sm text-ink leading-relaxed">{pregunta.mensaje}</div>
          <div className="flex justify-end gap-2 mt-6">
            {/* En acciones peligrosas el foco queda en Cancelar, para que Enter no borre por accidente */}
            <button className="btn-secondary" onClick={() => responder(false)} autoFocus={!!pregunta.peligro}>Cancelar</button>
            <button
              className={pregunta.peligro ? 'btn-danger' : 'btn-primary'}
              onClick={() => responder(true)}
              autoFocus={!pregunta.peligro}
            >{pregunta.confirmar}</button>
          </div>
        </Modal>
      )}

      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {avisos.map(a => (
          <div
            key={a.id}
            role="status"
            className={`pointer-events-auto max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white flex items-start gap-2 ${
              a.tipo === 'ok' ? 'bg-ink' : 'bg-expense'
            }`}
          >
            <span aria-hidden>{a.tipo === 'ok' ? '✓' : '!'}</span>
            <span className="break-words">{a.texto}</span>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

/* ---------- Modal ---------- */

interface ModalProps {
  titulo: string
  descripcion?: string
  onClose: () => void
  children: React.ReactNode
  ancho?: string
}

export function Modal({ titulo, descripcion, onClose, children, ancho = 'max-w-lg' }: ModalProps) {
  const cerrar = useRef(onClose)
  cerrar.current = onClose

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-label={titulo}
        className={`bg-white rounded-2xl shadow-2xl w-full ${ancho} max-h-full flex flex-col overflow-hidden`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-bold text-ink">{titulo}</h2>
            {descripcion && <p className="text-sm text-surface-500 mt-0.5">{descripcion}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 -mr-2 flex items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 hover:text-ink transition-colors text-xl leading-none"
          >×</button>
        </div>
        <div className="px-6 py-5 overflow-auto">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Encabezado de página ---------- */

export function Encabezado({ titulo, descripcion, acciones }: {
  titulo: string
  descripcion?: React.ReactNode
  acciones?: React.ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-6 mb-7">
      <div className="max-w-2xl min-w-0">
        <h1 className="text-2xl font-bold text-ink tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-surface-500 mt-1">{descripcion}</p>}
      </div>
      {acciones && <div className="flex gap-2 flex-shrink-0">{acciones}</div>}
    </header>
  )
}

/* ---------- Mensaje de error de formulario ---------- */

export function ErrorFormulario({ texto }: { texto: string | null }) {
  if (!texto) return null
  return <p role="alert" className="text-sm text-expense bg-expense-light px-3 py-2.5 rounded-lg">{texto}</p>
}

/* ---------- Estado vacío ---------- */

export function EstadoVacio({ icono, titulo, descripcion, accion }: {
  icono: string; titulo: string; descripcion: string; accion?: React.ReactNode
}) {
  return (
    <div className="card px-8 py-12 text-center">
      <div className="text-4xl mb-3" aria-hidden>{icono}</div>
      <h3 className="text-lg font-bold text-ink mb-1">{titulo}</h3>
      <p className="text-sm text-surface-500 mb-5 max-w-md mx-auto">{descripcion}</p>
      {accion}
    </div>
  )
}
