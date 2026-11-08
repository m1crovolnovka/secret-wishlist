/** Shrink photos in the browser before upload — biggest win for Mini App latency. */
export async function compressImageFile(file, { maxEdge = 1024, quality = 0.68 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file

  // Already small enough — skip canvas work
  if (file.type === 'image/jpeg' && file.size <= 280_000) return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  // Prefer OffscreenCanvas when available (doesn't block UI paint as hard)
  let blob
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  } else {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob) return file
  // If compression somehow grew the file, keep the original
  if (blob.size >= file.size && file.type === 'image/jpeg') return file
  const name = (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
}
