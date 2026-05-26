import { createAdminClient } from './admin'

const BANNER_BUCKET = 'signature-banners'

/**
 * Uploadne obrázek banneru do Supabase Storage a vrátí veřejnou URL.
 * Soubor je pojmenován náhodným UUID + extension.
 */
export async function uploadBannerImage(file: File): Promise<string> {
  const supabase = await createAdminClient()

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${crypto.randomUUID()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BANNER_BUCKET)
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Nepodařilo se nahrát banner: ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage
    .from(BANNER_BUCKET)
    .getPublicUrl(fileName)

  return publicData.publicUrl
}

/**
 * Smaže obrázek banneru ze Storage podle jeho veřejné URL.
 * Pro relativní URL (např. /logo-email.png u seed evergreen banneru) nedělá nic.
 */
export async function deleteBannerImage(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith('http')) {
    return
  }

  const supabase = await createAdminClient()

  const marker = `/${BANNER_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) {
    return
  }
  const fileName = publicUrl.slice(idx + marker.length)

  const { error } = await supabase.storage
    .from(BANNER_BUCKET)
    .remove([fileName])

  if (error) {
    console.error('Failed to delete banner image:', error)
  }
}
