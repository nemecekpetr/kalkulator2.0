import { z } from 'zod'

/**
 * API Request validation schemas
 */

// Order update schema
export const OrderUpdateSchema = z.object({
  customer_name: z.string().min(1).max(255).optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().min(9).max(20).optional(),
  customer_address: z.string().max(500).optional().nullable(),
  customer_ico: z.string().max(20).optional().nullable(),
  customer_dic: z.string().max(20).optional().nullable(),
  contract_date: z.string().datetime().optional().nullable(),
  delivery_date: z.string().datetime().optional().nullable(),
  delivery_address: z.string().max(500).optional().nullable(),
  deposit_amount: z.number().min(0).optional().nullable(),
  deposit_paid_at: z.string().datetime().optional().nullable(),
  final_payment_at: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  internal_notes: z.string().max(5000).optional().nullable(),
}).strict()

// Order status schema
export const OrderStatusSchema = z.object({
  status: z.enum(['created', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled']),
})

// Quote status schema
export const QuoteStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']),
})

// Production order status schema
export const ProductionStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'on_hold']),
})

// Production order create schema
export const ProductionOrderCreateSchema = z.object({
  order_id: z.string().uuid(),
})

// Mapping rule schema
export const MappingRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  config_field: z.string().min(1).max(100),
  config_value: z.string().min(1).max(255),
  pool_shape: z.string().max(50).optional().nullable(),
  pool_type: z.string().max(50).optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  sort_order: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
})

// Product bulk update schema
export const ProductBulkUpdateSchema = z.object({
  products: z.array(z.object({
    id: z.string().uuid(),
    active: z.boolean().optional(),
    category: z.string().optional(),
  })).min(1).max(100),
})

// Product bulk delete schema
export const ProductBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

/**
 * Validate request body against schema
 * Returns parsed data or null with error message
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: messages }
    }
    return { success: false, error: 'Invalid request body' }
  }
}
