'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export interface FunnelData {
  configurations: number
  quotes: number
  orders: number
  production: number
  // Conversion rates (0-100)
  configToQuote: number
  quoteToOrder: number
  orderToProduction: number
}

interface SalesFunnelProps {
  data: FunnelData
}

export function SalesFunnel({ data }: SalesFunnelProps) {
  const totalConversion = data.configurations > 0
    ? (data.orders / data.configurations) * 100
    : 0

  // Find max value for scaling bars
  const maxValue = Math.max(data.configurations, data.quotes, data.orders, data.production, 1)

  const stages = [
    {
      label: 'Poptávky',
      value: data.configurations,
      conversion: 100,
      color: 'bg-blue-400',
    },
    {
      label: 'Nabídky',
      value: data.quotes,
      conversion: data.configToQuote,
      color: 'bg-blue-400',
    },
    {
      label: 'Objednávky',
      value: data.orders,
      conversion: data.quoteToOrder,
      color: 'bg-blue-400',
    },
    {
      label: 'Ve výrobě',
      value: data.production,
      conversion: data.orderToProduction,
      color: 'bg-green-500',
      isLast: true,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Konverze - tento měsíc
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            Celková konverze: <span className="font-semibold text-foreground">{totalConversion.toFixed(0)}%</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.configurations === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Zatím žádná data pro tento měsíc
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-48">
            {stages.map((stage, index) => {
              const barHeight = (stage.value / maxValue) * 100
              const showConversion = index > 0

              return (
                <div key={stage.label} className="flex-1 flex flex-col items-center">
                  {/* Value on top */}
                  <div className="text-lg font-bold mb-1">{stage.value}</div>

                  {/* Bar container */}
                  <div className="w-full flex flex-col items-center relative" style={{ height: '120px' }}>
                    {/* Conversion badge */}
                    {showConversion && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full z-10">
                        <div className={`
                          text-xs font-semibold px-2 py-0.5 rounded
                          ${stage.conversion >= 60 ? 'bg-gray-700 text-white' :
                            stage.conversion >= 30 ? 'bg-gray-600 text-white' :
                            'bg-gray-500 text-white'}
                        `}>
                          {stage.conversion.toFixed(0)}%
                        </div>
                      </div>
                    )}

                    {/* Bar */}
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-full max-w-16 rounded-t transition-all ${stage.isLast ? 'bg-green-500' : 'bg-amber-400'}`}
                        style={{ height: `${Math.max(barHeight, 5)}%` }}
                      />
                    </div>
                  </div>

                  {/* Label */}
                  <div className="text-xs text-muted-foreground mt-2 text-center truncate w-full">
                    {stage.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        {data.configurations > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-xs text-muted-foreground">V procesu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-xs text-muted-foreground">Dokončeno</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
