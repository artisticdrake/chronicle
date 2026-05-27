import { useState, useEffect, useCallback } from 'react'

export function useApi<T>(url: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doFetch = useCallback(() => {
    if (!url) return
    setLoading(true)
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<T>
      })
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [url])

  useEffect(() => {
    doFetch()
    if (refreshMs) {
      const id = setInterval(doFetch, refreshMs)
      return () => clearInterval(id)
    }
  }, [doFetch, refreshMs])

  return { data, loading, error, refetch: doFetch }
}
