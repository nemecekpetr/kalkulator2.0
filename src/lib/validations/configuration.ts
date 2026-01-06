import { z } from 'zod'

// Pool shape options
export const PoolShapeEnum = z.enum(['circle', 'rectangle_rounded', 'rectangle_sharp'])
export type PoolShape = z.infer<typeof PoolShapeEnum>

// Pool type options
export const PoolTypeEnum = z.enum(['skimmer', 'overflow'])
export type PoolType = z.infer<typeof PoolTypeEnum>

// Pool color options
export const PoolColorEnum = z.enum(['blue', 'white', 'gray', 'combination'])
export type PoolColor = z.infer<typeof PoolColorEnum>

// Stairs options
export const StairsTypeEnum = z.enum([
  'none',
  'roman',
  'corner_triangle',
  'full_width',
  'with_bench',
  'corner_square'
])
export type StairsType = z.infer<typeof StairsTypeEnum>

// Technology location options
export const TechnologyLocationEnum = z.enum(['shaft', 'wall', 'other'])
export type TechnologyLocation = z.infer<typeof TechnologyLocationEnum>

// Lighting options
export const LightingOptionEnum = z.enum(['none', 'led'])
export type LightingOption = z.infer<typeof LightingOptionEnum>

// Counterflow options
export const CounterflowOptionEnum = z.enum(['none', 'with_counterflow'])
export type CounterflowOption = z.infer<typeof CounterflowOptionEnum>

// Water treatment options
export const WaterTreatmentEnum = z.enum(['chlorine', 'salt'])
export type WaterTreatment = z.infer<typeof WaterTreatmentEnum>

// Heating options
export const HeatingOptionEnum = z.enum(['none', 'preparation', 'heat_pump'])
export type HeatingOption = z.infer<typeof HeatingOptionEnum>

// Roofing options
export const RoofingOptionEnum = z.enum(['none', 'with_roofing'])
export type RoofingOption = z.infer<typeof RoofingOptionEnum>

// Available dimensions based on MVP configurator
// Note: Must match DIMENSION_OPTIONS in configurator.ts
export const CIRCLE_DIAMETERS = [1.5, 2, 2.5, 3, 3.5, 4] as const
export const CIRCLE_DEPTHS = [0.5, 0.75, 1, 1.2, 1.35, 1.5] as const
export const RECTANGLE_WIDTHS = [2, 2.5, 3, 3.5, 4] as const
export const RECTANGLE_LENGTHS = [4, 5, 6, 7, 8] as const
export const RECTANGLE_DEPTHS = [1.2, 1.3, 1.4, 1.5] as const

// Dimensions schema - validates based on shape
export const DimensionsSchema = z.object({
  diameter: z.number().min(1.5).max(4).optional(),
  width: z.number().min(2).max(4).optional(),
  length: z.number().min(4).max(8).optional(),
  depth: z.number().min(0.5).max(1.5)
})

export type PoolDimensions = z.infer<typeof DimensionsSchema>

// Discriminated dimension types for type-safe state management
export type CircleDimensions = {
  diameter: number
  depth: number
}

export type RectangleDimensions = {
  width: number
  length: number
  depth: number
}

// Type guard functions
export function isCircleDimensions(
  dimensions: Partial<PoolDimensions> | null
): dimensions is CircleDimensions {
  return dimensions !== null &&
    typeof dimensions.diameter === 'number' &&
    typeof dimensions.depth === 'number'
}

export function isRectangleDimensions(
  dimensions: Partial<PoolDimensions> | null
): dimensions is RectangleDimensions {
  return dimensions !== null &&
    typeof dimensions.width === 'number' &&
    typeof dimensions.length === 'number' &&
    typeof dimensions.depth === 'number'
}

// Validate dimensions based on shape
export function areDimensionsValidForShape(
  shape: PoolShape | null,
  dimensions: Partial<PoolDimensions> | null
): boolean {
  if (!shape || !dimensions) return false

  if (shape === 'circle') {
    return isCircleDimensions(dimensions)
  }
  return isRectangleDimensions(dimensions)
}

// Contact schema
export const ContactSchema = z.object({
  name: z.string().min(2, 'Jmeno musi mit alespon 2 znaky'),
  email: z.string().email('Neplatny format emailu'),
  phone: z.string()
    .min(9, 'Telefon musi mit alespon 9 znaku')
    .regex(/^[\d\s\-\+]+$/, 'Telefon muze obsahovat pouze cisla, mezery, pomlcky a +'),
  address: z.string().optional()
})

export type ContactData = z.infer<typeof ContactSchema>

// Step 1: Shape
export const Step1Schema = z.object({
  shape: PoolShapeEnum
})

// Step 2: Type
export const Step2Schema = z.object({
  type: PoolTypeEnum
})

// Step 3: Dimensions (conditional based on shape)
export const Step3Schema = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('circle'),
    diameter: z.number().refine(val => CIRCLE_DIAMETERS.includes(val as typeof CIRCLE_DIAMETERS[number]), {
      message: 'Neplatny prumer'
    }),
    depth: z.number().refine(val => CIRCLE_DEPTHS.includes(val as typeof CIRCLE_DEPTHS[number]), {
      message: 'Neplatna hloubka'
    })
  }),
  z.object({
    shape: z.literal('rectangle_rounded'),
    width: z.number().refine(val => RECTANGLE_WIDTHS.includes(val as typeof RECTANGLE_WIDTHS[number]), {
      message: 'Neplatna sirka'
    }),
    length: z.number().refine(val => RECTANGLE_LENGTHS.includes(val as typeof RECTANGLE_LENGTHS[number]), {
      message: 'Neplatna delka'
    }),
    depth: z.number().refine(val => RECTANGLE_DEPTHS.includes(val as typeof RECTANGLE_DEPTHS[number]), {
      message: 'Neplatna hloubka'
    })
  }),
  z.object({
    shape: z.literal('rectangle_sharp'),
    width: z.number().refine(val => RECTANGLE_WIDTHS.includes(val as typeof RECTANGLE_WIDTHS[number]), {
      message: 'Neplatna sirka'
    }),
    length: z.number().refine(val => RECTANGLE_LENGTHS.includes(val as typeof RECTANGLE_LENGTHS[number]), {
      message: 'Neplatna delka'
    }),
    depth: z.number().refine(val => RECTANGLE_DEPTHS.includes(val as typeof RECTANGLE_DEPTHS[number]), {
      message: 'Neplatna hloubka'
    })
  })
])

// Step 4: Color
export const Step4Schema = z.object({
  color: PoolColorEnum
})

// Step 5: Stairs (conditional - skipped for circle)
export const Step5Schema = z.object({
  stairs: StairsTypeEnum
})

// Step 6: Technology
export const Step6Schema = z.object({
  technology: TechnologyLocationEnum
})

// Step 7: Accessories
export const Step7Schema = z.object({
  lighting: LightingOptionEnum,
  counterflow: CounterflowOptionEnum,
  waterTreatment: WaterTreatmentEnum
})

// Step 8: Heating
export const Step8Schema = z.object({
  heating: HeatingOptionEnum
})

// Step 9: Roofing
export const Step9Schema = z.object({
  roofing: RoofingOptionEnum
})

// Step 10: Contact
export const Step10Schema = ContactSchema

// Full configuration schema
export const ConfigurationSchema = z.object({
  // Pool
  shape: PoolShapeEnum,
  type: PoolTypeEnum,
  dimensions: DimensionsSchema,
  color: PoolColorEnum,
  stairs: StairsTypeEnum,
  technology: TechnologyLocationEnum,
  lighting: LightingOptionEnum,
  counterflow: CounterflowOptionEnum,
  waterTreatment: WaterTreatmentEnum,
  heating: HeatingOptionEnum,
  roofing: RoofingOptionEnum,
  // Contact
  contact: ContactSchema,
  // Security
  turnstileToken: z.string().optional()
}).refine(
  (data) => {
    // Circle pools cannot have stairs other than 'none'
    if (data.shape === 'circle' && data.stairs !== 'none') {
      return false
    }
    return true
  },
  {
    message: 'Kruhovy bazen nemuze mit schodiste',
    path: ['stairs']
  }
).refine(
  (data) => {
    // Validate dimensions based on shape
    if (data.shape === 'circle') {
      return data.dimensions.diameter !== undefined
    } else {
      return data.dimensions.width !== undefined && data.dimensions.length !== undefined
    }
  },
  {
    message: 'Neplatne rozmery pro zvoleny tvar',
    path: ['dimensions']
  }
)

export type ConfigurationFormData = z.infer<typeof ConfigurationSchema>

// Schema for API submission (includes server-side fields)
// Note: ConfigurationSchema already has turnstileToken as optional,
// so we just use the base schema for submission validation
export const ConfigurationSubmitSchema = ConfigurationSchema

// Schema for database insert
export const ConfigurationInsertSchema = z.object({
  contact_name: z.string(),
  contact_email: z.string().email(),
  contact_phone: z.string(),
  contact_address: z.string().nullable(),
  pool_shape: PoolShapeEnum,
  pool_type: PoolTypeEnum,
  dimensions: DimensionsSchema,
  color: PoolColorEnum,
  stairs: StairsTypeEnum,
  technology: TechnologyLocationEnum,
  lighting: LightingOptionEnum,
  counterflow: CounterflowOptionEnum,
  water_treatment: WaterTreatmentEnum,
  heating: HeatingOptionEnum,
  roofing: RoofingOptionEnum,
  source: z.enum(['web', 'manual', 'phone']).default('web'),
  notes: z.string().nullable().optional()
})

export type ConfigurationInsertData = z.infer<typeof ConfigurationInsertSchema>
