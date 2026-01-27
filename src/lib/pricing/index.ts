// Pool surface calculations
export {
  calculatePoolSurface,
  calculatePoolVolume,
  formatPoolSurface,
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
