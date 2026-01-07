import {
  Search,
  GitCompare,
  Calendar,
  Percent,
  History,
  TrendingUp,
  Factory,
  AlertCircle,
  LayoutDashboard,
  Clock,
  Package,
  type LucideIcon,
} from 'lucide-react'

export interface Suggestion {
  text: string
  icon: LucideIcon
}

/**
 * Mapování stránek na kontextové návrhy pro AI asistenta
 */
export const pageSuggestions: Record<string, Suggestion[]> = {
  // Dashboard
  '/admin/dashboard': [
    { text: 'Shrň dnešní aktivitu', icon: LayoutDashboard },
    { text: 'Jaké nabídky čekají na odpověď?', icon: Clock },
    { text: 'Kolik máme nových konfigurací tento týden?', icon: TrendingUp },
  ],

  // Seznam nabídek
  '/admin/nabidky': [
    { text: 'Najdi nabídky čekající na schválení', icon: Search },
    { text: 'Které nabídky expirují tento týden?', icon: Calendar },
    { text: 'Porovnej dvě nabídky', icon: GitCompare },
  ],

  // Detail nabídky (dynamická cesta)
  '/admin/nabidky/[id]': [
    { text: 'Přidej 5% slevu', icon: Percent },
    { text: 'Jaká je historie tohoto zákazníka?', icon: History },
    { text: 'Navrhni doplňkové produkty', icon: Package },
  ],

  // Seznam objednávek
  '/admin/objednavky': [
    { text: 'Které objednávky jsou ve výrobě?', icon: Factory },
    { text: 'Najdi objednávky bez termínu', icon: Calendar },
    { text: 'Zobraz poslední objednávky', icon: Clock },
  ],

  // Detail objednávky
  '/admin/objednavky/[id]': [
    { text: 'Jaký je stav výroby?', icon: Factory },
    { text: 'Historie zákazníka', icon: History },
    { text: 'Vytvoř follow-up aktivitu', icon: Calendar },
  ],

  // Seznam konfigurací
  '/admin/konfigurace': [
    { text: 'Zobraz nepřiřazené konfigurace', icon: AlertCircle },
    { text: 'Jaké konfigurace přišly tento týden?', icon: Calendar },
    { text: 'Najdi konfigurace bez kontaktu', icon: Search },
  ],

  // Detail konfigurace
  '/admin/konfigurace/[id]': [
    { text: 'Vytvoř nabídku z této konfigurace', icon: Package },
    { text: 'Jaká je historie zákazníka?', icon: History },
  ],

  // Produkty
  '/admin/produkty': [
    { text: 'Najdi nejprodávanější produkty', icon: TrendingUp },
    { text: 'Které produkty nemají cenu?', icon: AlertCircle },
    { text: 'Zobraz produkty bez mapování', icon: Search },
  ],

  // Výroba
  '/admin/vyroba': [
    { text: 'Které výroby jsou zpožděné?', icon: AlertCircle },
    { text: 'Zobraz aktuální výroby', icon: Factory },
  ],

  // Detail výroby
  '/admin/vyroba/[id]': [
    { text: 'Jaké jsou další kroky výroby?', icon: Factory },
    { text: 'Detail objednávky', icon: Package },
  ],
}

/**
 * Najde suggestions pro danou URL
 * Podporuje dynamicke cesty jako /admin/nabidky/[id]
 */
export function getSuggestionsForPath(pathname: string): Suggestion[] {
  // Zkus primo najit
  if (pageSuggestions[pathname]) {
    return pageSuggestions[pathname]
  }

  // Zkus dynamicke cesty - nahrad UUID patternema [id]
  const dynamicPath = pathname.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/[id]'
  )

  if (pageSuggestions[dynamicPath]) {
    return pageSuggestions[dynamicPath]
  }

  // Zkus zkratit cestu a najit parent
  const parts = pathname.split('/').filter(Boolean)
  while (parts.length > 1) {
    parts.pop()
    const parentPath = '/' + parts.join('/')
    if (pageSuggestions[parentPath]) {
      return pageSuggestions[parentPath]
    }
  }

  // Default suggestions pro admin
  return [
    { text: 'Jak ti můžu pomoct?', icon: Search },
    { text: 'Zobraz přehled', icon: LayoutDashboard },
  ]
}
