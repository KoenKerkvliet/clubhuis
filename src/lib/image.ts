const DEFAULT_MAX_DIMENSION = 700
const DEFAULT_QUALITY = 0.7

/** Comprimeert een foto naar WebP en schaalt 'm terug tot maxDimension, zodat de Supabase
 * storage-cap niet snel vol raakt met onbewerkte camera-foto's. */
export async function resizeImageToWebp(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY,
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas niet beschikbaar')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('Comprimeren van de foto lukte niet')

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], name, { type: 'image/webp' })
}
