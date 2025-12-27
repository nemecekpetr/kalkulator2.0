import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import {
  getShapeLabel,
  getTypeLabel,
  getColorLabel,
  getStairsLabel,
  getTechnologyLabel,
  getAccessoryLabel,
  getHeatingLabel,
  getRoofingLabel,
  formatDimensions,
} from '@/lib/constants/configurator'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get filters from query params
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
      .from('configurations')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('pipedrive_status', status)
    }

    if (search) {
      query = query.or(
        `contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`
      )
    }

    const { data: configurations, error } = await query

    if (error) {
      console.error('Error fetching configurations:', error)
      return new NextResponse('Error fetching data', { status: 500 })
    }

    // Generate CSV
    const headers = [
      'Datum',
      'Jmeno',
      'Email',
      'Telefon',
      'Tvar',
      'Typ',
      'Rozmery',
      'Barva',
      'Schudky',
      'Technologie',
      'Prislusenstvi',
      'Ohrev',
      'Zastresneni',
      'Zprava',
      'Pipedrive status',
    ]

    const rows = configurations.map((config) => [
      format(new Date(config.created_at), 'dd.MM.yyyy HH:mm'),
      config.contact_name,
      config.contact_email,
      config.contact_phone || '',
      getShapeLabel(config.pool_shape),
      getTypeLabel(config.pool_type),
      formatDimensions(config.pool_shape, config.dimensions),
      getColorLabel(config.color),
      getStairsLabel(config.stairs),
      Array.isArray(config.technology) ? config.technology.map(getTechnologyLabel).join(', ') : (config.technology ? getTechnologyLabel(config.technology) : ''),
      config.accessories?.map(getAccessoryLabel).join(', ') || '',
      getHeatingLabel(config.heating),
      getRoofingLabel(config.roofing),
      config.message || '',
      config.pipedrive_status,
    ])

    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    // Add BOM for Excel compatibility with Czech characters
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    const filename = `konfigurace-${format(new Date(), 'yyyy-MM-dd')}.csv`

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting configurations:', error)
    return new NextResponse('Error exporting data', { status: 500 })
  }
}
