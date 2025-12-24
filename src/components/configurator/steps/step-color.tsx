'use client'

import { motion } from 'framer-motion'
import { useConfiguratorStore } from '@/stores/configurator-store'
import { POOL_COLORS } from '@/lib/constants/configurator'
import { StepLayout, OptionCard } from '../step-layout'
import { cn } from '@/lib/utils'

export function StepColor() {
  const color = useConfiguratorStore((state) => state.color)
  const setColor = useConfiguratorStore((state) => state.setColor)

  return (
    <StepLayout
      title="V jaké barvě má být Váš bazén?"
      description="Barva fólie ovlivňuje vjem barvy vody"
    >
      <div className="space-y-8">
        {/* Color options */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POOL_COLORS.map((poolColor) => (
            <OptionCard
              key={poolColor.id}
              selected={color === poolColor.id}
              onClick={() => setColor(poolColor.id as 'blue' | 'white' | 'gray' | 'combination')}
              className="p-5"
            >
              <div className="flex flex-col items-center text-center">
                {/* Color swatch */}
                <div className="relative mb-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full shadow-md transition-transform',
                      color === poolColor.id && 'ring-3 ring-[#48A9A6]/30 scale-110'
                    )}
                    style={{
                      background: poolColor.hex
                    }}
                  />
                  {/* Water color preview */}
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ background: poolColor.waterColor }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  />
                </div>

                <h3 className="font-semibold text-foreground mb-1">
                  {poolColor.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {poolColor.description}
                </p>
              </div>
            </OptionCard>
          ))}
        </div>

        {/* Water color preview */}
        {color && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl aspect-video"
            style={{
              background: `linear-gradient(180deg,
                ${POOL_COLORS.find(c => c.id === color)?.waterColor ?? '#48cae4'} 0%,
                ${POOL_COLORS.find(c => c.id === color)?.waterColor ?? '#48cae4'}80 100%)`
            }}
          >
            {/* Water effect overlay */}
            <div className="absolute inset-0 opacity-30">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="water-pattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M0 5 Q5 0 10 5 T20 5"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#water-pattern)" />
              </svg>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-sm opacity-80">Náhled barvy vody</p>
                <p className="text-xl font-semibold mt-1">
                  {POOL_COLORS.find(c => c.id === color)?.label}
                </p>
              </div>
            </div>

            {/* Floating bubbles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-white/30"
                initial={{
                  bottom: -20,
                  left: `${20 + i * 15}%`
                }}
                animate={{
                  bottom: '100%',
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.7
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Info note */}
        <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> Barva fólie ovlivňuje výslednou barvu vody.
          Modrá fólie vytvoří klasickou modrou vodu, šedá fólie azurově modrou a bílá fólie světle tyrkysovou.
        </div>
      </div>
    </StepLayout>
  )
}
