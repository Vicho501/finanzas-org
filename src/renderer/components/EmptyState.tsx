interface EmptyStateProps {
  icono: string
  titulo: string
  descripcion: string
  accion?: React.ReactNode
}

export default function EmptyState({ icono, titulo, descripcion, accion }: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <div className="text-5xl mb-4">{icono}</div>
      <h3 className="font-medium text-gray-700 text-base mb-1">{titulo}</h3>
      <p className="text-sm text-gray-400 mb-5">{descripcion}</p>
      {accion}
    </div>
  )
}
