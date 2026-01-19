/**
 * Centrální konfigurace firemních údajů
 * Používá se v PDF šablonách, emailech a dalších místech
 */

export const COMPANY = {
  name: 'Rentmil s.r.o.',

  // Právní údaje
  ico: '07904631',
  dic: 'CZ07904631',

  // Adresa
  address: {
    street: 'Lidická 1233/26',
    city: 'Plzeň',
    zip: '323 00',
    full: 'Lidická 1233/26, 323 00 Plzeň',
  },

  // Kontakty
  phone: '+420 737 222 004',
  email: 'bazeny@rentmil.cz',
  web: 'www.rentmil.cz',

  // Statutární orgán
  representative: {
    name: 'Drahoslav Houška',
    role: 'jednatel',
  },

  // Bankovní spojení (pokud bude potřeba)
  bank: {
    name: 'Fio banka',
    iban: '',
    accountNumber: '',
  },
} as const

// Formátované řetězce pro PDF
export const COMPANY_FOOTER_SHORT = `${COMPANY.name} | ${COMPANY.address.full}`
export const COMPANY_FOOTER_FULL = `${COMPANY.name} | ${COMPANY.address.full} | ${COMPANY.phone} | ${COMPANY.email} | ${COMPANY.web}`
export const COMPANY_LEGAL = `IČO: ${COMPANY.ico} | DIČ: ${COMPANY.dic}`
