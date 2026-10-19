import { useEffect, useState } from 'react'
import { photoSrc } from '../lib/photos'
import Icon from './Icon'

/**
 * A photo the user took, resolved from its stored filename.
 *
 * Resolution is asynchronous on both platforms — native has to ask the
 * Filesystem plugin for a URI it can convert, and the browser has to read
 * the bytes back out of IndexedDB — so the component holds a loading
 * state rather than the caller threading promises through its render.
 *
 * A file that will not resolve renders as a missing-photo tile instead of
 * a broken image. That happens for real: the OS clears app data, or a
 * profile is restored onto a device that never held the images.
 */
export default function UserPhoto({
  path,
  alt,
  className = '',
  rounded = 'rounded-lg',
}: {
  path: string
  alt: string
  className?: string
  rounded?: string
}) {
  const [src, setSrc] = useState<string | undefined>()
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    void photoSrc(path).then((resolved) => {
      if (cancelled) return
      setSrc(resolved)
      setState(resolved ? 'ready' : 'missing')
    })
    return () => {
      cancelled = true
    }
  }, [path])

  if (state === 'ready' && src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        // The missing-file case above only catches the browser, where
        // reading the bytes fails outright. On native `getUri` builds a
        // path without checking that anything is at it, so a deleted
        // photo resolves to a perfectly good URL and fails here instead
        // — which rendered the WebView's broken-image glyph on the one
        // platform this component's fallback was written for.
        onError={() => setState('missing')}
        className={`object-cover ${rounded} ${className}`}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={state === 'missing' ? `${alt} (photo unavailable)` : alt}
      className={`flex items-center justify-center bg-surface-container-high ${rounded} ${className}`}
    >
      <Icon
        name={state === 'missing' ? 'image' : 'more_horiz'}
        className={`text-outline/50 ${state === 'loading' ? 'animate-pulse' : ''}`}
      />
    </div>
  )
}
