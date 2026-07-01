import { useEffect, useState } from 'react'
import { fetchCveDetail, type CveDetail } from '../lib/cveDetail'

export function useCveDetail(cveId: string | null) {
  const [detail, setDetail] = useState<CveDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!cveId || !cveId.startsWith('CVE-')) {
      setDetail(null)
      setFailed(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    setDetail(null)
    fetchCveDetail(cveId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setFailed(!d)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [cveId])

  return { detail, loading, failed }
}
