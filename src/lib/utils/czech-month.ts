export const CZECH_MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

export function czechMonth(date: Date): string {
  return `${CZECH_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
