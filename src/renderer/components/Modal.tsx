import { useEffect } from 'react'

interface ModalProps {
  titulo: string
  onClose: () => void
  children: React.ReactNode
  ancho?: string
}

export default function Modal({ titulo, onClose, children, ancho = 'max-w-lg' }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white rounded-xl shadow-xl w-full ${ancho} mx-4 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="font-serif text-lg text-gray-900">{titulo}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-surface-100 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
