// Pool surface calculations
export {
  calculatePoolSurface,
  calculatePoolPerimeter,
  calculatePoolVolume,
  formatPoolSurface,
  formatPoolPerimeter,
  formatPoolVolume,
  parseDimensionString,
} from './pool-surface'

// Price calculations
export {
  calculateProductPrice,
  calculateAllPrices,
  buildPriceContext,
  roundPrice,
  formatPrice,
  formatPriceNumber,
  getPriceDescription,
  type PriceContext,
  type CalculatedPrice,
} from './calculate-price'

// Prerequisites checking
export {
  checkProductPrerequisites,
  getPrerequisiteProducts,
  shouldSkipPrerequisites,
  type PrerequisiteCheckResult,
} from './check-prerequisites'

// Skeleton code parsing
export {
  parseSkeletonCode,
  isSkeletonCode,
  formatSkeletonDimensions,
  type ParsedSkeletonCode,
} from './parse-skeleton-code'
