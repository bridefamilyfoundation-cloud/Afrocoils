import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Directory, Filesystem } from '@capacitor/filesystem'

/**
 * User photos for their own styles.
 *
 * The profile document stores filenames, never image bytes. It is read
 * whole on launch and rewritten on every edit, so a handful of base64
 * photos inside it would turn a 2 KB read into a multi-megabyte one and
 * would eventually exceed what Android's SharedPreferences will hold.
 * The bytes live here, on disk, under `Directory.Data` — private to the
 * app, excluded from media scanners, and removed when the app is
 * uninstalled.
 *
 * The same code path works in `npm run dev`: the Filesystem plugin falls
 * back to IndexedDB in the browser. Only the step that turns a stored
 * file into something an `<img>` can display differs, because
 * `convertFileSrc` has no meaning outside the native WebView.
 */

const DIR = Directory.Data
const FOLDER = 'style-photos'

/**
 * Long edge in pixels.
 *
 * These are thumbnails on a card and a full-bleed image on a phone; a
 * 12 MP original would cost several megabytes each for no visible gain,
 * and the write is synchronous enough to be felt.
 */
const MAX_EDGE = 1400
const QUALITY = 80

export type PhotoSource = 'camera' | 'gallery'

export class PhotoError extends Error {
  /** True when the user simply backed out of the picker. */
  readonly cancelled: boolean
  constructor(message: string, cancelled = false) {
    super(message)
    this.name = 'PhotoError'
    this.cancelled = cancelled
  }
}

/** Cancelling the native picker rejects; it is not a failure worth reporting. */
function isCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error)
  return (
    message.includes('cancel') ||
    message.includes('no image picked') ||
    message.includes('user denied')
  )
}

async function ensureFolder(): Promise<void> {
  try {
    await Filesystem.mkdir({ path: FOLDER, directory: DIR, recursive: true })
  } catch {
    // Already exists. The plugin has no "create if missing" flag, and
    // distinguishing that from a real failure costs a second round trip
    // for no benefit — a genuine problem surfaces on the write below.
  }
}

function newFilename(): string {
  return `${FOLDER}/photo-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpeg`
}

/**
 * Take or pick a photo and store it.
 *
 * Returns the stored filename to put in `MyStyle.photos`. Throws a
 * `PhotoError` with `cancelled: true` when the user backed out, which
 * callers should swallow rather than show as an error.
 */
export async function capturePhoto(source: PhotoSource): Promise<string> {
  let base64: string | undefined
  try {
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Base64,
      quality: QUALITY,
      // Maximum dimensions, not a crop box — the plugin preserves the
      // aspect ratio and fits the image inside them. That matters here:
      // a hair photo cropped to a square loses the ends, which is the
      // part the user was photographing.
      width: MAX_EDGE,
      height: MAX_EDGE,
      correctOrientation: true,
      allowEditing: false,
    })
    base64 = photo.base64String
  } catch (error) {
    if (isCancellation(error)) throw new PhotoError('Cancelled', true)
    throw new PhotoError(
      source === 'camera'
        ? 'Could not open the camera. Check the app has camera permission.'
        : 'Could not open your photos. Check the app has photo permission.',
    )
  }

  if (!base64) throw new PhotoError('The photo came back empty. Try again.')

  return storeBase64(base64)
}

/** Write base64 JPEG bytes into the photo store and return the filename. */
async function storeBase64(base64: string): Promise<string> {
  await ensureFolder()
  const path = newFilename()
  try {
    await Filesystem.writeFile({ path, data: base64, directory: DIR, recursive: true })
  } catch {
    throw new PhotoError('Could not save the photo. Your device may be out of space.')
  }
  return path
}

/**
 * Read a stored photo back as base64, for sending with a community
 * submission — the one thing in this app that puts a photo on the wire,
 * and only ever one the user chose to contribute.
 *
 * Distinct from `photoSrc`, which returns something an `<img>` can load
 * and on native deliberately never passes the bytes through JavaScript.
 * Here the bytes are the point, so both platforms take the same path.
 *
 * Returns undefined for a file that is gone, which is the same
 * not-an-error `photoSrc` treats it as.
 */
export async function readPhotoBase64(path: string): Promise<string | undefined> {
  try {
    const { data } = await Filesystem.readFile({ path, directory: DIR })
    // The plugin resolves to a base64 string unless an encoding was
    // requested, which it is not here.
    return typeof data === 'string' && data.length > 0 ? data : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolve a stored filename to something an `<img>` can load.
 *
 * Native gets a `capacitor://` URL the WebView can stream, so the bytes
 * never pass through JavaScript. The browser has no such URL, so the web
 * path reads the file back as a data URI — correct, and acceptable
 * because it only ever runs during development.
 *
 * Results are cached: this is called on every render of every card, and
 * both branches are async filesystem work.
 */
const srcCache = new Map<string, string>()

export async function photoSrc(path: string): Promise<string | undefined> {
  const cached = srcCache.get(path)
  if (cached) return cached

  try {
    if (Capacitor.isNativePlatform()) {
      const { uri } = await Filesystem.getUri({ path, directory: DIR })
      const src = Capacitor.convertFileSrc(uri)
      srcCache.set(path, src)
      return src
    }

    const { data } = await Filesystem.readFile({ path, directory: DIR })
    // On web the plugin resolves to a base64 string; the Blob branch only
    // occurs when an encoding was requested, which it is not here.
    const base64 = typeof data === 'string' ? data : ''
    if (!base64) return undefined
    const src = `data:image/jpeg;base64,${base64}`
    srcCache.set(path, src)
    return src
  } catch {
    // A missing file is expected after the OS clears app data, or if a
    // profile was restored onto a device that never had the images.
    return undefined
  }
}

/** Remove a stored photo. Safe to call for a file that is already gone. */
export async function deletePhoto(path: string): Promise<void> {
  srcCache.delete(path)
  try {
    await Filesystem.deleteFile({ path, directory: DIR })
  } catch {
    // Nothing to delete, which is the state the caller wanted anyway.
  }
}

/**
 * Whether picking photos is available at all.
 *
 * False in a desktop browser without the plugin's web shim, where the
 * UI should not offer a button that cannot work.
 */
export function photosAvailable(): boolean {
  return Capacitor.isPluginAvailable('Camera')
}
