/**
 * Email Template: Configuration Confirmation
 * Sent to customers after they submit a pool configuration
 */

import type { Configuration } from '@/lib/supabase/types'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getHeatingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'

interface ConfigurationEmailData {
  contactName: string
  contactEmail: string
  contactPhone: string
  contactAddress?: string | null
  poolShape: string
  poolType: string
  dimensions: {
    diameter?: number
    width?: number
    length?: number
    depth?: number
  }
  color: string
  stairs: string
  technology: string
  lighting: string
  counterflow: string
  waterTreatment: string
  heating: string
  roofing: string
}

/**
 * Convert Configuration database object to email data
 */
export function configToEmailData(config: Configuration): ConfigurationEmailData {
  return {
    contactName: config.contact_name,
    contactEmail: config.contact_email,
    contactPhone: config.contact_phone || '',
    contactAddress: config.contact_address,
    poolShape: config.pool_shape,
    poolType: config.pool_type,
    dimensions: config.dimensions as ConfigurationEmailData['dimensions'],
    color: config.color,
    stairs: config.stairs,
    technology: config.technology,
    lighting: config.lighting,
    counterflow: config.counterflow,
    waterTreatment: config.water_treatment,
    heating: config.heating,
    roofing: config.roofing,
  }
}

// Rentmil assets hosted on Supabase Storage
const RENTMIL_LOGO_URL = 'https://imfzdbfhqxhyfyhxrfel.supabase.co/storage/v1/object/public/assets/logo%20rentmil.png'
const RENTMIL_MASCOT_URL = 'https://imfzdbfhqxhyfyhxrfel.supabase.co/storage/v1/object/public/assets/Base%20-%20Maskot%20-%20Rentmil.png'

/**
 * Generate HTML email for configuration confirmation
 * Design: "Bazénový Zen" - dark blue background with white cards
 */
export function generateConfigurationEmailHtml(data: ConfigurationEmailData): string {
  // Get human-readable labels
  const shapeLabel = getShapeLabel(data.poolShape)
  const typeLabel = getTypeLabel(data.poolType)
  const colorLabel = getColorLabel(data.color)
  const stairsLabel = getStairsLabel(data.stairs)
  const heatingLabel = getHeatingLabel(data.heating)
  const dimensionsLabel = formatDimensions(
    data.poolShape,
    data.dimensions as { diameter?: number; width?: number; length?: number; depth?: number }
  )

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rentmil - Potvrzení konfigurace</title>
</head>
<body style="margin:0; padding:0; background-color:#01384B;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
         style="background:#01384B; min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- HLAVNÍ KARTA -->
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0"
               style="max-width:520px;">

          <!-- BÍLÝ HEADER S LOGEM (zaoblený) -->
          <tr>
            <td align="center" style="background:#ffffff;
                                       border-radius:24px;
                                       padding:32px 40px;">
              <img src="${RENTMIL_LOGO_URL}"
                   alt="Rentmil"
                   style="height:140px; width:auto; display:block;" />
            </td>
          </tr>

          <!-- SPACER POD HEADEREM -->
          <tr>
            <td style="height:32px;"></td>
          </tr>

          <!-- MASKOT - CENTROVANÝ, VELKÝ -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${RENTMIL_MASCOT_URL}"
                   alt="Bazénový mistr"
                   style="height:140px; width:auto;" />
            </td>
          </tr>

          <!-- SLOGAN - VELKÝ, CENTROVANÝ -->
          <tr>
            <td align="center" style="padding:0 20px 8px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                          color:#ffffff;
                          font-weight:800;
                          font-size:32px;
                          line-height:1.1;
                          letter-spacing:-0.5px;">
                Vy zenujete,
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 20px 32px;">
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                          font-weight:800;
                          font-size:32px;
                          line-height:1.1;
                          letter-spacing:-0.5px;
                          color:#FF8621;">
                my bazénujeme.
              </div>
            </td>
          </tr>

          <!-- BÍLÁ KARTA - KONFIGURACE -->
          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#ffffff;
                            border-radius:24px;
                            box-shadow:0 8px 32px rgba(0,0,0,0.12);">

                <tr>
                  <td align="center" style="padding:28px 24px 20px;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                color:#01384B;
                                font-weight:700;
                                font-size:18px;">
                      Vaše konfigurace je u nás
                    </div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                color:#64748b;
                                font-size:13px;
                                margin-top:6px;">
                      Nejčastěji se ozýváme do 24 hodin (v pracovní dny)
                    </div>
                  </td>
                </tr>

                <!-- Konfigurace - horizontální layout -->
                <tr>
                  <td style="padding:0 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <!-- Řada 1 -->
                      <tr>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Tvar
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#01384B;
                                        font-size:13px;
                                        font-weight:700;">
                              ${shapeLabel}
                            </div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Rozměr
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#01384B;
                                        font-size:13px;
                                        font-weight:700;">
                              ${dimensionsLabel}
                            </div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Typ
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#01384B;
                                        font-size:13px;
                                        font-weight:700;">
                              ${typeLabel}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <!-- Řada 2 -->
                      <tr>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Barva
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#48A9A6;
                                        font-size:13px;
                                        font-weight:700;">
                              ${colorLabel}
                            </div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Schody
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#01384B;
                                        font-size:13px;
                                        font-weight:700;">
                              ${stairsLabel}
                            </div>
                          </div>
                        </td>
                        <td width="33%" align="center" style="padding:8px 4px;">
                          <div style="background:#f8fafc;
                                      border-radius:12px;
                                      padding:14px 8px;
                                      border:1px solid #e2e8f0;">
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#64748b;
                                        font-size:10px;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:4px;">
                              Ohřev
                            </div>
                            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                        color:#FF8621;
                                        font-size:13px;
                                        font-weight:700;">
                              ${heatingLabel}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA - SNOVÝ GRADIENT -->
          <tr>
            <td align="center" style="padding:0 0 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:50px;
                             background:linear-gradient(90deg,#FF8621 0%,#ED6663 100%);
                             box-shadow:0 8px 32px rgba(255,134,33,0.4);">
                    <a href="https://www.rentmil.cz/radime-vam?e-filter-1036ab9-post_tag=kupujeme-bazen"
                       style="display:inline-block;
                              padding:18px 40px;
                              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                              font-size:15px;
                              font-weight:700;
                              color:#ffffff;
                              text-decoration:none;
                              letter-spacing:0.3px;">
                      Přečíst rady při výběru bazénu
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- KONTAKT - BÍLÁ KARTA -->
          <tr>
            <td style="padding:0 0 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background:#ffffff;
                            border-radius:24px;
                            box-shadow:0 8px 32px rgba(0,0,0,0.12);">
                <tr>
                  <td align="center" style="padding:28px 24px;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                color:#64748b;
                                font-size:12px;
                                margin-bottom:8px;">
                      Váš bazénový mistr
                    </div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                color:#01384B;
                                font-size:18px;
                                font-weight:700;
                                margin-bottom:16px;">
                      Lenka Finklarová
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="tel:+420737222004"
                             style="display:inline-block;
                                    padding:12px 24px;
                                    background:#48A9A6;
                                    border-radius:24px;
                                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                    font-size:13px;
                                    font-weight:600;
                                    color:#ffffff;
                                    text-decoration:none;">
                            +420 737 222 004
                          </a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="mailto:bazeny@rentmil.cz"
                             style="display:inline-block;
                                    padding:12px 24px;
                                    background:#f8fafc;
                                    border:1px solid #e2e8f0;
                                    border-radius:24px;
                                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                                    font-size:13px;
                                    font-weight:600;
                                    color:#01384B;
                                    text-decoration:none;">
                            bazeny@rentmil.cz
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PATIČKA - VODOVÁ LINKA -->
          <tr>
            <td align="center" style="padding-top:16px;">
              <div style="height:4px;
                          background:linear-gradient(90deg,#48A9A6 0%,#01384B 50%,#48A9A6 100%);
                          border-radius:2px;
                          margin:0 40px;"></div>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                          color:rgba(255,255,255,0.5);
                          font-size:11px;
                          margin-top:20px;">
                Rentmil · Váš bazénový mistr · 23 let zkušeností
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
 * Generate plain text version of the email
 */
export function generateConfigurationEmailText(data: ConfigurationEmailData): string {
  // Get human-readable labels
  const shapeLabel = getShapeLabel(data.poolShape)
  const typeLabel = getTypeLabel(data.poolType)
  const colorLabel = getColorLabel(data.color)
  const stairsLabel = getStairsLabel(data.stairs)
  const heatingLabel = getHeatingLabel(data.heating)
  const dimensionsLabel = formatDimensions(
    data.poolShape,
    data.dimensions as { diameter?: number; width?: number; length?: number; depth?: number }
  )

  return `
Vy zenujete, my bazénujeme.

Vaše konfigurace je u nás!
Nejčastěji se ozýváme do 24 hodin (v pracovní dny).

---
VAŠE KONFIGURACE
---

Tvar: ${shapeLabel}
Rozměr: ${dimensionsLabel}
Typ: ${typeLabel}
Barva: ${colorLabel}
Schody: ${stairsLabel}
Ohřev: ${heatingLabel}

---

Přečíst rady při výběru bazénu:
https://www.rentmil.cz/radime-vam?e-filter-1036ab9-post_tag=kupujeme-bazen

---

Váš bazénový mistr
Lenka Finklarová
+420 737 222 004
bazeny@rentmil.cz

---
Rentmil · Váš bazénový mistr · 23 let zkušeností
  `.trim()
}
