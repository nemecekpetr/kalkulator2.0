import type { Tool } from '@anthropic-ai/sdk/resources/messages'

/**
 * Tool definitions for the Rentmil AI Assistant
 *
 * Read tools - no confirmation required
 * Write tools - require user confirmation before execution
 */

// =============================================================================
// READ TOOLS - Information retrieval, no side effects
// =============================================================================

export const READ_TOOLS: Tool[] = [
  {
    name: 'get_quote',
    description: 'Získá detail nabídky včetně všech položek, variant a zákazníka. Použij když uživatel chce vidět konkrétní nabídku.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'get_order',
    description: 'Získá detail objednávky včetně všech položek a zákazníka.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'UUID objednávky',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_configuration',
    description: 'Získá konfiguraci bazénu od zákazníka (rozměry, typ, barva, příslušenství).',
    input_schema: {
      type: 'object' as const,
      properties: {
        configuration_id: {
          type: 'string',
          description: 'UUID konfigurace',
        },
      },
      required: ['configuration_id'],
    },
  },
  {
    name: 'search_products',
    description: 'Vyhledá produkty v katalogu podle názvu, kódu nebo kategorie. Vrací až 20 výsledků.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Hledaný text (název nebo kód produktu)',
        },
        category: {
          type: 'string',
          description: 'Filtr podle kategorie',
          enum: [
            'bazeny',
            'prislusenstvi',
            'sluzby',
            'doprava',
            'technologie',
            'ohrev',
            'zastreseni',
            'schodiste',
            'uprava_vody',
            'protiproud',
            'osvetleni',
          ],
        },
        limit: {
          type: 'number',
          description: 'Maximální počet výsledků (výchozí 10, max 20)',
        },
      },
    },
  },
  {
    name: 'get_customer_history',
    description: 'Získá historii zákazníka - jeho konfigurace, nabídky a objednávky. Lze hledat podle emailu NEBO jména zákazníka.',
    input_schema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'Email zákazníka (volitelné, pokud je zadáno jméno)',
        },
        name: {
          type: 'string',
          description: 'Jméno zákazníka pro vyhledání (volitelné, pokud je zadán email)',
        },
      },
    },
  },
  {
    name: 'get_production_status',
    description: 'Získá stav výroby pro konkrétní objednávku.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'UUID objednávky',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'list_recent_quotes',
    description: 'Získá seznam posledních nabídek. Užitečné pro přehled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Počet nabídek k vrácení (výchozí 10)',
        },
        status: {
          type: 'string',
          description: 'Filtr podle stavu',
          enum: ['draft', 'sent', 'accepted', 'rejected'],
        },
      },
    },
  },
  {
    name: 'get_upsell_suggestions',
    description: 'Analyzuje nabídku a vrátí návrhy doplňkových produktů (upselling). Využij pro doporučení zákazníkovi.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky k analýze',
        },
      },
      required: ['quote_id'],
    },
  },
  {
    name: 'compare_quotes',
    description: 'Porovná dvě nebo více nabídek a zobrazí rozdíly v cenách, položkách a slevách.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Seznam UUID nabídek k porovnání (2-4 nabídky)',
        },
      },
      required: ['quote_ids'],
    },
  },
]

// =============================================================================
// WRITE TOOLS - Actions that modify data, require confirmation
// =============================================================================

export const WRITE_TOOLS: Tool[] = [
  {
    name: 'create_pipedrive_activity',
    description: 'Vytvoří aktivitu (připomenutí, schůzku, hovor) v Pipedrive CRM. Použij pro follow-upy a plánování. VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        subject: {
          type: 'string',
          description: 'Název aktivity (např. "Zavolat ohledně nabídky")',
        },
        type: {
          type: 'string',
          description: 'Typ aktivity - vyber podle kontextu zprávy: "call" pro volání/telefonát (klíčová slova: volat, zavolat, telefonovat), "meeting" pro schůzku (klíčová slova: potkat, setkat, schůzka, sejít), "email" pro připomenutí emailem (klíčová slova: připomenout, napsat, email), "task" je výchozí typ pro obecné úkoly (použij když si nejsi jistý)',
          enum: ['call', 'meeting', 'task', 'deadline', 'email', 'lunch'],
        },
        due_date: {
          type: 'string',
          description: 'Datum ve formátu YYYY-MM-DD nebo relativní (za 3 dny, příští týden, zítra)',
        },
        due_time: {
          type: 'string',
          description: 'Čas ve formátu HH:MM (volitelné)',
        },
        quote_id: {
          type: 'string',
          description: 'UUID nabídky pro automatické propojení s dealem (volitelné)',
        },
        customer_name: {
          type: 'string',
          description: 'Jméno zákazníka - systém automaticky vyhledá a propojí s dealem v Pipedrive (volitelné, použij pokud nemáš quote_id)',
        },
        deal_id: {
          type: 'number',
          description: 'ID dealu v Pipedrive (volitelné, obvykle není potřeba - systém najde automaticky)',
        },
        person_id: {
          type: 'number',
          description: 'ID osoby v Pipedrive (volitelné, obvykle není potřeba - systém najde automaticky)',
        },
        note: {
          type: 'string',
          description: 'Poznámka k aktivitě (volitelné)',
        },
      },
      required: ['subject', 'type', 'due_date'],
    },
  },
  {
    name: 'update_quote_item',
    description: 'Upraví existující položku v nabídce (cenu, množství, název). VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
        item_id: {
          type: 'string',
          description: 'UUID položky',
        },
        updates: {
          type: 'object',
          description: 'Změny k aplikování',
          properties: {
            name: { type: 'string', description: 'Nový název' },
            quantity: { type: 'number', description: 'Nové množství' },
            unit_price: { type: 'number', description: 'Nová jednotková cena' },
            description: { type: 'string', description: 'Nový popis' },
          },
        },
      },
      required: ['quote_id', 'item_id', 'updates'],
    },
  },
  {
    name: 'add_quote_item',
    description: 'Přidá novou položku do nabídky. VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
        product_id: {
          type: 'string',
          description: 'UUID produktu z katalogu (volitelné)',
        },
        name: {
          type: 'string',
          description: 'Název položky',
        },
        category: {
          type: 'string',
          description: 'Kategorie položky',
        },
        quantity: {
          type: 'number',
          description: 'Množství',
        },
        unit_price: {
          type: 'number',
          description: 'Jednotková cena v Kč',
        },
        variant_keys: {
          type: 'array',
          description: 'Do kterých variant přidat (ekonomicka, optimalni, premiova)',
          items: { type: 'string' },
        },
      },
      required: ['quote_id', 'name', 'category', 'quantity', 'unit_price'],
    },
  },
  {
    name: 'remove_quote_item',
    description: 'Odstraní položku z nabídky. VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
        item_id: {
          type: 'string',
          description: 'UUID položky k odstranění',
        },
      },
      required: ['quote_id', 'item_id'],
    },
  },
  {
    name: 'apply_discount',
    description: 'Aplikuje slevu na variantu nabídky (procentuální nebo absolutní). VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
        variant_key: {
          type: 'string',
          description: 'Klíč varianty',
          enum: ['ekonomicka', 'optimalni', 'premiova'],
        },
        discount_percent: {
          type: 'number',
          description: 'Sleva v procentech (0-100)',
        },
        discount_amount: {
          type: 'number',
          description: 'Absolutní sleva v Kč',
        },
      },
      required: ['quote_id', 'variant_key'],
    },
  },
  {
    name: 'update_quote_status',
    description: 'Změní stav nabídky. VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quote_id: {
          type: 'string',
          description: 'UUID nabídky',
        },
        status: {
          type: 'string',
          description: 'Nový stav',
          enum: ['draft', 'sent', 'accepted', 'rejected'],
        },
      },
      required: ['quote_id', 'status'],
    },
  },
  {
    name: 'set_user_preference',
    description: 'Uloží explicitní preferenci uživatele (např. "vždy mi ukazuj ceny bez DPH"). VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        preference_type: {
          type: 'string',
          description: 'Typ preference',
          enum: ['discount_range', 'favorite_products', 'communication_style', 'default_actions', 'notification_prefs', 'ui_prefs'],
        },
        preference_key: {
          type: 'string',
          description: 'Klíč preference (např. "default_discount", "preferred_greeting")',
        },
        preference_value: {
          type: 'object',
          description: 'Hodnota preference jako JSON objekt',
        },
        description: {
          type: 'string',
          description: 'Popis preference pro uživatele',
        },
      },
      required: ['preference_type', 'preference_key', 'preference_value', 'description'],
    },
  },
  {
    name: 'add_note',
    description: 'Přidá poznámku k nabídce, objednávce nebo konfiguraci. VYŽADUJE POTVRZENÍ.',
    input_schema: {
      type: 'object' as const,
      properties: {
        entity_type: {
          type: 'string',
          description: 'Typ entity',
          enum: ['quote', 'order', 'configuration'],
        },
        entity_id: {
          type: 'string',
          description: 'UUID entity',
        },
        note: {
          type: 'string',
          description: 'Text poznámky',
        },
        is_internal: {
          type: 'boolean',
          description: 'Interní poznámka (neviditelná pro zákazníka)',
        },
      },
      required: ['entity_type', 'entity_id', 'note'],
    },
  },
]

// All tools combined
export const ALL_TOOLS: Tool[] = [...READ_TOOLS, ...WRITE_TOOLS]

// Set of write tool names for confirmation check
export const WRITE_TOOL_NAMES = new Set(WRITE_TOOLS.map(t => t.name))

// Check if a tool requires confirmation
export function requiresConfirmation(toolName: string): boolean {
  return WRITE_TOOL_NAMES.has(toolName)
}

// Get human-readable description for confirmation dialog
export function getToolConfirmationDescription(
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case 'create_pipedrive_activity': {
      const typeLabels: Record<string, string> = {
        call: 'hovor',
        meeting: 'schůzku',
        task: 'úkol',
        deadline: 'deadline',
        email: 'email',
        lunch: 'oběd',
      }
      const typeLabel = typeLabels[input.type as string] || input.type
      return `Vytvořit ${typeLabel} "${input.subject}" v Pipedrive na ${input.due_date}${input.due_time ? ` v ${input.due_time}` : ''}`
    }
    case 'set_user_preference':
      return `Uložit preferenci: ${input.description}`
    case 'update_quote_item':
      return `Upravit položku v nabídce`
    case 'add_quote_item':
      return `Přidat položku "${input.name}" za ${formatPrice(input.unit_price as number)}`
    case 'remove_quote_item':
      return `Odebrat položku z nabídky`
    case 'apply_discount':
      if (input.discount_percent) {
        return `Aplikovat slevu ${input.discount_percent}% na variantu ${input.variant_key}`
      }
      return `Aplikovat slevu ${formatPrice(input.discount_amount as number)} na variantu ${input.variant_key}`
    case 'update_quote_status':
      return `Změnit stav nabídky na "${input.status}"`
    case 'add_note':
      return `Přidat poznámku k ${input.entity_type}`
    default:
      return `Provést akci "${toolName}"`
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(price)
}
