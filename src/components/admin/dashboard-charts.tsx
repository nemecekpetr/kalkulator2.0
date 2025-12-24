'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, parseISO, startOfDay, eachDayOfInterval, subDays } from 'date-fns'
import { cs } from 'date-fns/locale'

interface ChartDataItem {
  created_at: string
  pool_shape: string
  color: string
}

interface DashboardChartsProps {
  data: ChartDataItem[]
}

const COLORS = {
  shapes: {
    circle: '#01384B',
    rectangle_rounded: '#48A9A6',
    rectangle_sharp: '#FF8621',
  },
  colors: {
    blue: '#0077b6',
    white: '#e9ecef',
    gray: '#6c757d',
    combination: '#ED6663',
  },
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  // Process data for line chart (daily counts)
  const lineChartData = useMemo(() => {
    const today = new Date()
    const thirtyDaysAgo = subDays(today, 30)
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today })

    const countsByDay = data.reduce((acc, item) => {
      const day = format(startOfDay(parseISO(item.created_at)), 'yyyy-MM-dd')
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd')
      return {
        date: format(day, 'd.M.', { locale: cs }),
        fullDate: key,
        count: countsByDay[key] || 0,
      }
    })
  }, [data])

  // Process data for shape pie chart
  const shapeData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      acc[item.pool_shape] = (acc[item.pool_shape] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      { name: 'Kruhový', value: counts.circle || 0, color: COLORS.shapes.circle },
      { name: 'Obdélník zaoblený', value: counts.rectangle_rounded || 0, color: COLORS.shapes.rectangle_rounded },
      { name: 'Obdélník ostrý', value: counts.rectangle_sharp || 0, color: COLORS.shapes.rectangle_sharp },
    ].filter(item => item.value > 0)
  }, [data])

  // Process data for color pie chart
  const colorData = useMemo(() => {
    const counts = data.reduce((acc, item) => {
      acc[item.color] = (acc[item.color] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return [
      { name: 'Modrá', value: counts.blue || 0, color: COLORS.colors.blue },
      { name: 'Bílá', value: counts.white || 0, color: COLORS.colors.white },
      { name: 'Šedivá', value: counts.gray || 0, color: COLORS.colors.gray },
      { name: 'Kombinace', value: counts.combination || 0, color: COLORS.colors.combination },
    ].filter(item => item.value > 0)
  }, [data])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Line chart - Daily configurations */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Poptávky za posledních 30 dní</CardTitle>
          <CardDescription>Počet poptávek podle dne</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return format(parseISO(payload[0].payload.fullDate), 'd. MMMM yyyy', { locale: cs })
                      }
                      return label
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Poptávky"
                    stroke="#48A9A6"
                    strokeWidth={2}
                    dot={{ fill: '#48A9A6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#01384B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Zatím žádná data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pie chart - Shapes */}
      <Card>
        <CardHeader>
          <CardTitle>Tvary bazénů</CardTitle>
          <CardDescription>Rozložení podle tvaru</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {shapeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shapeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {shapeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Zatím žádná data
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pie chart - Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Barvy bazénů</CardTitle>
          <CardDescription>Rozložení podle barvy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {colorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {colorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color === '#e9ecef' ? '#ccc' : undefined} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Zatím žádná data
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
