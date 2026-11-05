import { useCallback, useEffect, useState } from 'react'

/** Load on mount and whenever `key` changes; `reload` to fetch again after a write. */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setError(null)
    load()
      .then((value) => live && setData(value))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Failed to load'))
    return () => {
      live = false
    }
    // `load` is a fresh closure each render; `key` and `tick` say when to run it.
  }, [key, tick])

  const reload = useCallback(() => setTick((n) => n + 1), [])
  return { data, error, reload, setError }
}
