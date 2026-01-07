import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AssistantUserPreference,
  AssistantPreferenceType,
} from '@/lib/supabase/types'

interface LearnableAction {
  tool_name: string
  tool_input: Record<string, unknown>
  tool_result?: Record<string, unknown>
  success: boolean
}

/**
 * Service for learning user preferences from their actions
 */
export class PreferenceLearner {
  /**
   * Learn from a completed action
   */
  async learnFromAction(
    userId: string,
    action: LearnableAction
  ): Promise<void> {
    if (!action.success) return

    switch (action.tool_name) {
      case 'apply_discount':
        await this.learnDiscountPreference(userId, action)
        break
      case 'add_quote_item':
        await this.learnProductPreference(userId, action)
        break
      case 'create_pipedrive_activity':
        await this.learnActivityPreference(userId, action)
        break
    }
  }

  /**
   * Learn discount preferences from apply_discount actions
   */
  private async learnDiscountPreference(
    userId: string,
    action: LearnableAction
  ): Promise<void> {
    const discountPercent = action.tool_input.discount_percent as number
    if (!discountPercent) return

    const supabase = await createAdminClient()

    // Get existing preference
    const { data: existing } = await supabase
      .from('assistant_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('preference_type', 'discount_range')
      .eq('preference_key', 'typical')
      .single()

    if (existing) {
      // Update with running average
      const currentValue = existing.preference_value as {
        min: number
        max: number
        avg: number
        values: number[]
      }
      const values = [...(currentValue.values || []), discountPercent].slice(
        -10
      ) // Keep last 10
      const avg =
        values.reduce((a, b) => a + b, 0) / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)

      await supabase
        .from('assistant_user_preferences')
        .update({
          preference_value: { min, max, avg, values },
          observation_count: (existing.observation_count || 0) + 1,
          confidence: Math.min(
            0.9,
            0.3 + (existing.observation_count || 0) * 0.1
          ),
        })
        .eq('id', existing.id)
    } else {
      // Create new preference
      await supabase.from('assistant_user_preferences').insert({
        user_id: userId,
        preference_type: 'discount_range',
        preference_key: 'typical',
        preference_value: {
          min: discountPercent,
          max: discountPercent,
          avg: discountPercent,
          values: [discountPercent],
        },
        learned_from: 'implicit',
        confidence: 0.3,
        observation_count: 1,
      })
    }
  }

  /**
   * Learn product preferences from add_quote_item actions
   */
  private async learnProductPreference(
    userId: string,
    action: LearnableAction
  ): Promise<void> {
    const category = action.tool_input.category as string
    const productId = action.tool_input.product_id as string
    if (!category) return

    const supabase = await createAdminClient()

    // Track favorite categories
    const { data: existing } = await supabase
      .from('assistant_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('preference_type', 'favorite_products')
      .eq('preference_key', 'categories')
      .single()

    if (existing) {
      const categories = existing.preference_value as Record<string, number>
      categories[category] = (categories[category] || 0) + 1

      await supabase
        .from('assistant_user_preferences')
        .update({
          preference_value: categories,
          observation_count: (existing.observation_count || 0) + 1,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('assistant_user_preferences').insert({
        user_id: userId,
        preference_type: 'favorite_products',
        preference_key: 'categories',
        preference_value: { [category]: 1 },
        learned_from: 'implicit',
        confidence: 0.3,
        observation_count: 1,
      })
    }

    // Also track specific products if product_id is provided
    if (productId) {
      const { data: productPref } = await supabase
        .from('assistant_user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('preference_type', 'favorite_products')
        .eq('preference_key', 'product_ids')
        .single()

      if (productPref) {
        const products = productPref.preference_value as Record<string, number>
        products[productId] = (products[productId] || 0) + 1

        await supabase
          .from('assistant_user_preferences')
          .update({
            preference_value: products,
            observation_count: (productPref.observation_count || 0) + 1,
          })
          .eq('id', productPref.id)
      } else {
        await supabase.from('assistant_user_preferences').insert({
          user_id: userId,
          preference_type: 'favorite_products',
          preference_key: 'product_ids',
          preference_value: { [productId]: 1 },
          learned_from: 'implicit',
          confidence: 0.3,
          observation_count: 1,
        })
      }
    }
  }

  /**
   * Learn activity preferences
   */
  private async learnActivityPreference(
    userId: string,
    action: LearnableAction
  ): Promise<void> {
    const activityType = action.tool_input.type as string
    if (!activityType) return

    const supabase = await createAdminClient()

    const { data: existing } = await supabase
      .from('assistant_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('preference_type', 'default_actions')
      .eq('preference_key', 'activity_types')
      .single()

    if (existing) {
      const types = existing.preference_value as Record<string, number>
      types[activityType] = (types[activityType] || 0) + 1

      await supabase
        .from('assistant_user_preferences')
        .update({
          preference_value: types,
          observation_count: (existing.observation_count || 0) + 1,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('assistant_user_preferences').insert({
        user_id: userId,
        preference_type: 'default_actions',
        preference_key: 'activity_types',
        preference_value: { [activityType]: 1 },
        learned_from: 'implicit',
        confidence: 0.3,
        observation_count: 1,
      })
    }
  }

  /**
   * Get user preferences for system prompt
   */
  async getPreferencesForPrompt(userId: string): Promise<string> {
    const supabase = await createAdminClient()

    const { data: preferences } = await supabase
      .from('assistant_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence', 0.4) // Only include confident preferences

    if (!preferences || preferences.length === 0) {
      return ''
    }

    const lines: string[] = ['## Naučené preference uživatele']

    for (const pref of preferences) {
      const line = this.formatPreference(pref)
      if (line) lines.push(line)
    }

    return lines.length > 1 ? lines.join('\n') : ''
  }

  /**
   * Format a preference for the prompt
   */
  private formatPreference(pref: AssistantUserPreference): string | null {
    switch (pref.preference_type) {
      case 'discount_range': {
        const val = pref.preference_value as {
          min: number
          max: number
          avg: number
        }
        return `- Typicky aplikuje slevy ${val.min}-${val.max}% (průměr ${val.avg.toFixed(1)}%)`
      }
      case 'favorite_products': {
        if (pref.preference_key === 'categories') {
          const cats = pref.preference_value as Record<string, number>
          const sorted = Object.entries(cats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
          if (sorted.length > 0) {
            return `- Často používá kategorie: ${sorted.map(([k]) => k).join(', ')}`
          }
        }
        return null
      }
      case 'default_actions': {
        if (pref.preference_key === 'activity_types') {
          const types = pref.preference_value as Record<string, number>
          const sorted = Object.entries(types).sort((a, b) => b[1] - a[1])
          const preferred = sorted[0]?.[0]
          if (preferred) {
            return `- Preferovaný typ aktivity: ${preferred}`
          }
        }
        return null
      }
      default:
        return null
    }
  }

  /**
   * Set an explicit preference (user explicitly stated)
   */
  async setExplicitPreference(
    userId: string,
    type: AssistantPreferenceType,
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    const supabase = await createAdminClient()

    await supabase.from('assistant_user_preferences').upsert(
      {
        user_id: userId,
        preference_type: type,
        preference_key: key,
        preference_value: value,
        learned_from: 'explicit',
        confidence: 0.95, // High confidence for explicit preferences
        observation_count: 1,
      },
      {
        onConflict: 'user_id,preference_type,preference_key',
      }
    )
  }
}

// Singleton instance
let learnerInstance: PreferenceLearner | null = null

export function getPreferenceLearner(): PreferenceLearner {
  if (!learnerInstance) {
    learnerInstance = new PreferenceLearner()
  }
  return learnerInstance
}
