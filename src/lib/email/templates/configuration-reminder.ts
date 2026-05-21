/**
 * Email Template: Configuration Reminder
 * Naplánovaný připomínkový e-mail pro rozpracované (neodeslané) konfigurace.
 * Posílá se ~2 h po opuštění konfigurátoru, pokud poptávka nebyla odeslána.
 */

import type { Configuration } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'
import { vocativeFirstName } from '@/lib/utils/czech-salutation'

// Rentmil assets hostované na Supabase Storage (shodné s potvrzovacím e-mailem)
const RENTMIL_LOGO_URL = 'https://nufgoaqolewnotpohaao.supabase.co/storage/v1/object/public/assets/Sunset.png'
const RENTMIL_MASCOT_URL = 'https://nufgoaqolewnotpohaao.supabase.co/storage/v1/object/public/assets/Base%20-%20Maskot%20-%20Rentmil.png'

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

interface ReminderSummaryRow {
  label: string
  value: string
}

function summaryRows(config: Configuration): ReminderSummaryRow[] {
  return [
    { label: 'Tvar', value: getShapeLabel(config.pool_shape) },
    {
      label: 'Rozměry',
      value: formatDimensions(
        config.pool_shape,
        config.dimensions as { diameter?: number; width?: number; length?: number; depth?: number }
      ),
    },
    { label: 'Typ', value: getTypeLabel(config.pool_type) },
    { label: 'Ohřev', value: getHeatingLabel(config.heating) },
    { label: 'Zastřešení', value: getRoofingLabel(config.roofing) },
  ]
}

/**
 * HTML verze připomínkového e-mailu.
 * @param resumeUrl odkaz na konfigurátor s předvyplněnou konfigurací (`?draft=<id>`)
 */
export function generateConfigurationReminderHtml(config: Configuration, resumeUrl: string): string {
  const rows = summaryRows(config)
  const firstName = config.contact_name.trim().split(/\s+/)[0] || ''
  const greetingName = firstName ? vocativeFirstName(firstName) : ''

  const summaryHtml = rows
    .map(
      (row) => `
              <tr>
                <td style="padding:7px 0; border-bottom:1px solid #f1f5f9;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="font-family:${FONT}; color:#64748b; font-size:13px; width:120px;">${row.label}</td>
                      <td style="font-family:${FONT}; color:#01384B; font-size:13px; font-weight:700;">${row.value}</td>
                    </tr>
                  </table>
                </td>
              </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rentmil - Dokončete svou konfiguraci</title>
</head>
<body style="margin:0; padding:0; background-color:#01384B;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#01384B;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">

          <!-- HEADER S LOGEM -->
          <tr>
            <td align="center" style="background:#ffffff; border-radius:24px; padding:28px 40px;">
              <img src="${RENTMIL_LOGO_URL}" alt="Rentmil" style="height:120px; width:auto; display:block;" />
            </td>
          </tr>

          <tr><td style="height:28px;"></td></tr>

          <!-- MASKOT -->
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <img src="${RENTMIL_MASCOT_URL}" alt="Bazénový mistr" style="height:120px; width:auto;" />
            </td>
          </tr>

          <!-- NADPIS -->
          <tr>
            <td align="center" style="padding:0 20px 24px;">
              <div style="font-family:${FONT}; color:#ffffff; font-weight:800; font-size:30px; line-height:1.15; letter-spacing:-0.5px;">
                Zbývá poslední krok
              </div>
            </td>
          </tr>

          <!-- BÍLÁ KARTA - TEXT + SHRNUTÍ -->
          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#ffffff; border-radius:24px; box-shadow:0 8px 32px rgba(0,0,0,0.12);">
                <tr>
                  <td style="padding:28px 28px 8px;">
                    <p style="font-family:${FONT}; color:#01384B; font-size:15px; line-height:1.6; margin:0 0 12px;">
                      Dobrý den${greetingName ? `, ${greetingName}` : ''},
                    </p>
                    <p style="font-family:${FONT}; color:#475569; font-size:14px; line-height:1.6; margin:0 0 12px;">
                      váš návrh bazénu z našeho konfigurátoru <strong style="color:#01384B;">vypadá skvěle!</strong>
                      Konfigurace ale zatím není odeslaná, takže vám nemůžeme připravit cenu.
                    </p>
                    <p style="font-family:${FONT}; color:#475569; font-size:14px; line-height:1.6; margin:0 0 8px;">
                      Vaši rozpracovanou konfiguraci jsme <strong style="color:#01384B;">uložili</strong>. Stačí jediné kliknutí
                      a do 24 hodin vám spočítáme nezávaznou nabídku na míru.
                    </p>
                  </td>
                </tr>

                <!-- SHRNUTÍ KONFIGURACE -->
                <tr>
                  <td style="padding:8px 28px 16px;">
                    <div style="font-family:${FONT}; color:#48A9A6; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">
                      Vaše rozpracovaná konfigurace
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${summaryHtml}
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding:8px 24px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:50px; background:linear-gradient(90deg,#FF8621 0%,#ED6663 100%); box-shadow:0 8px 24px rgba(255,134,33,0.4);">
                          <a href="${resumeUrl}"
                             style="display:inline-block; padding:17px 38px; font-family:${FONT}; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:0.3px;">
                            Dokončit a získat kalkulaci
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="font-family:${FONT}; color:#94a3b8; font-size:12px; margin-top:14px;">
                      Nezávazně a zdarma · Odpověď do 24 hodin
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PATIČKA -->
          <tr>
            <td align="center" style="padding-top:8px;">
              <div style="height:4px; background:linear-gradient(90deg,#48A9A6 0%,#01384B 50%,#48A9A6 100%); border-radius:2px; margin:0 40px;"></div>
              <div style="font-family:${FONT}; color:rgba(255,255,255,0.55); font-size:11px; line-height:1.6; margin-top:18px;">
                Rentmil · Váš bazénový mistr<br>
                Tento e-mail vám přišel, protože máte na rentmil.cz rozpracovanou konfiguraci bazénu.<br>
                <a href="mailto:bazeny@rentmil.cz?subject=Nezas%C3%ADlat%20p%C5%99ipom%C3%ADnky" style="color:rgba(255,255,255,0.55);">Nezasílat připomínky</a>
                &nbsp;·&nbsp;
                <a href="https://www.rentmil.cz/ochrana-osobnich-udaju" style="color:rgba(255,255,255,0.55);">Zásady ochrany osobních údajů</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()
}

/**
 * Plain text verze připomínkového e-mailu.
 */
export function generateConfigurationReminderText(config: Configuration, resumeUrl: string): string {
  const rows = summaryRows(config)
  const firstName = config.contact_name.trim().split(/\s+/)[0] || ''
  const greetingName = firstName ? vocativeFirstName(firstName) : ''

  return `
Zbývá poslední krok

Dobrý den${greetingName ? `, ${greetingName}` : ''},

váš návrh bazénu z našeho konfigurátoru vypadá skvěle!
Konfigurace ale zatím není odeslaná, takže vám nemůžeme připravit cenu.

Vaši rozpracovanou konfiguraci jsme uložili. Stačí jediné kliknutí
a do 24 hodin vám spočítáme nezávaznou nabídku na míru.

---
VAŠE ROZPRACOVANÁ KONFIGURACE
---

${rows.map((row) => `${row.label}: ${row.value}`).join('\n')}

---

Dokončit a získat kalkulaci:
${resumeUrl}

Nezávazně a zdarma · Odpověď do 24 hodin

---
Rentmil · Váš bazénový mistr
Tento e-mail vám přišel, protože máte na rentmil.cz rozpracovanou konfiguraci bazénu.
Nezasílat připomínky: bazeny@rentmil.cz
Zásady ochrany osobních údajů: https://www.rentmil.cz/ochrana-osobnich-udaju
  `.trim()
}
