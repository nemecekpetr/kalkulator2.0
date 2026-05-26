'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadBannerImage, deleteBannerImage } from '@/lib/supabase/storage'
import { revalidatePath } from 'next/cache'
import type { SignatureBanner } from '@/lib/supabase/types'

const ALLOWED_TYPES = ['image/png', 'image/jpeg']
const MAX_FILE_SIZE = 1024 * 1024 // 1 MB

async function requireAuthedUserId(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, error: 'Uživatel není přihlášen' }
  return { userId: user.id, error: null }
}

/**
 * Vrátí všechny bannery seřazené podle sort_order, pak nejnovější dříve.
 */
export async function listSignatureBanners(): Promise<{
  banners: SignatureBanner[]
  error: string | null
}> {
  try {
    const { userId, error: authError } = await requireAuthedUserId()
    if (authError || !userId) return { banners: [], error: authError }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('signature_banners')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing signature banners:', error)
      return { banners: [], error: 'Nepodařilo se načíst bannery' }
    }

    return { banners: (data as SignatureBanner[]) || [], error: null }
  } catch (error) {
    console.error('Error in listSignatureBanners:', error)
    return { banners: [], error: 'Chyba při načítání bannerů' }
  }
}

/**
 * Vrátí počet uživatelů, kteří mají daný banner aktuálně vybraný.
 * Slouží k informaci v dialogu mazání („má vybraných N pracovníků").
 */
export async function getSignatureBannerUserCount(
  bannerId: string
): Promise<{ count: number; error: string | null }> {
  try {
    const { userId, error: authError } = await requireAuthedUserId()
    if (authError || !userId) return { count: 0, error: authError }

    const supabase = await createAdminClient()
    const { count, error } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('signature_banner_id', bannerId)

    if (error) {
      console.error('Error counting banner users:', error)
      return { count: 0, error: 'Nepodařilo se spočítat uživatele' }
    }

    return { count: count || 0, error: null }
  } catch (error) {
    console.error('Error in getSignatureBannerUserCount:', error)
    return { count: 0, error: 'Chyba při zjišťování počtu uživatelů' }
  }
}

function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'Vyberte obrázek banneru'
  if (!ALLOWED_TYPES.includes(file.type)) return 'Banner musí být PNG nebo JPG'
  if (file.size > MAX_FILE_SIZE) return 'Banner je větší než 1 MB'
  return null
}

interface BannerMutationInput {
  name: string
  link_url: string
  is_evergreen: boolean
  sort_order: number
}

function parseFormData(formData: FormData): {
  data: BannerMutationInput | null
  file: File | null
  error: string | null
} {
  const name = (formData.get('name') as string | null)?.trim() || ''
  const linkUrl = (formData.get('link_url') as string | null)?.trim() || ''
  const isEvergreen = formData.get('is_evergreen') === 'true'
  const sortOrderRaw = (formData.get('sort_order') as string | null) || '0'
  const sortOrder = Number.parseInt(sortOrderRaw, 10) || 0
  const file = formData.get('file') as File | null

  if (!name) return { data: null, file: null, error: 'Vyplňte název banneru' }
  if (!linkUrl) return { data: null, file: null, error: 'Vyplňte URL odkazu' }
  try {
    new URL(linkUrl)
  } catch {
    return { data: null, file: null, error: 'URL odkazu není platná' }
  }

  return {
    data: { name, link_url: linkUrl, is_evergreen: isEvergreen, sort_order: sortOrder },
    file,
    error: null,
  }
}

/**
 * Vytvoří nový banner — nahraje obrázek do Storage a vloží řádek do DB.
 * Pokud is_evergreen=true, zruší flag u existujícího evergreen banneru.
 */
export async function createSignatureBanner(
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId, error: authError } = await requireAuthedUserId()
    if (authError || !userId) return { success: false, error: authError }

    const parsed = parseFormData(formData)
    if (parsed.error || !parsed.data) return { success: false, error: parsed.error }

    const fileError = validateFile(parsed.file)
    if (fileError || !parsed.file) return { success: false, error: fileError }

    const imageUrl = await uploadBannerImage(parsed.file)

    const supabase = await createAdminClient()

    if (parsed.data.is_evergreen) {
      const { error: unsetError } = await supabase
        .from('signature_banners')
        .update({ is_evergreen: false })
        .eq('is_evergreen', true)
      if (unsetError) {
        console.error('Error unsetting evergreen flag:', unsetError)
      }
    }

    const { error: insertError } = await supabase.from('signature_banners').insert({
      name: parsed.data.name,
      image_url: imageUrl,
      link_url: parsed.data.link_url,
      is_evergreen: parsed.data.is_evergreen,
      sort_order: parsed.data.sort_order,
      created_by: userId,
    })

    if (insertError) {
      console.error('Error inserting banner:', insertError)
      await deleteBannerImage(imageUrl)
      return { success: false, error: 'Nepodařilo se uložit banner' }
    }

    revalidatePath('/admin/nastaveni/email-bannery')
    revalidatePath('/admin/profil')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in createSignatureBanner:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Chyba při vytváření banneru' }
  }
}

/**
 * Upraví banner. Pokud je přiložený nový soubor, nahraje ho a smaže starý.
 */
export async function updateSignatureBanner(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId, error: authError } = await requireAuthedUserId()
    if (authError || !userId) return { success: false, error: authError }

    const parsed = parseFormData(formData)
    if (parsed.error || !parsed.data) return { success: false, error: parsed.error }

    const supabase = await createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('signature_banners')
      .select('image_url')
      .eq('id', id)
      .single<{ image_url: string }>()

    if (fetchError || !existing) {
      return { success: false, error: 'Banner nenalezen' }
    }

    let imageUrl = existing.image_url
    let oldImageToDelete: string | null = null

    if (parsed.file && parsed.file.size > 0) {
      const fileError = validateFile(parsed.file)
      if (fileError) return { success: false, error: fileError }
      imageUrl = await uploadBannerImage(parsed.file)
      oldImageToDelete = existing.image_url
    }

    if (parsed.data.is_evergreen) {
      const { error: unsetError } = await supabase
        .from('signature_banners')
        .update({ is_evergreen: false })
        .eq('is_evergreen', true)
        .neq('id', id)
      if (unsetError) {
        console.error('Error unsetting evergreen flag:', unsetError)
      }
    }

    const { error: updateError } = await supabase
      .from('signature_banners')
      .update({
        name: parsed.data.name,
        link_url: parsed.data.link_url,
        is_evergreen: parsed.data.is_evergreen,
        sort_order: parsed.data.sort_order,
        image_url: imageUrl,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating banner:', updateError)
      if (oldImageToDelete && imageUrl !== oldImageToDelete) {
        await deleteBannerImage(imageUrl)
      }
      return { success: false, error: 'Nepodařilo se uložit změny' }
    }

    if (oldImageToDelete) {
      await deleteBannerImage(oldImageToDelete)
    }

    revalidatePath('/admin/nastaveni/email-bannery')
    revalidatePath('/admin/profil')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in updateSignatureBanner:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Chyba při úpravě banneru' }
  }
}

/**
 * Smaže banner. FK ON DELETE SET NULL u user_profiles.signature_banner_id zařídí,
 * že uživatelé s tímto bannerem fallnou na evergreen.
 */
export async function deleteSignatureBanner(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId, error: authError } = await requireAuthedUserId()
    if (authError || !userId) return { success: false, error: authError }

    const supabase = await createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('signature_banners')
      .select('image_url')
      .eq('id', id)
      .single<{ image_url: string }>()

    if (fetchError || !existing) {
      return { success: false, error: 'Banner nenalezen' }
    }

    const { error: deleteError } = await supabase.from('signature_banners').delete().eq('id', id)
    if (deleteError) {
      console.error('Error deleting banner:', deleteError)
      return { success: false, error: 'Nepodařilo se smazat banner' }
    }

    await deleteBannerImage(existing.image_url)

    revalidatePath('/admin/nastaveni/email-bannery')
    revalidatePath('/admin/profil')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteSignatureBanner:', error)
    return { success: false, error: 'Chyba při mazání banneru' }
  }
}
