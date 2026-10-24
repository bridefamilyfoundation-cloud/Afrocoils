/**
 * The security check every submitted photograph passes before a byte of
 * it reaches the bucket.
 *
 * Checking the first three bytes says a file *starts* like a JPEG, and
 * nothing about the rest of it. A script, an HTML page or a whole zip can
 * ride inside a JPEG's comment and metadata segments, or after its end
 * marker, and the file still opens as a picture. So this walks the file
 * segment by segment, as a decoder would, and:
 *
 * - **refuses** anything that is not a well-formed baseline or
 *   progressive JPEG, anything whose dimensions are absurd (a
 *   decompression bomb is a small file that claims a huge picture), and
 *   anything carrying markup, script or an executable's signature in
 *   the places a payload hides;
 * - **rebuilds** the file from the image data alone — the tables, the
 *   frame and the scans — and drops every other segment and anything
 *   past the end marker. What is stored is the rebuilt file, never the
 *   one that arrived, so whatever the checks above did not think of is
 *   still not in the bucket.
 *
 * Rebuilding also strips EXIF, which on a phone photo carries the GPS
 * position it was taken at and the device model. A reviewer needs the
 * picture, not where somebody lives. `capturePhoto()` already corrects
 * orientation into the pixels, so the EXIF orientation tag is not missed.
 *
 * Pure and dependency-free (web crypto only), so it runs the same in the
 * Edge Function and under `tsc -b` with the app.
 */

/** Larger than any phone sensor; `capturePhoto()` sends 1400px at most. */
const MAX_EDGE_PX = 8000
/** Pixel budget. A 4 MB file claiming more than this is a bomb, not a photo. */
const MAX_PIXELS = 40_000_000
/** Smaller than this is not a photograph a reviewer could judge a style from. */
const MIN_EDGE_PX = 32

/** Segments kept besides the image data: JFIF, ICC colour profile, Adobe colour transform. */
const KEEP_APP = new Set([0xe0, 0xe2, 0xee])

/**
 * What a payload looks like in a place a picture never puts text.
 * Matched case-insensitively against metadata, comments and trailing
 * bytes — not the compressed scan data, where any byte sequence can
 * occur by chance. Four characters or more: metadata can hold binary
 * (an EXIF thumbnail is a whole second JPEG), and a two- or three-byte
 * pattern turns up in tens of kilobytes of that by accident.
 */
const HOSTILE_TEXT = [
  '<script',
  '<?php',
  '<html',
  '<svg',
  '<iframe',
  '<object',
  '<embed',
  'javascript:',
  'vbscript:',
  'onerror=',
  'onload=',
  '#!/bin',
  '#!/usr',
  'eval(',
  'base64_decode',
]

/** File signatures that mean a second file is hiding after the picture. */
const HOSTILE_MAGIC: number[][] = [
  [0x4d, 0x5a], // MZ — Windows executable
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0x50, 0x4b, 0x03, 0x04], // zip, jar, apk, docx
  [0x52, 0x61, 0x72, 0x21], // Rar!
  [0x25, 0x50, 0x44, 0x46], // %PDF
  [0x37, 0x7a, 0xbc, 0xaf], // 7z
  [0x1f, 0x8b], // gzip
  [0xca, 0xfe, 0xba, 0xbe], // Java class / Mach-O fat
  [0x64, 0x65, 0x78, 0x0a], // dex\n — Android bytecode
]

export type ScanVerdict =
  | {
      ok: true
      /** The rebuilt file: image data only. Store this, not the input. */
      bytes: Uint8Array
      width: number
      height: number
      /** Hex SHA-256 of `bytes`, for the log line. */
      sha256: string
      /** How many bytes of metadata, comments and trailer were dropped. */
      stripped: number
    }
  | { ok: false; reason: string }

const refuse = (reason: string): ScanVerdict => ({ ok: false, reason })

function containsHostileText(bytes: Uint8Array): string | undefined {
  if (bytes.length === 0) return undefined
  // Latin-1 so every byte maps to one character and offsets line up.
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  text = text.toLowerCase()
  return HOSTILE_TEXT.find((needle) => text.includes(needle))
}

function startsWithMagic(bytes: Uint8Array): boolean {
  // Padding before an appended file is common; look past zeros and 0xFF fill.
  let i = 0
  while (i < bytes.length && (bytes[i] === 0x00 || bytes[i] === 0xff)) i++
  return HOSTILE_MAGIC.some((magic) => magic.every((b, k) => bytes[i + k] === b))
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Index just past one scan's entropy-coded data: the next real marker.
 * Inside a scan 0xFF is followed by 0x00 (a stuffed byte) or a restart
 * marker; anything else ends the scan.
 */
function endOfScan(bytes: Uint8Array, from: number): number {
  let i = from
  while (i < bytes.length - 1) {
    if (bytes[i] === 0xff) {
      const next = bytes[i + 1]!
      if (next === 0x00 || (next >= 0xd0 && next <= 0xd7) || next === 0xff) {
        i += next === 0xff ? 1 : 2
        continue
      }
      return i
    }
    i++
  }
  return bytes.length
}

export async function scanJpeg(input: Uint8Array): Promise<ScanVerdict> {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return refuse('not a JPEG')

  const kept: Uint8Array[] = [input.subarray(0, 2)]
  let i = 2
  let frame: { width: number; height: number } | undefined
  let scans = 0
  let stripped = 0

  for (;;) {
    if (i >= input.length) return refuse('truncated: no end-of-image marker')
    if (input[i] !== 0xff) return refuse(`garbage between segments at byte ${i}`)
    // Fill bytes before a marker are legal; collapse them.
    while (input[i] === 0xff && i < input.length) i++
    const marker = input[i]
    if (marker === undefined) return refuse('truncated marker')
    const markerAt = i - 1
    i++

    if (marker === 0xd9) {
      // End of image.
      if (!frame || scans === 0) return refuse('no image data before end marker')
      kept.push(new Uint8Array([0xff, 0xd9]))
      const trailer = input.subarray(i)
      if (trailer.length > 0) {
        if (startsWithMagic(trailer)) return refuse('another file appended after the image')
        const text = containsHostileText(trailer)
        if (text) return refuse(`"${text}" after the image`)
        stripped += trailer.length
      }
      break
    }

    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      return refuse(`marker 0x${marker.toString(16)} outside a scan`)
    }
    if (marker === 0x01) {
      // TEM: standalone, no length. Harmless and dropped.
      continue
    }

    if (i + 2 > input.length) return refuse('truncated segment length')
    const length = (input[i]! << 8) | input[i + 1]!
    if (length < 2 || i + length > input.length) return refuse('segment runs past the end of the file')
    const segment = input.subarray(markerAt, i + length)
    const payload = input.subarray(i + 2, i + length)
    i += length

    // Application segments and comments: where metadata, and payloads, live.
    if ((marker >= 0xe0 && marker <= 0xef) || marker === 0xfe) {
      const text = containsHostileText(payload)
      if (text) return refuse(`"${text}" inside image metadata`)
      if (startsWithMagic(payload) && marker !== 0xe2) return refuse('a file embedded in image metadata')
      const keep =
        KEEP_APP.has(marker) &&
        // APP2 is only kept when it is a colour profile, not FlashPix or MPF.
        (marker !== 0xe2 || String.fromCharCode(...payload.subarray(0, 11)) === 'ICC_PROFILE')
      if (keep) kept.push(segment)
      else stripped += segment.length
      continue
    }

    // Frame header. Baseline, extended and progressive Huffman only — the
    // encodings every phone writes and every decoder agrees on.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (marker !== 0xc0 && marker !== 0xc1 && marker !== 0xc2) {
        return refuse(`unsupported JPEG encoding 0x${marker.toString(16)}`)
      }
      if (frame) return refuse('more than one frame')
      if (payload.length < 6) return refuse('short frame header')
      const precision = payload[0]
      const height = (payload[1]! << 8) | payload[2]!
      const width = (payload[3]! << 8) | payload[4]!
      const components = payload[5]!
      if (precision !== 8) return refuse(`${precision}-bit samples`)
      if (components !== 1 && components !== 3) return refuse(`${components} colour components`)
      if (payload.length !== 6 + components * 3) return refuse('frame header length mismatch')
      if (width < MIN_EDGE_PX || height < MIN_EDGE_PX) return refuse(`too small (${width}x${height})`)
      if (width > MAX_EDGE_PX || height > MAX_EDGE_PX || width * height > MAX_PIXELS) {
        return refuse(`too large (${width}x${height})`)
      }
      frame = { width, height }
      kept.push(segment)
      continue
    }

    // Start of scan: the header, then entropy-coded data up to the next marker.
    if (marker === 0xda) {
      if (!frame) return refuse('scan before frame header')
      const end = endOfScan(input, i)
      kept.push(segment, input.subarray(i, end))
      i = end
      scans++
      if (scans > 64) return refuse('too many scans')
      continue
    }

    // Tables and restart interval: DHT, DQT, DRI, DNL.
    if (marker === 0xc4 || marker === 0xdb || marker === 0xdd || marker === 0xdc) {
      kept.push(segment)
      continue
    }

    // Anything else (DAC, hierarchical markers, reserved) has no place in a phone photo.
    return refuse(`unexpected marker 0x${marker.toString(16)}`)
  }

  const bytes = concat(kept)
  return {
    ok: true,
    bytes,
    width: frame!.width,
    height: frame!.height,
    sha256: await sha256Hex(bytes),
    stripped,
  }
}
