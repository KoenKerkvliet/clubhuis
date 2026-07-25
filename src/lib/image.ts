const DEFAULT_MAX_DIMENSION = 700
const DEFAULT_QUALITY = 0.7

// Een vaste kwaliteitswaarde is geen garantie: een foto met veel fijne textuur (korrel,
// steenachtige of gevlekte oppervlakken) comprimeert veel minder goed dan een gladde foto
// en kan bij dezelfde instelling een veelvoud aan bestandsgrootte opleveren. Daarom knijpen
// we net zo lang verder tot de foto onder de streefgrootte zit, in plaats van blind op één
// kwaliteitswaarde te vertrouwen.
const DEFAULT_TARGET_BYTES = 300 * 1024
const MIN_QUALITY = 0.35
const QUALITY_STEP = 0.15

/** Comprimeert een foto naar WebP en schaalt 'm terug tot maxDimension, zodat de Supabase
 * storage-cap niet snel vol raakt met onbewerkte camera-foto's. */
export async function resizeImageToWebp(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY,
  targetBytes = DEFAULT_TARGET_BYTES,
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

  let currentQuality = quality
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', currentQuality))
  while (blob && blob.size > targetBytes && currentQuality > MIN_QUALITY) {
    currentQuality = Math.max(MIN_QUALITY, currentQuality - QUALITY_STEP)
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', currentQuality))
  }
  if (!blob) throw new Error('Comprimeren van de foto lukte niet')

  const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], name, { type: 'image/webp' })
}
