export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label="Cargando">
      <div className="w-8 h-8 border-[3px] border-surface-200 border-t-primary-700 rounded-full animate-spin" />
    </div>
  )
}
