// Step labels and descriptions
export const STEPS = [
  { number: 1, title: 'Tvar', description: 'Vyberte tvar bazénu' },
  { number: 2, title: 'Typ', description: 'Skimmerový nebo přelivový' },
  { number: 3, title: 'Rozměry', description: 'Zadejte rozměry bazénu' },
  { number: 4, title: 'Barva', description: 'Vyberte barvu bazénu' },
  { number: 5, title: 'Schodiště', description: 'Typ vstupu do bazénu' },
  { number: 6, title: 'Technologie', description: 'Umístění technologie' },
  { number: 7, title: 'Příslušenství', description: 'Osvětlení, protiproud, úprava vody' },
  { number: 8, title: 'Ohřev', description: 'Způsob ohřevu vody' },
  { number: 9, title: 'Zastřešení', description: 'Ochrana bazénu' },
  { number: 10, title: 'Kontakt', description: 'Vaše kontaktní údaje' },
  { number: 11, title: 'Shrnutí', description: 'Přehled konfigurace' }
] as const

// Pool shapes
export const POOL_SHAPES = [
  {
    id: 'circle',
    label: 'Kruhový',
    description: 'Kruhový design pro menší zahrady',
    benefits: ['Ideální pro relaxaci', 'Úsporné řešení'],
    tag: 'Nejlevnější',
    icon: 'circle'
  },
  {
    id: 'rectangle_rounded',
    label: 'Obdélník se zaoblenými rohy',
    description: 'Měkčí zakončení, elegantní vzhled',
    benefits: ['Přirozený vzhled', 'Elegantní design'],
    tag: 'Tradiční',
    icon: 'rounded-rectangle'
  },
  {
    id: 'rectangle_sharp',
    label: 'Obdélník s ostrými rohy',
    description: 'Klasické pravoúhlé hranice',
    benefits: ['Nejprodávanější', 'Moderní vzhled'],
    tag: 'Moderní',
    icon: 'rectangle'
  }
] as const

// Pool types
export const POOL_TYPES = [
  {
    id: 'skimmer',
    label: 'Skimmerový',
    description: 'Klasický typ s hladinou cca 15 cm pod okrajem, voda nasávaná povrchovými skimmery',
    tag: 'Nejoblíbenější',
    pros: ['Nižší pořizovací náklady', 'Jednoduchá údržba', 'Osvědčená technologie'],
    cons: ['Viditelná hladina pod okrajem']
  },
  {
    id: 'overflow',
    label: 'Přelivový',
    description: 'Prémiový typ, voda přetéká přes okraj do žlabu, efekt nekonečného bazénu',
    tag: 'Premium',
    pros: ['Efekt nekonečného bazénu', 'Čistá hladina', 'Luxusní vzhled'],
    cons: ['Vyšší pořizovací náklady', 'Složitější technologie']
  }
] as const

// Pool colors
export const POOL_COLORS = [
  {
    id: 'blue',
    label: 'Modrá',
    description: 'Klasická modrá barva bazénu',
    hex: '#0077b6',
    waterColor: '#48cae4'
  },
  {
    id: 'white',
    label: 'Bílá',
    description: 'Čistý, elegantní vzhled',
    hex: '#f8f9fa',
    waterColor: '#90e0ef'
  },
  {
    id: 'gray',
    label: 'Šedivá',
    description: 'Moderní, sofistikovaný design',
    hex: '#6c757d',
    waterColor: '#0096c7'
  },
  {
    id: 'combination',
    label: 'Kombinace barev',
    description: 'Barva dna a stěn může být nakombinována',
    hex: 'linear-gradient(135deg, #0077b6 0%, #90e0ef 100%)',
    waterColor: '#48cae4'
  }
] as const

// Stairs types
export const STAIRS_TYPES = [
  {
    id: 'none',
    label: 'Bez schodiště',
    description: 'Vstup pomocí vnějšího žebříčku',
    imageKey: 'stairs-none'
  },
  {
    id: 'roman',
    label: 'Románské',
    description: 'Elegantní půlkruhové schodiště s oblými tvary',
    imageKey: 'stairs-roman',
    tag: 'Nejoblíbenější'
  },
  {
    id: 'corner_triangle',
    label: 'Trojúhelníkové přes roh',
    description: 'Kompaktní rohové řešení',
    imageKey: 'stairs-corner-triangle'
  },
  {
    id: 'full_width',
    label: 'Přes celou šířku',
    description: 'Široké řešení táhnoucí se přes šířku, relaxační zóna',
    imageKey: 'stairs-full-width',
    tag: 'Premium'
  },
  {
    id: 'with_bench',
    label: 'S relaxační lavicí',
    description: 'Kombinace schodiště a vestavěné lavice',
    imageKey: 'stairs-bench',
    tag: 'Premium'
  },
  {
    id: 'corner_square',
    label: 'Hranaté rohové',
    description: 'Klasické pravoúhlé tvary',
    imageKey: 'stairs-corner-square'
  }
] as const

// Technology locations
export const TECHNOLOGY_LOCATIONS = [
  {
    id: 'shaft',
    label: 'Technologická šachta',
    description: 'Plastová šachta zapuštěná v zemi vedle bazénu, kompaktní řešení',
    tag: 'Doporučeno'
  },
  {
    id: 'wall',
    label: 'Technologická stěna',
    description: 'Na povrchu u bazénu, snadný přístup k technologii',
    tag: 'Moderní'
  },
  {
    id: 'other',
    label: 'Jiné umístění',
    description: 'Zahradní domek, sklep, technická místnost'
  }
] as const

// Lighting options
export const LIGHTING_OPTIONS = [
  {
    id: 'none',
    label: 'Bez osvětlení',
    description: 'Standardní konfigurace'
  },
  {
    id: 'led',
    label: 'S osvětlením',
    description: 'LED podvodní osvětlení pro atmosféru',
    tag: 'Doporučeno'
  }
] as const

// Counterflow options
export const COUNTERFLOW_OPTIONS = [
  {
    id: 'none',
    label: 'Bez protiproudu',
    description: 'Standardní konfigurace'
  },
  {
    id: 'with_counterflow',
    label: 'S protiproudem',
    description: 'Umožňuje plavání na místě, masáž, aqua fitness',
    tag: 'Sportovní'
  }
] as const

// Water treatment options
export const WATER_TREATMENT_OPTIONS = [
  {
    id: 'chlorine',
    label: 'Chlorová úprava',
    description: 'Klasická dezinfekce chlorem',
    tag: 'Tradiční'
  },
  {
    id: 'salt',
    label: 'Slaná úprava',
    description: 'Elektrolýza soli, šetrnější k pokožce',
    tag: 'Šetrné'
  }
] as const

// Heating options
export const HEATING_OPTIONS = [
  {
    id: 'none',
    label: 'Bez ohřevu',
    description: 'Přirozená teplota vody'
  },
  {
    id: 'preparation',
    label: 'Příprava odbočky',
    description: 'Připravíme rozvody pro budoucí instalaci'
  },
  {
    id: 'heat_pump',
    label: 'Tepelné čerpadlo',
    description: 'Kompletní instalace pro efektivní ohřev',
    tag: 'Doporučeno'
  }
] as const

// Roofing options
export const ROOFING_OPTIONS = [
  {
    id: 'none',
    label: 'Bez zastřešení',
    description: 'Nižší náklady na pořízení',
    pros: ['Nižší pořizovací náklady', 'Přímý přístup k bazénu'],
    cons: ['Více znečištění', 'Tepelné ztráty', 'Kratší sezóna']
  },
  {
    id: 'with_roofing',
    label: 'Se zastřešením',
    description: 'Čistější voda, nižší náklady na vytápění',
    tag: 'Doporučeno',
    pros: ['Čistější voda', 'Úspora až 70% na vytápění', 'Prodloužená sezóna', 'Bezpečnost pro děti a mazlíčky'],
    cons: ['Vyšší pořizovací náklady']
  }
] as const

// Dimension options
export const DIMENSION_OPTIONS = {
  circle: {
    diameters: [
      { value: 1.5, label: '1,5 m' },
      { value: 2, label: '2 m' },
      { value: 2.5, label: '2,5 m' },
      { value: 3, label: '3 m' },
      { value: 3.5, label: '3,5 m' },
      { value: 4, label: '4 m' },
      { value: 4.5, label: '4,5 m' }
    ],
    depths: [
      { value: 0.5, label: '0,5 m' },
      { value: 0.75, label: '0,75 m' },
      { value: 1, label: '1 m' },
      { value: 1.2, label: '1,2 m' },
      { value: 1.35, label: '1,35 m' },
      { value: 1.5, label: '1,5 m' }
    ]
  },
  rectangle: {
    widths: [
      { value: 2, label: '2 m' },
      { value: 2.5, label: '2,5 m' },
      { value: 3, label: '3 m' },
      { value: 3.5, label: '3,5 m' },
      { value: 4, label: '4 m' }
    ],
    lengths: [
      { value: 4, label: '4 m' },
      { value: 5, label: '5 m' },
      { value: 6, label: '6 m' },
      { value: 7, label: '7 m' },
      { value: 8, label: '8 m' }
    ],
    depths: [
      { value: 1.2, label: '1,2 m' },
      { value: 1.3, label: '1,3 m' },
      { value: 1.4, label: '1,4 m' },
      { value: 1.5, label: '1,5 m' }
    ]
  }
} as const

// Helper functions
export function getStepByNumber(stepNumber: number) {
  return STEPS.find(step => step.number === stepNumber)
}

export function getShapeLabel(shapeId: string) {
  return POOL_SHAPES.find(s => s.id === shapeId)?.label ?? shapeId
}

export function getTypeLabel(typeId: string) {
  return POOL_TYPES.find(t => t.id === typeId)?.label ?? typeId
}

export function getColorLabel(colorId: string) {
  return POOL_COLORS.find(c => c.id === colorId)?.label ?? colorId
}

export function getStairsLabel(stairsId: string) {
  return STAIRS_TYPES.find(s => s.id === stairsId)?.label ?? stairsId
}

export function getTechnologyLabel(techId: string) {
  return TECHNOLOGY_LOCATIONS.find(t => t.id === techId)?.label ?? techId
}

export function getLightingLabel(lightingId: string) {
  return LIGHTING_OPTIONS.find(l => l.id === lightingId)?.label ?? lightingId
}

export function getCounterflowLabel(counterflowId: string) {
  return COUNTERFLOW_OPTIONS.find(c => c.id === counterflowId)?.label ?? counterflowId
}

export function getWaterTreatmentLabel(treatmentId: string) {
  return WATER_TREATMENT_OPTIONS.find(w => w.id === treatmentId)?.label ?? treatmentId
}

export function getHeatingLabel(heatingId: string) {
  return HEATING_OPTIONS.find(h => h.id === heatingId)?.label ?? heatingId
}

export function getRoofingLabel(roofingId: string) {
  return ROOFING_OPTIONS.find(r => r.id === roofingId)?.label ?? roofingId
}

export function getAccessoryLabel(accessoryId: string) {
  // Accessories are a combination of lighting, counterflow, and water treatment
  const all = [
    ...LIGHTING_OPTIONS.map(o => ({ ...o, type: 'lighting' })),
    ...COUNTERFLOW_OPTIONS.map(o => ({ ...o, type: 'counterflow' })),
    ...WATER_TREATMENT_OPTIONS.map(o => ({ ...o, type: 'water_treatment' })),
  ]
  return all.find(a => a.id === accessoryId)?.label ?? accessoryId
}

// Aliases for admin form (with value/label format for select components)
export const STAIRS_OPTIONS = STAIRS_TYPES.map(s => ({ value: s.id, label: s.label }))
export const TECHNOLOGY_OPTIONS = TECHNOLOGY_LOCATIONS.map(t => ({ value: t.id, label: t.label }))
export const ACCESSORY_OPTIONS = [
  ...LIGHTING_OPTIONS.filter(o => o.id !== 'none').map(o => ({ value: o.id, label: o.label })),
  ...COUNTERFLOW_OPTIONS.filter(o => o.id !== 'none').map(o => ({ value: o.id, label: o.label })),
  ...WATER_TREATMENT_OPTIONS.map(o => ({ value: o.id, label: o.label })),
]

export function formatDimensions(
  shape: string,
  dimensions: { diameter?: number; width?: number; length?: number; depth?: number }
) {
  if (shape === 'circle' && dimensions.diameter && dimensions.depth) {
    return `Ø ${dimensions.diameter} m × ${dimensions.depth} m`
  }
  if (dimensions.width && dimensions.length && dimensions.depth) {
    return `${dimensions.length} m × ${dimensions.width} m × ${dimensions.depth} m`
  }
  return '-'
}
