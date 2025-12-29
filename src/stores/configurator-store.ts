import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSafeStorage } from '@/lib/storage'
import { isValidEmail, isValidPhone, isValidName } from '@/lib/validations/contact'
import {
  areDimensionsValidForShape,
  type PoolShape,
  type PoolType,
  type PoolColor,
  type StairsType,
  type TechnologyLocation,
  type LightingOption,
  type CounterflowOption,
  type WaterTreatment,
  type HeatingOption,
  type RoofingOption,
  type PoolDimensions,
  type ContactData
} from '@/lib/validations/configuration'

export interface ConfiguratorState {
  // Current step (1-11)
  currentStep: number

  // Step 1: Shape
  shape: PoolShape | null

  // Step 2: Type
  type: PoolType | null

  // Step 3: Dimensions
  dimensions: Partial<PoolDimensions> | null

  // Step 4: Color
  color: PoolColor | null

  // Step 5: Stairs
  stairs: StairsType | null

  // Step 6: Technology
  technology: TechnologyLocation | null

  // Step 7: Accessories
  lighting: LightingOption | null
  counterflow: CounterflowOption | null
  waterTreatment: WaterTreatment | null

  // Step 8: Heating
  heating: HeatingOption | null

  // Step 9: Roofing
  roofing: RoofingOption | null

  // Step 10: Contact
  contact: Partial<ContactData> | null

  // Submission state
  isSubmitting: boolean
  isSubmitted: boolean
  submitError: string | null
}

export interface ConfiguratorActions {
  // Navigation
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  // Setters
  setShape: (shape: PoolShape) => void
  setType: (type: PoolType) => void
  setDimensions: (dimensions: Partial<PoolDimensions>) => void
  setColor: (color: PoolColor) => void
  setStairs: (stairs: StairsType) => void
  setTechnology: (technology: TechnologyLocation) => void
  setLighting: (lighting: LightingOption) => void
  setCounterflow: (counterflow: CounterflowOption) => void
  setWaterTreatment: (waterTreatment: WaterTreatment) => void
  setHeating: (heating: HeatingOption) => void
  setRoofing: (roofing: RoofingOption) => void
  setContact: (contact: Partial<ContactData>) => void

  // Submission
  setSubmitting: (isSubmitting: boolean) => void
  setSubmitted: (isSubmitted: boolean) => void
  setSubmitError: (error: string | null) => void

  // Utils
  reset: () => void
  canProceed: (step: number) => boolean
  getCompletedSteps: () => number[]
  getTotalSteps: () => number
  shouldSkipStep: (step: number) => boolean
}

const initialState: ConfiguratorState = {
  currentStep: 1,
  shape: null,
  type: null,
  dimensions: null,
  color: null,
  stairs: null,
  technology: null,
  lighting: null,
  counterflow: null,
  waterTreatment: null,
  heating: null,
  roofing: null,
  contact: null,
  isSubmitting: false,
  isSubmitted: false,
  submitError: null
}

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, shouldSkipStep } = get()
        let nextStep = currentStep + 1

        // Skip stairs step (5) for circle pools
        while (nextStep <= 11 && shouldSkipStep(nextStep)) {
          nextStep++
        }

        if (nextStep <= 11) {
          set({ currentStep: nextStep })
        }
      },

      prevStep: () => {
        const { currentStep, shouldSkipStep } = get()
        let prevStep = currentStep - 1

        // Skip stairs step (5) for circle pools
        while (prevStep >= 1 && shouldSkipStep(prevStep)) {
          prevStep--
        }

        if (prevStep >= 1) {
          set({ currentStep: prevStep })
        }
      },

      // Setters
      setShape: (shape) => {
        const currentShape = get().shape
        // Reset stairs when changing shape
        if (shape === 'circle') {
          // Circle cannot have stairs
          set({ shape, stairs: 'none' })
        } else if (currentShape === 'circle') {
          // Changing FROM circle to rectangle - reset stairs to allow user to choose
          set({ shape, stairs: null })
        } else {
          // Changing between rectangle types - keep current stairs
          set({ shape })
        }
      },
      setType: (type) => set({ type }),
      setDimensions: (dimensions) => set({ dimensions }),
      setColor: (color) => set({ color }),
      setStairs: (stairs) => set({ stairs }),
      setTechnology: (technology) => set({ technology }),
      setLighting: (lighting) => set({ lighting }),
      setCounterflow: (counterflow) => set({ counterflow }),
      setWaterTreatment: (waterTreatment) => set({ waterTreatment }),
      setHeating: (heating) => set({ heating }),
      setRoofing: (roofing) => set({ roofing }),
      setContact: (contact) => set({ contact }),

      // Submission
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      setSubmitted: (isSubmitted) => set({ isSubmitted }),
      setSubmitError: (submitError) => set({ submitError }),

      // Utils
      reset: () => set(initialState),

      canProceed: (step) => {
        const state = get()

        switch (step) {
          case 1:
            return state.shape !== null
          case 2:
            return state.type !== null
          case 3:
            // Use centralized validation from @/lib/validations/configuration
            return areDimensionsValidForShape(state.shape, state.dimensions)
          case 4:
            return state.color !== null
          case 5:
            // Skipped for circle, always true
            if (state.shape === 'circle') return true
            return state.stairs !== null
          case 6:
            return state.technology !== null
          case 7:
            return (
              state.lighting !== null &&
              state.counterflow !== null &&
              state.waterTreatment !== null
            )
          case 8:
            return state.heating !== null
          case 9:
            return state.roofing !== null
          case 10:
            // Use centralized validation from @/lib/validations/contact
            return (
              isValidName(state.contact?.name || '') &&
              isValidEmail(state.contact?.email || '') &&
              isValidPhone(state.contact?.phone || '')
            )
          case 11:
            return true // Summary step
          default:
            return false
        }
      },

      getCompletedSteps: () => {
        const state = get()
        const completed: number[] = []

        for (let step = 1; step <= 11; step++) {
          if (!state.shouldSkipStep(step) && state.canProceed(step)) {
            completed.push(step)
          }
        }

        return completed
      },

      getTotalSteps: () => {
        const { shape } = get()
        // 11 steps, but step 5 (stairs) is skipped for circle
        return shape === 'circle' ? 10 : 11
      },

      shouldSkipStep: (step) => {
        const { shape } = get()
        // Skip stairs step (5) for circle pools
        return step === 5 && shape === 'circle'
      }
    }),
    {
      name: 'rentmil-configurator',
      // Use safe storage with Safari ITP fallback
      storage: createSafeStorage<ConfiguratorState>(),
      // Only persist configuration data, not submission state
      // Note: contact data is intentionally excluded for privacy
      partialize: (state) =>
        ({
          shape: state.shape,
          type: state.type,
          dimensions: state.dimensions,
          color: state.color,
          stairs: state.stairs,
          technology: state.technology,
          lighting: state.lighting,
          counterflow: state.counterflow,
          waterTreatment: state.waterTreatment,
          heating: state.heating,
          roofing: state.roofing,
          currentStep: state.currentStep,
          // contact: excluded - sensitive data should not persist
        }) as ConfiguratorState,
      // Skip SSR storage to avoid hydration mismatch
      skipHydration: false,
    }
  )
)

// Selector hooks for better performance
export const useCurrentStep = () => useConfiguratorStore((state) => state.currentStep)
export const usePoolShape = () => useConfiguratorStore((state) => state.shape)
export const usePoolType = () => useConfiguratorStore((state) => state.type)
export const useDimensions = () => useConfiguratorStore((state) => state.dimensions)
export const usePoolColor = () => useConfiguratorStore((state) => state.color)
export const useStairs = () => useConfiguratorStore((state) => state.stairs)
export const useTechnology = () => useConfiguratorStore((state) => state.technology)
export const useAccessories = () => useConfiguratorStore((state) => ({
  lighting: state.lighting,
  counterflow: state.counterflow,
  waterTreatment: state.waterTreatment
}))
export const useHeating = () => useConfiguratorStore((state) => state.heating)
export const useRoofing = () => useConfiguratorStore((state) => state.roofing)
export const useContact = () => useConfiguratorStore((state) => state.contact)
export const useSubmissionState = () => useConfiguratorStore((state) => ({
  isSubmitting: state.isSubmitting,
  isSubmitted: state.isSubmitted,
  submitError: state.submitError
}))
