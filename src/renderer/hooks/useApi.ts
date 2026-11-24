import { useState, useEffect, useCallback } from 'react'
import { EVENTO_DATOS } from '../utils/eventos'

// Hook genérico para llamadas a la API.
// Vuelve a cargar solo cuando otra parte de la app avisa que cambiaron los datos.
export function useApi<T>(
  fn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (e: any) {
      setError(e?.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const recargar = () => load(true)
    window.addEventListener(EVENTO_DATOS, recargar)
    return () => window.removeEventListener(EVENTO_DATOS, recargar)
  }, [load])

  return { data, loading, error, reload: () => load(true) }
}
