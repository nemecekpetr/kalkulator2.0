'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Mail } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Configuration } from '@/lib/supabase/types'
import {
  POOL_SHAPES,
  POOL_TYPES,
  POOL_COLORS,
  STAIRS_OPTIONS,
  TECHNOLOGY_OPTIONS,
  LIGHTING_OPTIONS,
  COUNTERFLOW_OPTIONS,
  WATER_TREATMENT_OPTIONS,
  HEATING_OPTIONS,
  ROOFING_OPTIONS,
} from '@/lib/constants/configurator'
import { createConfiguration, updateConfiguration } from '@/app/actions/admin-actions'
import { toast } from 'sonner'

const formSchema = z.object({
  contact_name: z.string().min(2, 'Jméno musí mít alespoň 2 znaky'),
  contact_email: z.string().email('Neplatný email'),
  contact_phone: z.string().optional(),
  pool_shape: z.string().min(1, 'Vyberte tvar bazénu'),
  pool_type: z.string().min(1, 'Vyberte typ konstrukce'),
  diameter: z.number().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  depth: z.number().min(0.5, 'Minimální hloubka je 0.5m'),
  color: z.string().min(1, 'Vyberte barvu'),
  stairs: z.string().min(1, 'Vyberte schodiště'),
  technology: z.string().min(1, 'Vyberte technologii'),
  lighting: z.string().min(1, 'Vyberte osvětlení'),
  counterflow: z.string().min(1, 'Vyberte protiproud'),
  water_treatment: z.string().min(1, 'Vyberte úpravu vody'),
  heating: z.string().min(1, 'Vyberte ohřev'),
  roofing: z.string().min(1, 'Vyberte zastřešení'),
  message: z.string().optional(),
  sendEmail: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ConfigurationFormProps {
  configuration?: Configuration
  mode: 'create' | 'edit'
}

export function ConfigurationForm({ configuration, mode }: ConfigurationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contact_name: configuration?.contact_name || '',
      contact_email: configuration?.contact_email || '',
      contact_phone: configuration?.contact_phone || '',
      pool_shape: configuration?.pool_shape || '',
      pool_type: configuration?.pool_type || '',
      diameter: configuration?.dimensions?.diameter || undefined,
      length: configuration?.dimensions?.length || undefined,
      width: configuration?.dimensions?.width || undefined,
      depth: configuration?.dimensions?.depth || 1.5,
      color: configuration?.color || '',
      stairs: configuration?.stairs || '',
      technology: configuration?.technology || '',
      lighting: configuration?.lighting || 'none',
      counterflow: configuration?.counterflow || 'none',
      water_treatment: configuration?.water_treatment || 'chlorine',
      heating: configuration?.heating || '',
      roofing: configuration?.roofing || '',
      message: configuration?.message || '',
      sendEmail: false,
    },
  })

  const poolShape = form.watch('pool_shape')

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      const dimensions: Record<string, number> = {
        depth: values.depth,
      }

      if (values.pool_shape === 'circle') {
        dimensions.diameter = values.diameter || 0
      } else {
        dimensions.length = values.length || 0
        dimensions.width = values.width || 0
      }

      const data = {
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone || '',
        pool_shape: values.pool_shape,
        pool_type: values.pool_type,
        dimensions,
        color: values.color,
        stairs: values.stairs,
        technology: values.technology,
        lighting: values.lighting,
        counterflow: values.counterflow,
        water_treatment: values.water_treatment,
        heating: values.heating,
        roofing: values.roofing,
        message: values.message || undefined,
      }

      if (mode === 'edit' && configuration) {
        const result = await updateConfiguration(configuration.id, data)
        if (result.success) {
          toast.success('Konfigurace byla aktualizována')
          router.push(`/admin/konfigurace/${configuration.id}`)
        } else {
          toast.error(result.error || 'Nepodařilo se aktualizovat konfiguraci')
        }
      } else {
        const result = await createConfiguration({
          ...data,
          sendEmail: values.sendEmail,
        })
        if (result.success && result.id) {
          toast.success('Konfigurace byla vytvořena')
          router.push(`/admin/konfigurace/${result.id}`)
        } else {
          toast.error(result.error || 'Nepodařilo se vytvořit konfiguraci')
        }
      }
    } catch {
      toast.error('Došlo k chybě')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact info */}
        <Card>
          <CardHeader>
            <CardTitle>Kontaktní údaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jméno *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jan Novak" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jan@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+420 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zpráva</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dodatečné poznámky..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === 'create' && (
              <FormField
                control={form.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-4 w-4" />
                        Odeslat potvrzovací email zákazníkovi
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Zákazník obdrží email s potvrzením konfigurace
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Pool configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Konfigurace bazénu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="pool_shape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tvar *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte tvar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POOL_SHAPES.map((shape) => (
                          <SelectItem key={shape.id} value={shape.id}>
                            {shape.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pool_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ konstrukce *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POOL_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dimensions */}
            <div className="grid gap-4 sm:grid-cols-3">
              {poolShape === 'circle' ? (
                <FormField
                  control={form.control}
                  name="diameter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Průměr (m) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Délka (m) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Šířka (m) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="depth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hloubka (m) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barva *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte barvu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {POOL_COLORS.map((color) => (
                          <SelectItem key={color.id} value={color.id}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stairs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schodiště *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte schodiště" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAIRS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Technology */}
            <FormField
              control={form.control}
              name="technology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technologie *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte technologii" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TECHNOLOGY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Accessories */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="lighting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Osvětlení *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte osvětlení" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LIGHTING_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="counterflow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protiproud *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte protiproud" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTERFLOW_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="water_treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Úprava vody *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte úpravu vody" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WATER_TREATMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="heating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ohřev *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte ohřev" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HEATING_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roofing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zastřešení *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte zastřešení" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROOFING_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Zrušit
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'edit' ? 'Uložit změny' : 'Vytvořit konfiguraci'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
