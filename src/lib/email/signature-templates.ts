import { appendUtm } from './utm'
import type { SignatureBanner } from '@/lib/supabase/types'

export interface SignatureData {
  fullName: string
  position: string | null
  email: string
  phone: string | null
}

export interface SignatureRenderOptions {
  baseUrl: string
  banner: Pick<SignatureBanner, 'name' | 'image_url' | 'link_url'> | null
}

export interface RenderedSignature {
  /** HTML s table layoutem — pro Gmail / Outlook / Apple Mail. */
  html: string
  /** HTML bez table — pro Pipedrive a podobné WYSIWYG editory, které table strippují. */
  htmlPipedrive: string
  plainText: string
}

const BRAND_DARK = '#01384B'
const BRAND_AQUA = '#48A9A6'
const NEUTRAL_GRAY = '#6B7280'
const BORDER_COLOR = '#D1D5DB'
const SLOGAN = 'Vy zenujete, my bazénujeme.'
const RENTMIL_URL = 'https://rentmil.cz'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`
}

/**
 * Šablona 1: S bannerem — logo, kontaktní údaje, slogan, sezónní banner s CTA.
 */
export function renderBannerSignature(
  data: SignatureData,
  options: SignatureRenderOptions
): RenderedSignature {
  const logoUrl = resolveUrl('/logo-email.png', options.baseUrl)
  const brandLink = appendUtm(RENTMIL_URL, 'brand')

  const banner = options.banner
  const bannerImageUrl = banner ? resolveUrl(banner.image_url, options.baseUrl) : null
  const bannerLink = banner ? appendUtm(banner.link_url, `banner-${banner.name}`) : null

  const fullName = escapeHtml(data.fullName)
  const position = data.position ? escapeHtml(data.position) : ''
  const email = escapeHtml(data.email)
  const phone = data.phone ? escapeHtml(data.phone) : ''
  const FONT_STACK = `'Nunito Sans','Helvetica Neue',Arial,sans-serif`
  const ACCENT = `border-left:3px solid ${BRAND_AQUA};padding-left:12px;`

  const positionRow = position
    ? `
  <tr>
    <td style="padding-top:3px;font-size:13px;color:${NEUTRAL_GRAY};font-family:${FONT_STACK};${ACCENT}">${position}</td>
  </tr>`
    : ''

  const phoneRow = data.phone
    ? `
  <tr>
    <td style="padding-top:3px;font-size:13px;color:${BRAND_DARK};font-family:${FONT_STACK};${ACCENT}"><a href="${escapeHtml(telHref(data.phone))}" style="color:${BRAND_DARK};text-decoration:none;">${phone}</a></td>
  </tr>`
    : ''

  const bannerRow =
    bannerImageUrl && bannerLink && banner
      ? `
  <tr>
    <td colspan="2" style="padding-top:16px;">
      <a href="${escapeHtml(bannerLink)}" style="text-decoration:none;display:block;">
        <img src="${escapeHtml(bannerImageUrl)}" alt="${escapeHtml(banner.name)}" width="480" style="display:block;border:0;max-width:100%;height:auto;" />
      </a>
    </td>
  </tr>`
      : ''

  const infoColumn = `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="font-size:17px;font-weight:bold;color:${BRAND_DARK};font-family:${FONT_STACK};line-height:1.3;${ACCENT}">${fullName}</td>
  </tr>${positionRow}
  <tr>
    <td style="padding-top:10px;font-size:13px;color:${BRAND_DARK};font-family:${FONT_STACK};${ACCENT}"><a href="mailto:${email}" style="color:${BRAND_DARK};text-decoration:none;">${email}</a></td>
  </tr>${phoneRow}
  <tr>
    <td style="padding-top:3px;font-size:13px;font-family:${FONT_STACK};${ACCENT}"><a href="${escapeHtml(brandLink)}" style="color:${BRAND_DARK};text-decoration:none;">rentmil.cz</a></td>
  </tr>
</table>`

  const html = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT_STACK};color:${BRAND_DARK};max-width:540px;border-collapse:collapse;">
  <tr>
    <td style="vertical-align:middle;">${infoColumn}</td>
    <td style="padding-left:24px;vertical-align:middle;text-align:right;">
      <a href="${escapeHtml(brandLink)}" style="text-decoration:none;display:inline-block;">
        <img src="${escapeHtml(logoUrl)}" alt="Rentmil" width="180" style="display:block;border:0;height:auto;" />
      </a>
    </td>
  </tr>${bannerRow}
</table>`

  // Pipedrive verze: bez <table>, používá <div>/<p>/<span>. WYSIWYG editory
  // tabulky obvykle strippují při paste, ale div+inline styly udrží.
  const pdPositionLine = position
    ? `<div style="font-family:${FONT_STACK};font-size:13px;color:${NEUTRAL_GRAY};margin:3px 0 0 0;">${position}</div>`
    : ''
  const pdPhoneLine = data.phone
    ? `<div style="font-family:${FONT_STACK};font-size:13px;color:${BRAND_DARK};margin:3px 0 0 0;"><a href="${escapeHtml(telHref(data.phone))}" style="color:${BRAND_DARK};text-decoration:none;">${phone}</a></div>`
    : ''
  const pdBanner =
    bannerImageUrl && bannerLink && banner
      ? `<div style="margin-top:16px;"><a href="${escapeHtml(bannerLink)}" style="text-decoration:none;"><img src="${escapeHtml(bannerImageUrl)}" alt="${escapeHtml(banner.name)}" width="480" style="display:block;border:0;max-width:100%;height:auto;" /></a></div>`
      : ''

  const htmlPipedrive = `<div style="font-family:${FONT_STACK};color:${BRAND_DARK};max-width:540px;">
  <div>
    <a href="${escapeHtml(brandLink)}" style="text-decoration:none;display:inline-block;">
      <img src="${escapeHtml(logoUrl)}" alt="Rentmil" width="180" style="display:block;border:0;height:auto;margin-bottom:12px;" />
    </a>
  </div>
  <div style="font-family:${FONT_STACK};font-size:17px;font-weight:bold;color:${BRAND_DARK};line-height:1.3;">${fullName}</div>
  ${pdPositionLine}
  <div style="font-family:${FONT_STACK};font-size:13px;color:${BRAND_DARK};margin:10px 0 0 0;"><a href="mailto:${email}" style="color:${BRAND_DARK};text-decoration:none;">${email}</a></div>
  ${pdPhoneLine}
  <div style="font-family:${FONT_STACK};font-size:13px;margin:3px 0 0 0;"><a href="${escapeHtml(brandLink)}" style="color:${BRAND_DARK};text-decoration:none;">rentmil.cz</a></div>
  ${pdBanner}
</div>`

  const plainLines = [
    data.fullName,
    data.position || '',
    '',
    `Email: ${data.email}`,
    data.phone ? `Tel: ${data.phone}` : '',
    'rentmil.cz',
  ]
  if (banner) {
    plainLines.push(`${banner.name}: ${appendUtm(banner.link_url, `banner-${banner.name}`)}`)
  }
  plainLines.push(brandLink)

  return {
    html,
    htmlPipedrive,
    plainText: plainLines.filter((line, idx, arr) => !(line === '' && arr[idx - 1] === '')).join('\n'),
  }
}

/**
 * Šablona 2: Kompaktní bez banneru — minimalistický textový podpis.
 */
export function renderCompactSignature(
  data: SignatureData,
  _options: SignatureRenderOptions
): RenderedSignature {
  const brandLink = appendUtm(RENTMIL_URL, 'brand')

  const fullName = escapeHtml(data.fullName)
  const position = data.position ? escapeHtml(data.position) : ''
  const email = escapeHtml(data.email)
  const phone = data.phone ? escapeHtml(data.phone) : ''

  const positionPart = position
    ? `<span style="color:${NEUTRAL_GRAY};font-weight:normal;"> &mdash; ${position}, Rentmil</span>`
    : `<span style="color:${NEUTRAL_GRAY};font-weight:normal;"> &mdash; Rentmil</span>`

  const phonePart = data.phone
    ? `&nbsp;&nbsp;Tel: <a href="${escapeHtml(telHref(data.phone))}" style="color:${BRAND_DARK};text-decoration:none;">${phone}</a>`
    : ''

  const html = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;color:${BRAND_DARK};max-width:540px;border-collapse:collapse;">
  <tr>
    <td style="font-size:15px;font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;line-height:1.4;">
      <span style="font-weight:bold;color:${BRAND_DARK};">${fullName}</span>${positionPart}
    </td>
  </tr>
  <tr>
    <td style="padding-top:4px;font-size:13px;color:${BRAND_DARK};font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;">
      Email: <a href="mailto:${email}" style="color:${BRAND_DARK};text-decoration:none;">${email}</a>${phonePart}&nbsp;&nbsp;<a href="${escapeHtml(brandLink)}" style="color:${BRAND_DARK};text-decoration:none;">rentmil.cz</a>
    </td>
  </tr>
  <tr>
    <td style="padding-top:8px;border-top:1px solid ${BORDER_COLOR};font-size:13px;color:${BRAND_AQUA};font-family:'Nunito Sans','Helvetica Neue',Arial,sans-serif;">${escapeHtml(SLOGAN)}</td>
  </tr>
</table>`

  const FONT_STACK = `'Nunito Sans','Helvetica Neue',Arial,sans-serif`
  const htmlPipedrive = `<div style="font-family:${FONT_STACK};color:${BRAND_DARK};max-width:540px;">
  <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.4;"><span style="font-weight:bold;color:${BRAND_DARK};">${fullName}</span>${positionPart}</div>
  <div style="font-family:${FONT_STACK};font-size:13px;color:${BRAND_DARK};margin-top:4px;">Email: <a href="mailto:${email}" style="color:${BRAND_DARK};text-decoration:none;">${email}</a>${phonePart}&nbsp;&nbsp;<a href="${escapeHtml(brandLink)}" style="color:${BRAND_DARK};text-decoration:none;">rentmil.cz</a></div>
  <div style="font-family:${FONT_STACK};font-size:13px;color:${BRAND_AQUA};margin-top:8px;padding-top:8px;border-top:1px solid ${BORDER_COLOR};">${escapeHtml(SLOGAN)}</div>
</div>`

  const plainHeadline = position
    ? `${data.fullName} — ${data.position}, Rentmil`
    : `${data.fullName} — Rentmil`
  const contactParts = [`Email: ${data.email}`]
  if (data.phone) contactParts.push(`Tel: ${data.phone}`)
  contactParts.push('rentmil.cz')
  const plainText = [plainHeadline, contactParts.join('  '), SLOGAN].join('\n')

  return { html, htmlPipedrive, plainText }
}
