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
export type ProductCategory = 'bazeny' | 'prislusenstvi' | 'sluzby' | 'doprava'
export type QuoteItemCategory = 'bazeny' | 'prislusenstvi' | 'sluzby' | 'prace' | 'doprava' | 'jine'

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
          technology: string[]
          accessories: string[]
          heating: string
          roofing: string
          // Integration
          pipedrive_status: string
          pipedrive_deal_id: string | null
          pipedrive_error: string | null
          pipedrive_synced_at: string | null
          // Meta
          source: string
          notes: string | null
          is_deleted: boolean
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
          technology?: string[]
          accessories?: string[]
          heating: string
          roofing: string
          pipedrive_status?: string
          pipedrive_deal_id?: string | null
          pipedrive_error?: string | null
          pipedrive_synced_at?: string | null
          source?: string
          notes?: string | null
          is_deleted?: boolean
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
          technology?: string[]
          accessories?: string[]
          heating?: string
          roofing?: string
          pipedrive_status?: string
          pipedrive_deal_id?: string | null
          pipedrive_error?: string | null
          pipedrive_synced_at?: string | null
          source?: string
          notes?: string | null
          is_deleted?: boolean
        }
      }
      sync_log: {
        Row: {
          id: string
          configuration_id: string
          created_at: string
          status: string
          error_message: string | null
        }
        Insert: {
          id?: string
          configuration_id: string
          created_at?: string
          status: string
          error_message?: string | null
        }
        Update: {
          id?: string
          configuration_id?: string
          created_at?: string
          status?: string
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
  description: string | null
  category: ProductCategory
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
  description?: string | null
  category: ProductCategory
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
  description?: string | null
  category?: ProductCategory
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
  subtotal: number
  discount_percent: number
  discount_amount: number
  total_price: number
  notes: string | null
  internal_notes: string | null
  terms_and_conditions: string | null
  created_by: string | null
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
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  notes?: string | null
  internal_notes?: string | null
  terms_and_conditions?: string | null
  created_by?: string | null
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
  subtotal?: number
  discount_percent?: number
  discount_amount?: number
  total_price?: number
  notes?: string | null
  internal_notes?: string | null
  terms_and_conditions?: string | null
  created_by?: string | null
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
