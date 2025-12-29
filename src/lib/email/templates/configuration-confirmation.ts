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
  getTechnologyLabel,
  getLightingLabel,
  getCounterflowLabel,
  getWaterTreatmentLabel,
  getHeatingLabel,
  getRoofingLabel,
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

/**
 * Generate HTML email for configuration confirmation
 */
export function generateConfigurationEmailHtml(data: ConfigurationEmailData): string {
  const firstName = data.contactName.split(' ')[0]

  // Format configuration items
  const configItems = [
    { label: 'Tvar bazénu', value: getShapeLabel(data.poolShape) },
    { label: 'Typ bazénu', value: getTypeLabel(data.poolType) },
    { label: 'Rozměry', value: formatDimensions(data.poolShape, data.dimensions) },
    { label: 'Barva', value: getColorLabel(data.color) },
    { label: 'Schodiště', value: getStairsLabel(data.stairs) },
    { label: 'Technologie', value: getTechnologyLabel(data.technology) },
    { label: 'Osvětlení', value: getLightingLabel(data.lighting) },
    { label: 'Protiproud', value: getCounterflowLabel(data.counterflow) },
    { label: 'Úprava vody', value: getWaterTreatmentLabel(data.waterTreatment) },
    { label: 'Ohřev', value: getHeatingLabel(data.heating) },
    { label: 'Zastřešení', value: getRoofingLabel(data.roofing) },
  ]

  // Filter out "none" values for cleaner display
  const displayItems = configItems.filter(item =>
    !item.value.toLowerCase().includes('bez ') ||
    item.label === 'Schodiště' // Keep "Bez schodiště" as it's informative
  )

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vaše konfigurace bazénu - Rentmil</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #01384B 0%, #025a6e 50%, #48A9A6 100%); padding: 32px 40px; text-align: center;">
              <img src="https://rentmil.cz/wp-content/uploads/2024/03/Rentmil_250.png" alt="Rentmil" style="height: 50px; width: auto;" />
              <p style="color: rgba(255, 255, 255, 0.9); margin: 16px 0 0 0; font-size: 16px;">Konfigurátor bazénů</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 40px 40px 24px 40px;">
              <h1 style="margin: 0 0 16px 0; color: #01384B; font-size: 24px; font-weight: 600;">
                Dobrý den, ${firstName}!
              </h1>
              <p style="margin: 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Děkujeme za Váš zájem o bazén Rentmil. Vaši konfiguraci jsme úspěšně přijali a začínáme na ní pracovat.
              </p>
            </td>
          </tr>

          <!-- Configuration Summary -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 20px 0; color: #01384B; font-size: 18px; font-weight: 600; border-bottom: 2px solid #48A9A6; padding-bottom: 12px;">
                  📋 Vaše konfigurace
                </h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  ${displayItems.map(item => `
                  <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 40%;">${item.label}</td>
                    <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 500;">${item.value}</td>
                  </tr>
                  `).join('')}
                </table>
                ${data.contactAddress ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    <strong style="color: #1e293b;">Místo instalace:</strong> ${data.contactAddress}
                  </p>
                </div>
                ` : ''}
              </div>
            </td>
          </tr>

          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <div style="background: linear-gradient(135deg, #01384B 0%, #025a6e 100%); border-radius: 12px; padding: 24px;">
                <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                  🚀 Co bude následovat
                </h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top; width: 32px;">
                      <div style="width: 28px; height: 28px; background-color: #48A9A6; border-radius: 50%; text-align: center; line-height: 28px; color: #ffffff; font-weight: 600; font-size: 14px;">1</div>
                    </td>
                    <td style="padding: 12px 0 12px 12px; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.5;">
                      <strong style="color: #ffffff;">Náš specialista Vám zavolá</strong><br>
                      Do 24 hodin Vás budeme kontaktovat na čísle ${data.contactPhone}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="width: 28px; height: 28px; background-color: #48A9A6; border-radius: 50%; text-align: center; line-height: 28px; color: #ffffff; font-weight: 600; font-size: 14px;">2</div>
                    </td>
                    <td style="padding: 12px 0 12px 12px; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.5;">
                      <strong style="color: #ffffff;">Připravíme cenovou kalkulaci</strong><br>
                      Na základě Vaší konfigurace zpracujeme detailní nabídku
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; vertical-align: top;">
                      <div style="width: 28px; height: 28px; background-color: #48A9A6; border-radius: 50%; text-align: center; line-height: 28px; color: #ffffff; font-weight: 600; font-size: 14px;">3</div>
                    </td>
                    <td style="padding: 12px 0 12px 12px; color: rgba(255, 255, 255, 0.9); font-size: 14px; line-height: 1.5;">
                      <strong style="color: #ffffff;">Domluvíme nezávaznou schůzku</strong><br>
                      Probereme vše osobně a zodpovíme Vaše dotazy
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Contact Info -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <div style="text-align: center; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 14px;">
                  Máte dotazy? Neváhejte nás kontaktovat:
                </p>
                <p style="margin: 0 0 8px 0;">
                  <a href="tel:+420777888999" style="color: #01384B; text-decoration: none; font-weight: 600; font-size: 16px;">
                    📞 +420 777 888 999
                  </a>
                </p>
                <p style="margin: 0;">
                  <a href="mailto:info@rentmil.cz" style="color: #01384B; text-decoration: none; font-weight: 600; font-size: 16px;">
                    ✉️ info@rentmil.cz
                  </a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #01384B; font-size: 14px; font-weight: 500;">
                S pozdravem,<br>
                Tým Rentmil
              </p>
              <p style="margin: 0; color: #48A9A6; font-size: 13px; font-style: italic;">
                „Vy zenujete, my bazénujeme"
              </p>
              <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Rentmil s.r.o. | Všechna práva vyhrazena
              </p>
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
  const firstName = data.contactName.split(' ')[0]

  return `
Dobrý den, ${firstName}!

Děkujeme za Váš zájem o bazén Rentmil. Vaši konfiguraci jsme úspěšně přijali.

=== VAŠE KONFIGURACE ===

Tvar bazénu: ${getShapeLabel(data.poolShape)}
Typ bazénu: ${getTypeLabel(data.poolType)}
Rozměry: ${formatDimensions(data.poolShape, data.dimensions)}
Barva: ${getColorLabel(data.color)}
Schodiště: ${getStairsLabel(data.stairs)}
Technologie: ${getTechnologyLabel(data.technology)}
Osvětlení: ${getLightingLabel(data.lighting)}
Protiproud: ${getCounterflowLabel(data.counterflow)}
Úprava vody: ${getWaterTreatmentLabel(data.waterTreatment)}
Ohřev: ${getHeatingLabel(data.heating)}
Zastřešení: ${getRoofingLabel(data.roofing)}
${data.contactAddress ? `\nMísto instalace: ${data.contactAddress}` : ''}

=== CO BUDE NÁSLEDOVAT ===

1. Náš specialista Vám zavolá do 24 hodin
2. Připravíme cenovou kalkulaci
3. Domluvíme nezávaznou schůzku

=== KONTAKT ===

Tel: +420 777 888 999
Email: info@rentmil.cz

S pozdravem,
Tým Rentmil

„Vy zenujete, my bazénujeme"
  `.trim()
}
