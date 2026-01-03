export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PipedriveStatus = 'pending' | 'success' | 'error'
export type ConfigurationSource = 'web' | 'manual' | 'phone'

// User types
export type UserRole = 'admin' | 'user'

// Quote types
export type ProductCategory =
  | 'bazeny'
  | 'zastreseni'
  | 'sluzby'
  | 'doprava'
  | 'prislusenstvi'
  | 'schodiste'
  | 'uprava_vody'
  | 'protiproud'
  | 'technologie'
  | 'material'
  | 'ohrev'
  | 'osvetleni'
  | 'cisteni'
  | 'chemie'
  | 'jine'
  | 'sety'
export type QuoteItemCategory = ProductCategory | 'prace'

// Configuration status - lifecycle of a configuration
export type ConfigurationStatus = 'new' | 'processed'

// Quote status - lifecycle of a quote
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

// Order status - lifecycle of an order (simplified)
export type OrderStatus = 'created' | 'sent' | 'in_production'

// Production order status - lifecycle of a production order (výrobák)
export type ProductionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type PoolShape = 'circle' | 'rectangle_rounded' | 'rectangle_sharp'
export type PoolType = 'skimmer' | 'overflow'
export type PoolColor = 'blue' | 'white' | 'gray' | 'combination'
export type StairsType = 'none' | 'roman' | 'corner_triangle' | 'full_width' | 'with_bench' | 'corner_square'
export type TechnologyLocation = 'shaft' | 'wall' | 'other'
export type LightingOption = 'none' | 'led'
export type CounterflowOption = 'none' | 'with_counterflow'
export type WaterTreatment = 'chlorine' | 'salt'
export type HeatingOption = 'none' | 'preparation' | 'heat_pump'
export type RoofingOption = 'none' | 'with_roofing'

export interface PoolDimensions {
  diameter?: number
  width?: number
  length?: number
  depth: number
}

export interface Database {
  public: {
    Tables: {
      configurations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          // Contact
          contact_name: string
          contact_email: string
          contact_phone: string | null
          contact_address: string | null
          message: string | null
          // Pool configuration
          pool_shape: string
          pool_type: string
          dimensions: PoolDimensions
          color: string
          stairs: string
          technology: string
          // Accessories (individual fields, not array)
          lighting: string
          counterflow: string
          water_treatment: string
          heating: string
          roofing: string
          // Integration
          pipedrive_status: string
          pipedrive_deal_id: string | null
          pipedrive_person_id: number | null
          pipedrive_error: string | null
          pipedrive_synced_at: string | null
          // Email tracking
          email_sent_at: string | null
          email_error: string | null
          // Meta
          source: string
          notes: string | null
          is_deleted: boolean
          // Status
          status: ConfigurationStatus
          // Idempotency
          idempotency_key: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          contact_name: string
          contact_email: string
          contact_phone?: string | null
          contact_address?: string | null
          message?: string | null
          pool_shape: string
          pool_type: string
          dimensions: PoolDimensions
          color: string
          stairs: string
          technology?: string
          lighting?: string
          counterflow?: string
          water_treatment?: string
          heating: string
          roofing: string
          pipedrive_status?: string
          pipedrive_deal_id?: string | null
          pipedrive_person_id?: number | null
          pipedrive_error?: string | null
          pipedrive_synced_at?: string | null
          email_sent_at?: string | null
          email_error?: string | null
          source?: string
          notes?: string | null
          is_deleted?: boolean
          status?: ConfigurationStatus
          idempotency_key?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          contact_name?: string
          contact_email?: string
          contact_phone?: string | null
          contact_address?: string | null
          message?: string | null
          pool_shape?: string
          pool_type?: string
          dimensions?: PoolDimensions
          color?: string
          stairs?: string
          technology?: string
          lighting?: string
          counterflow?: string
          water_treatment?: string
          heating?: string
          roofing?: string
          pipedrive_status?: string
          pipedrive_deal_id?: string | null
          pipedrive_person_id?: number | null
          pipedrive_error?: string | null
          pipedrive_synced_at?: string | null
          email_sent_at?: string | null
          email_error?: string | null
          source?: string
          notes?: string | null
          is_deleted?: boolean
          status?: ConfigurationStatus
          idempotency_key?: string | null
        }
      }
      sync_log: {
        Row: {
          id: string
          configuration_id: string
          created_at: string
          action: string
          status: string
          response: Record<string, unknown> | null
          error_message: string | null
        }
        Insert: {
          id?: string
          configuration_id: string
          created_at?: string
          action: string
          status: string
          response?: Record<string, unknown> | null
          error_message?: string | null
        }
        Update: {
          id?: string
          configuration_id?: string
          created_at?: string
          action?: string
          status?: string
          response?: Record<string, unknown> | null
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      pipedrive_status: PipedriveStatus
      configuration_source: ConfigurationSource
    }
  }
}

export type Configuration = Database['public']['Tables']['configurations']['Row']
export type ConfigurationInsert = Database['public']['Tables']['configurations']['Insert']
export type ConfigurationUpdate = Database['public']['Tables']['configurations']['Update']
export type SyncLog = Database['public']['Tables']['sync_log']['Row']

// Product types
export interface Product {
  id: string
  created_at: string
  updated_at: string
  pipedrive_id: number | null
  pipedrive_synced_at: string | null
  name: string
  code: string | null
  old_code: string | null
  description: string | null
  category: ProductCategory
  subcategory: string | null
  manufacturer: string | null
  unit_price: number
  unit: string
  image_url: string | null
  active: boolean
}

export interface ProductInsert {
  id?: string
  pipedrive_id?: number | null
  pipedrive_synced_at?: string | null
  name: string
  code?: string | null
  old_code?: string | null
  description?: string | null
  category: ProductCategory
  subcategory?: string | null
  manufacturer?: string | null
  unit_price?: number
  unit?: string
  image_url?: string | null
  active?: boolean
}

export interface ProductUpdate {
  pipedrive_id?: number | null
  pipedrive_synced_at?: string | null
  name?: string
  code?: string | null
  old_code?: string | null
  description?: string | null
  category?: ProductCategory
  subcategory?: string | null
  manufacturer?: string | null
  unit_price?: number
  unit?: string
  image_url?: string | null
  active?: boolean
}

// Reference photo types
export interface ReferencePhoto {
  id: string
  created_at: string
  title: string
  description: string | null
  image_url: string
  pool_shape: PoolShape | null
  pool_type: PoolType | null
  pool_color: PoolColor | null
  tags: string[] | null
  sort_order: number
  active: boolean
}

// User profile types
export interface UserProfile {
  id: string
  created_at: string
  updated_at: string
  full_name: string
  email: string | null
  phone: string | null
  role: UserRole
  active: boolean
}

export interface UserProfileInsert {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  role?: UserRole
  active?: boolean
}

export interface UserProfileUpdate {
  full_name?: string
  email?: string | null
  phone?: string | null
  role?: UserRole
  active?: boolean
}

// Quote types
export interface Quote {
  id: string
  created_at: string
  updated_at: string
  quote_number: string
  configuration_id: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_address: string | null
  pool_config: Json | null
  valid_until: string | null
  delivery_term: string | null
  subtotal: number
  discount_percent: number
  discount_amount: number
  total_price: number
  notes: string | null
  internal_notes: string | null
  terms_and_conditions: string | null
  created_by: string | null
  // Status tracking
  status: QuoteStatus
  sent_at: string | null
  accepted_at: string | null
}

export interface QuoteInsert {
  id?: string
  quote_number: string
  configuration_id?: string | null
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  pool_config?: Json | null
  valid_until?: string | null
  delivery_term?: string | null
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  notes?: string | null
  internal_notes?: string | null
  terms_and_conditions?: string | null
  created_by?: string | null
  // Status tracking
  status?: QuoteStatus
  sent_at?: string | null
  accepted_at?: string | null
}

export interface QuoteUpdate {
  quote_number?: string
  configuration_id?: string | null
  customer_name?: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  pool_config?: Json | null
  valid_until?: string | null
  delivery_term?: string | null
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  notes?: string | null
  internal_notes?: string | null
  terms_and_conditions?: string | null
  created_by?: string | null
  // Status tracking
  status?: QuoteStatus
  sent_at?: string | null
  accepted_at?: string | null
}

// Quote item types
export interface QuoteItem {
  id: string
  created_at: string
  quote_id: string
  product_id: string | null
  name: string
  description: string | null
  category: QuoteItemCategory
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  sort_order: number
}

export interface QuoteItemInsert {
  id?: string
  quote_id: string
  product_id?: string | null
  name: string
  description?: string | null
  category: QuoteItemCategory
  quantity?: number
  unit?: string
  unit_price: number
  total_price: number
  sort_order?: number
}

// Quote version types
export interface QuoteVersion {
  id: string
  created_at: string
  quote_id: string
  version_number: number
  snapshot: Json
  pdf_url: string | null
  pdf_generated_at: string | null
  created_by: string | null
  notes: string | null
}

// Quote with items (for display)
export interface QuoteWithItems extends Quote {
  items: QuoteItem[]
  configuration?: Configuration | null
  creator?: UserProfile | null
}

// =============================================================================
// Product Mapping Types
// =============================================================================

// Config field types for mapping rules
export type ConfigField =
  | 'stairs'
  | 'technology'
  | 'lighting'
  | 'counterflow'
  | 'waterTreatment'
  | 'heating'
  | 'roofing'

// Product mapping rule - maps configurator choices to products
export interface ProductMappingRule {
  id: string
  created_at: string
  updated_at: string
  name: string
  description: string | null
  product_id: string | null
  config_field: ConfigField
  config_value: string
  pool_shape: PoolShape[] | null
  pool_type: PoolType[] | null
  quantity: number
  sort_order: number
  active: boolean
  // Joined data
  product?: Product | null
}

export interface ProductMappingRuleInsert {
  id?: string
  name: string
  description?: string | null
  product_id?: string | null
  config_field: ConfigField
  config_value: string
  pool_shape?: PoolShape[] | null
  pool_type?: PoolType[] | null
  quantity?: number
  sort_order?: number
  active?: boolean
}

export interface ProductMappingRuleUpdate {
  name?: string
  description?: string | null
  product_id?: string | null
  config_field?: ConfigField
  config_value?: string
  pool_shape?: PoolShape[] | null
  pool_type?: PoolType[] | null
  quantity?: number
  sort_order?: number
  active?: boolean
}

// Pool base price - maps pool dimensions to products
export interface PoolBasePrice {
  id: string
  created_at: string
  product_id: string | null
  pool_shape: PoolShape
  pool_type: PoolType
  width: number | null
  length: number | null
  diameter: number | null
  depth: number
  active: boolean
  // Joined data
  product?: Product | null
}

export interface PoolBasePriceInsert {
  id?: string
  product_id?: string | null
  pool_shape: PoolShape
  pool_type: PoolType
  width?: number | null
  length?: number | null
  diameter?: number | null
  depth: number
  active?: boolean
}

export interface PoolBasePriceUpdate {
  product_id?: string | null
  pool_shape?: PoolShape
  pool_type?: PoolType
  width?: number | null
  length?: number | null
  diameter?: number | null
  depth?: number
  active?: boolean
}

// Generated quote item (before saving to DB)
export interface GeneratedQuoteItem {
  product_id: string | null
  name: string
  description: string | null
  category: QuoteItemCategory
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  sort_order: number
  // Metadata for UI
  source?: 'pool_base_price' | 'mapping_rule'
  rule_id?: string
}

// =============================================================================
// Quote Variant Types
// =============================================================================

export type QuoteVariantKey = 'ekonomicka' | 'optimalni' | 'premiova'

// Quote variant - represents one pricing option (e.g., Ekonomická, Optimální, Prémiová)
export interface QuoteVariant {
  id: string
  created_at: string
  quote_id: string
  variant_key: QuoteVariantKey
  variant_name: string
  sort_order: number
  subtotal: number
  discount_percent: number
  discount_amount: number
  total_price: number
}

export interface QuoteVariantInsert {
  id?: string
  quote_id: string
  variant_key: QuoteVariantKey
  variant_name: string
  sort_order?: number
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
}

export interface QuoteVariantUpdate {
  variant_name?: string
  sort_order?: number
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
}

// Quote item with variant associations
export interface QuoteItemWithVariants extends QuoteItem {
  variant_ids: string[]  // Which variants include this item
}

// Quote variant with its items
export interface QuoteVariantWithItems extends QuoteVariant {
  items: QuoteItem[]
}

// Full quote with variants and items
export interface QuoteWithVariants extends Quote {
  variants: QuoteVariantWithItems[]
  items: QuoteItemWithVariants[]  // All items with their variant associations
}

// =============================================================================
// Order Types
// =============================================================================

export interface Order {
  id: string
  created_at: string
  updated_at: string
  order_number: string
  quote_id: string | null
  status: OrderStatus
  // Customer info
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_ico: string | null
  customer_dic: string | null
  // Contract details
  contract_date: string | null
  delivery_date: string | null
  delivery_address: string | null
  // Pool configuration (copied from quote)
  pool_config: Json | null
  // Pricing
  subtotal: number
  discount_percent: number
  discount_amount: number
  total_price: number
  // Payment tracking
  deposit_amount: number
  deposit_paid_at: string | null
  final_payment_at: string | null
  // Notes
  notes: string | null
  internal_notes: string | null
  // Audit
  created_by: string | null
}

export interface OrderInsert {
  id?: string
  order_number: string
  quote_id?: string | null
  status?: OrderStatus
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  customer_ico?: string | null
  customer_dic?: string | null
  contract_date?: string | null
  delivery_date?: string | null
  delivery_address?: string | null
  pool_config?: Json | null
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  deposit_amount?: number
  deposit_paid_at?: string | null
  final_payment_at?: string | null
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
}

export interface OrderUpdate {
  order_number?: string
  quote_id?: string | null
  status?: OrderStatus
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  customer_ico?: string | null
  customer_dic?: string | null
  contract_date?: string | null
  delivery_date?: string | null
  delivery_address?: string | null
  pool_config?: Json | null
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  deposit_amount?: number
  deposit_paid_at?: string | null
  final_payment_at?: string | null
  notes?: string | null
  internal_notes?: string | null
}

// Order item types
export interface OrderItem {
  id: string
  created_at: string
  order_id: string
  product_id: string | null
  name: string
  description: string | null
  category: QuoteItemCategory
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  sort_order: number
}

export interface OrderItemInsert {
  id?: string
  order_id: string
  product_id?: string | null
  name: string
  description?: string | null
  category?: QuoteItemCategory
  quantity?: number
  unit?: string
  unit_price: number
  total_price: number
  sort_order?: number
}

export interface OrderItemUpdate {
  product_id?: string | null
  name?: string
  description?: string | null
  category?: QuoteItemCategory
  quantity?: number
  unit?: string
  unit_price?: number
  total_price?: number
  sort_order?: number
}

// Order with items (for display)
export interface OrderWithItems extends Order {
  items: OrderItem[]
  quote?: Quote | null
  creator?: UserProfile | null
}

// =============================================================================
// Status Label Helpers
// =============================================================================

export const CONFIGURATION_STATUS_LABELS: Record<ConfigurationStatus, string> = {
  new: 'Nová',
  processed: 'Zpracovaná',
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Koncept',
  sent: 'Odesláno',
  accepted: 'Akceptováno',
  rejected: 'Odmítnuto',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Nová',
  sent: 'Odeslaná',
  in_production: 'Předána do výroby',
}

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  pending: 'Čeká',
  in_progress: 'Ve výrobě',
  completed: 'Hotovo',
  cancelled: 'Zrušeno',
}

// =============================================================================
// Production Order Types (Výrobní zadání / Výrobák)
// =============================================================================

export interface ProductionOrder {
  id: string
  created_at: string
  updated_at: string
  production_number: string
  order_id: string
  status: ProductionStatus
  // Assignment
  assigned_to: string | null
  // Dates
  production_start_date: string | null
  production_end_date: string | null
  assembly_date: string | null
  // Pool specs (cached from order)
  pool_shape: string | null
  pool_type: string | null
  pool_dimensions: string | null
  pool_color: string | null
  pool_depth: string | null
  // Notes
  notes: string | null
  internal_notes: string | null
  // Audit
  created_by: string | null
}

export interface ProductionOrderInsert {
  id?: string
  production_number: string
  order_id: string
  status?: ProductionStatus
  assigned_to?: string | null
  production_start_date?: string | null
  production_end_date?: string | null
  assembly_date?: string | null
  pool_shape?: string | null
  pool_type?: string | null
  pool_dimensions?: string | null
  pool_color?: string | null
  pool_depth?: string | null
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
}

export interface ProductionOrderUpdate {
  production_number?: string
  status?: ProductionStatus
  assigned_to?: string | null
  production_start_date?: string | null
  production_end_date?: string | null
  assembly_date?: string | null
  pool_shape?: string | null
  pool_type?: string | null
  pool_dimensions?: string | null
  pool_color?: string | null
  pool_depth?: string | null
  notes?: string | null
  internal_notes?: string | null
}

// Production order item (materiálový kusovník)
export interface ProductionOrderItem {
  id: string
  created_at: string
  production_order_id: string
  material_code: string | null
  material_name: string
  description: string | null
  quantity: number
  unit: string
  checked: boolean
  checked_at: string | null
  checked_by: string | null
  sort_order: number
  category: string | null
}

export interface ProductionOrderItemInsert {
  id?: string
  production_order_id: string
  material_code?: string | null
  material_name: string
  description?: string | null
  quantity?: number
  unit?: string
  checked?: boolean
  checked_at?: string | null
  checked_by?: string | null
  sort_order?: number
  category?: string | null
}

export interface ProductionOrderItemUpdate {
  material_code?: string | null
  material_name?: string
  description?: string | null
  quantity?: number
  unit?: string
  checked?: boolean
  checked_at?: string | null
  checked_by?: string | null
  sort_order?: number
  category?: string | null
}

// Production order with items (for display)
export interface ProductionOrderWithItems extends ProductionOrder {
  items: ProductionOrderItem[]
  order?: Order | null
  creator?: UserProfile | null
}
