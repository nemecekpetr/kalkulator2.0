/**
 * Normalizační skript pro produktový katalog
 * Vstup: extracted-products.json
 * Výstup: produkty-katalog-final.csv, produkty-mapping.csv, produkty-normalizace-log.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'extracted-products.json');

type ProductType = 'core' | 'addon' | 'material' | 'service';

interface RawProduct {
  name: string;
  price: number | null;
  unit: string;
  code: string | null;
  source: string;
  category: string;
  subcategory: string;
  productType: ProductType;
  brand: string | null;
  description: string | null;
  lineNumber: number;
}

interface NormalizedProduct {
  product_code: string;
  product_name: string;
  category: string;
  subcategory: string;
  product_type: ProductType;
  brand: string;
  description: string;
  unit: string;
  base_price: number | null;
  currency: string;
  active: boolean;
  internal_code: string;
  source_notes: string;
  needs_review: boolean;
  review_reason: string;
}

// Mapování synonym
const SYNONYMS: Record<string, string> = {
  // Schody
  'schůdky': 'schodiště',
  'schody': 'schodiště',
  'schod': 'schodiště',

  // Románské
  'romanske': 'románské',
  'romanské': 'románské',

  // Trojúhelníkové
  'trojuhelnikove': 'trojúhelníkové',
  'trojúhelníkove': 'trojúhelníkové',

  // Jednotky
  'm2': 'm²',
  'm3': 'm³',

  // Značky
  'brilix': 'BRILIX',
  'azur': 'AZUR',
  'hanscraft': 'HANSCRAFT',
  'zodiac': 'ZODIAC',
  'norm': 'NORM',
  'rapid': 'RAPID',
  'practic': 'PRACTIC',
  'griffon': 'GRIFFON',
  'seko': 'SEKO',
  'vektro': 'VEKTRO',
  'voyager': 'VOYAGER',
};

// Generování produktových kódů
let codeCounters: Record<string, number> = {};

function generateProductCode(product: RawProduct): string {
  // Pokud už má kód, použij ho jako internal_code a vytvoř nový
  const category = product.category.toUpperCase();
  const subcategory = product.subcategory.toUpperCase();

  let prefix = '';
  let suffix = '';

  switch (product.category) {
    case 'bazeny':
      prefix = 'BAZ';
      // Extrahuj rozměry z názvu
      const bazMatch = product.name.match(/(\d+)\s*x\s*(\d+(?:[,\.]\d+)?)\s*x\s*(\d+(?:[,\.]\d+)?)/i);
      if (bazMatch) {
        const [, w, l, h] = bazMatch;
        const type = product.name.toLowerCase().includes('přeliv') ? 'PR' : 'SK';
        suffix = `-OBD-${type}-${w}-${l.replace(',', '.')}-${h.replace(',', '.')}`;
      }
      break;

    case 'sety':
      prefix = 'SET';
      const setMatch = product.name.match(/(\d+)\s*x\s*(\d+(?:[,\.]\d+)?)\s*x\s*(\d+(?:[,\.]\d+)?)/i);
      if (setMatch) {
        const [, w, l, h] = setMatch;
        suffix = `-${w}-${l.replace(',', '.')}-${h.replace(',', '.')}`;
      }
      break;

    case 'schodiste':
      prefix = 'SCHOD';
      if (product.name.toLowerCase().includes('román')) {
        suffix = '-ROMAN';
        if (product.name.toLowerCase().includes('vnější')) suffix += '-VNEJSI';
        else if (product.name.toLowerCase().includes('vnitřní')) suffix += '-VNITR';
        // Počet stupňů
        const stupneMatch = product.name.match(/(\d+)\s*stuп?n/i);
        if (stupneMatch) suffix += `-${stupneMatch[1]}`;
      } else if (product.name.toLowerCase().includes('trojúhelník')) {
        suffix = '-TROJ';
      } else if (product.name.toLowerCase().includes('přes') && product.name.toLowerCase().includes('šíř')) {
        suffix = '-SIRKA';
      } else {
        suffix = '-STD';
      }
      break;

    case 'technologie':
      if (product.subcategory === 'filtrace') {
        prefix = 'FILTR';
        const m3Match = product.name.match(/(\d+)\s*m[³3]/i);
        if (m3Match) suffix = `-PISK-${m3Match[1]}`;
        else suffix = '-STD';
      } else if (product.subcategory === 'sachty') {
        prefix = 'SACH';
        const sachMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*x\s*(\d+(?:[,\.]\d+)?)\s*x\s*(\d+(?:[,\.]\d+)?)/i);
        if (sachMatch) {
          const [, a, b, c] = sachMatch;
          suffix = `-${a.replace(',', '.')}-${b.replace(',', '.')}-${c.replace(',', '.')}`;
        } else {
          suffix = '-STD';
        }
      } else if (product.subcategory === 'skimmery') {
        prefix = 'SKIM';
        const litMatch = product.name.match(/(\d+)\s*l/i);
        if (litMatch) suffix = `-${litMatch[1]}L`;
        else suffix = '-STD';
        if (product.brand) suffix += `-${product.brand}`;
      } else if (product.subcategory === 'trysky') {
        prefix = 'TRYS';
        suffix = '-RECIRK';
      }
      break;

    case 'osvetleni':
      prefix = 'SVET';
      if (product.name.toLowerCase().includes('led')) {
        suffix = '-LED';
        if (product.name.toLowerCase().includes('rgb')) suffix += '-RGB';
        if (product.name.toLowerCase().includes('va')) suffix += '-VA';
      } else if (product.name.toLowerCase().includes('halogen')) {
        const wattMatch = product.name.match(/(\d+)\s*w/i);
        suffix = `-HAL-${wattMatch ? wattMatch[1] : 'STD'}`;
      } else if (product.name.toLowerCase().includes('transformátor')) {
        prefix = 'TRAFO';
        const wattMatch = product.name.match(/(\d+)\s*w/i);
        suffix = `-${wattMatch ? wattMatch[1] : 'STD'}`;
      }
      break;

    case 'ohrev':
      if (product.subcategory === 'tepelna_cerpadla') {
        prefix = 'TC';
        const kwMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kw/i);
        const kw = kwMatch ? kwMatch[1].replace(',', '.') : 'X';
        if (product.brand === 'NORM') suffix = `-NORM-${kw}`;
        else if (product.brand === 'RAPID') suffix = `-RAPID-${kw}-INV`;
        else suffix = `-STD-${kw}`;
      } else if (product.subcategory === 'wifi_moduly') {
        prefix = 'WIFI';
        if (product.name.toLowerCase().includes('norm')) suffix = '-NORM';
        else if (product.name.toLowerCase().includes('rapid')) suffix = '-RAPID';
        else suffix = '-TC';
      } else {
        prefix = 'OHREV';
        suffix = '-PRIPOJ';
      }
      break;

    case 'protiproud':
      prefix = 'PROTIP';
      const m3hMatch = product.name.match(/(\d+)\s*m[³3]\/hod/i);
      if (m3hMatch) suffix = `-${m3hMatch[1]}`;
      else suffix = '-STD';
      break;

    case 'uprava_vody':
      if (product.subcategory === 'elektrolyza') {
        prefix = 'VODA-ELEK';
        if (product.brand) suffix = `-${product.brand}`;
      } else if (product.subcategory === 'uv_lampy') {
        prefix = 'VODA-UV';
        const wMatch = product.name.match(/(\d+)\s*w/i);
        if (wMatch) suffix = `-${wMatch[1]}W`;
      } else if (product.subcategory === 'davkovace') {
        prefix = 'VODA-DAVK';
        if (product.name.toLowerCase().includes('ph')) suffix = '-PH';
        else if (product.name.toLowerCase().includes('orp')) suffix = '-ORP';
        else suffix = '-STD';
        if (product.brand) suffix += `-${product.brand}`;
      } else {
        prefix = 'VODA';
        suffix = '-STD';
      }
      break;

    case 'chemie':
      prefix = 'CHEM';
      if (product.name.toLowerCase().includes('ph+') || product.name.toLowerCase().includes('ph -') ||
          (product.name.toLowerCase().includes('ph') && product.name.toLowerCase().includes('plus'))) {
        suffix = '-PH-PLUS';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('ph') && product.name.toLowerCase().includes('mínus')) {
        suffix = '-PH-MINUS';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('chlornan')) {
        suffix = '-CHLOR';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('tablety')) {
        suffix = '-TAB-5V1';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('tester')) {
        suffix = '-TESTER';
      } else if (product.name.toLowerCase().includes('sůl')) {
        suffix = '-SUL';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('písek')) {
        suffix = '-PISEK';
        const kgMatch = product.name.match(/(\d+(?:[,\.]\d+)?)\s*kg/i);
        if (kgMatch) suffix += `-${kgMatch[1].replace(',', '.')}`;
      } else if (product.name.toLowerCase().includes('šok')) {
        suffix = '-SOK';
      } else {
        suffix = '-STD';
      }
      break;

    case 'cisteni':
      prefix = 'VYSAV';
      if (product.subcategory === 'automaticke') {
        suffix = '-AUTO';
        if (product.brand) suffix += `-${product.brand}`;
      } else if (product.subcategory === 'bateriove') {
        suffix = '-BAT';
        if (product.brand) suffix += `-${product.brand}`;
      } else {
        suffix = '-RUCNI';
      }
      break;

    case 'zastreseni':
      prefix = 'ZASTRE';
      const prMatch = product.name.match(/PRACTIC\s*(\d+)\s*x\s*(\d+)/i);
      if (prMatch) {
        suffix = `-PRACTIC-${prMatch[1]}-${prMatch[2]}`;
      } else {
        suffix = '-PRACTIC';
      }
      break;

    case 'ovladani':
      prefix = 'OVLAD';
      if (product.name.toLowerCase().includes('protiproud')) suffix = '-FILTR-SVET-PROTIP';
      else if (product.name.toLowerCase().includes('tepelné čerpadlo') && product.name.toLowerCase().includes('protiproud')) suffix = '-FILTR-SVET-TC-PROTIP';
      else if (product.name.toLowerCase().includes('tepelné čerpadlo')) suffix = '-FILTR-SVET-TC';
      else suffix = '-FILTR-SVET';
      break;

    case 'sluzby':
      if (product.subcategory === 'doprava') {
        prefix = 'SLUZ';
        suffix = '-DOPRAVA-KM';
      } else {
        prefix = 'SLUZ';
        suffix = '-MONTAZ';
        if (product.name.toLowerCase().includes('světel')) suffix += '-SVET';
        else if (product.name.toLowerCase().includes('tepelného')) suffix += '-TC';
        else if (product.name.toLowerCase().includes('protiproud')) suffix += '-PROTIP';
        else if (product.name.toLowerCase().includes('autochlor') || product.name.toLowerCase().includes('elektrolýz')) suffix += '-ELEK';
        else if (product.name.toLowerCase().includes('uv')) suffix += '-UV';
        else if (product.name.toLowerCase().includes('dávkovač')) suffix += '-DAVK';
        else if (product.name.toLowerCase().includes('zastřešení')) suffix += '-ZASTRE';
        else suffix += '-ZAKLAD';
      }
      break;

    case 'material':
      if (product.subcategory === 'pp_desky') {
        prefix = 'MAT-PP';
        const mmMatch = product.name.match(/(\d+)\s*mm/i);
        if (mmMatch) suffix = `-${mmMatch[1]}`;
        if (product.name.toLowerCase().includes('dezén')) suffix += '-DEZ';
      } else if (product.subcategory === 'izolace') {
        prefix = 'MAT-POLYST';
        const mmMatch = product.name.match(/(\d+)\s*mm/i);
        if (mmMatch) suffix = `-${mmMatch[1]}`;
      } else if (product.subcategory === 'trubky') {
        prefix = 'MAT-TRUB';
        if (product.name.toLowerCase().includes('flexi')) suffix = '-FLEXI';
        else if (product.name.toLowerCase().includes('plovoucí')) suffix = '-PLOV';
        else suffix = '-PVC';
        const mmMatch = product.name.match(/(\d+)\s*mm/i);
        if (mmMatch) suffix += `-${mmMatch[1]}`;
      } else if (product.subcategory === 'armatury') {
        if (product.name.toLowerCase().includes('úhel')) {
          prefix = 'MAT-ARMAT';
          const degMatch = product.name.match(/(\d+)°/);
          suffix = `-UHEL${degMatch ? degMatch[1] : ''}`;
          const mmMatch = product.name.match(/(\d+)\s*mm/i);
          if (mmMatch) suffix += `-${mmMatch[1]}`;
        } else if (product.name.toLowerCase().includes('ventil')) {
          prefix = 'MAT-ARMAT';
          if (product.name.toLowerCase().includes('zpětný')) suffix = '-VENTIL-ZPET';
          else suffix = '-VENTIL-KUL';
          const mmMatch = product.name.match(/(\d+)\s*mm/i);
          if (mmMatch) suffix += `-${mmMatch[1]}`;
        } else if (product.name.toLowerCase().includes('mufna')) {
          prefix = 'MAT-ARMAT';
          suffix = '-MUFNA';
          const mmMatch = product.name.match(/(\d+)\s*mm/i);
          if (mmMatch) suffix += `-${mmMatch[1]}`;
        } else if (product.name.toLowerCase().includes('redukce')) {
          prefix = 'MAT-ARMAT';
          suffix = '-REDUKCE';
        } else if (product.name.toLowerCase().includes('šroubení')) {
          prefix = 'MAT-ARMAT';
          suffix = '-SROUB';
        } else if (product.name.toLowerCase().includes('průchodka') || product.name.toLowerCase().includes('pruchoka')) {
          prefix = 'MAT-ARMAT';
          suffix = '-PRUCH';
        } else if (product.name.toLowerCase().includes('hadicový trn')) {
          prefix = 'MAT-ARMAT';
          suffix = '-TRN';
        } else if (product.name.toLowerCase().includes('spona')) {
          prefix = 'MAT-ARMAT';
          suffix = '-SPONA';
        } else if (product.name.toLowerCase().includes('t kus') || product.name.toLowerCase().includes('"t"')) {
          prefix = 'MAT-ARMAT';
          suffix = '-T';
        } else {
          prefix = 'MAT-ARMAT';
          suffix = '-STD';
        }
      } else if (product.subcategory === 'lepidla') {
        prefix = 'MAT-LEPID';
        if (product.name.toLowerCase().includes('čistič')) prefix = 'MAT-CISTIC';
        const mlMatch = product.name.match(/(\d+)\s*ml/i);
        if (mlMatch) suffix = `-${mlMatch[1]}`;
        else suffix = '-STD';
      } else if (product.subcategory === 'prostupy') {
        prefix = 'MAT-PROST';
        const mmMatch = product.name.match(/(\d+)\s*mm/i);
        if (mmMatch) suffix = `-${mmMatch[1]}`;
        else suffix = '-STD';
      } else if (product.subcategory === 'lemova_trubka') {
        prefix = 'MAT-LEM';
        suffix = '-TRUBKA';
      } else if (product.subcategory === 'propojovaci') {
        prefix = 'MAT-PROPOJ';
        suffix = '-SET';
      } else {
        prefix = 'MAT';
        suffix = '-STD';
      }
      break;

    case 'prislusenstvi':
      if (product.name.toLowerCase().includes('hloubk')) {
        prefix = 'MOD';
        const hMatch = product.name.match(/(\d+[,\.]\d+)\s*m/i);
        if (hMatch) suffix = `-HLOUBKA-${hMatch[1].replace(',', '.')}`;
        else suffix = '-HLOUBKA';
      } else if (product.name.toLowerCase().includes('ostré rohy')) {
        prefix = 'MOD';
        suffix = '-OSTRE-ROHY';
      } else if (product.subcategory === 'barvy') {
        prefix = 'BARVA';
        if (product.name.toLowerCase().includes('bílá')) suffix = '-BILA';
        else if (product.name.toLowerCase().includes('7032')) suffix = '-RAL7032';
        else if (product.name.toLowerCase().includes('7035')) suffix = '-RAL7035';
        else if (product.name.toLowerCase().includes('7037')) suffix = '-RAL7037';
        else if (product.name.toLowerCase().includes('kombinace')) suffix = '-KOMBI';
        else suffix = '-STD';
      } else {
        prefix = 'PRISL';
        suffix = '-STD';
      }
      break;

    default:
      prefix = 'JINE';
      suffix = '-STD';
  }

  // Zajisti unikátnost
  const baseCode = `${prefix}${suffix}`;
  if (codeCounters[baseCode] === undefined) {
    codeCounters[baseCode] = 0;
  }
  codeCounters[baseCode]++;

  if (codeCounters[baseCode] > 1) {
    return `${baseCode}-${codeCounters[baseCode]}`;
  }

  return baseCode;
}

// Normalizace názvu
function normalizeName(name: string): string {
  let normalized = name;

  // Aplikuj synonyma
  for (const [from, to] of Object.entries(SYNONYMS)) {
    const regex = new RegExp(from, 'gi');
    normalized = normalized.replace(regex, to);
  }

  // Kapitalizace první písmena
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return normalized;
}

// Určení jednotky
function determineUnit(product: RawProduct): string {
  const nameLower = product.name.toLowerCase();

  if (nameLower.includes('m2') || nameLower.includes('m²')) return 'm²';
  if (nameLower.includes('m3') || nameLower.includes('m³')) return 'm³';
  if (nameLower.includes('kg/balení') || nameLower.includes('kg')) return 'kg';
  if (nameLower.includes('kč/km')) return 'km';
  if (nameLower.includes('/m') || nameLower.includes('bm')) return 'm';
  if (nameLower.includes('hod')) return 'hod';

  return 'ks';
}

// Kontrola, zda produkt potřebuje revizi
function checkNeedsReview(product: RawProduct): { needsReview: boolean; reason: string } {
  const reasons: string[] = [];

  // Chybí cena
  if (product.price === null || product.price === 0) {
    reasons.push('Chybí cena');
  }

  // Kategorie 'jine'
  if (product.category === 'jine') {
    reasons.push('Nerozpoznaná kategorie');
  }

  // Příliš krátký název
  if (product.name.length < 5) {
    reasons.push('Krátký název');
  }

  // Obsahuje otazníky nebo podivné znaky
  if (product.name.includes('?') || product.name.includes('IFERROR') || product.name.includes('KDYŽ')) {
    reasons.push('Obsahuje formule/chyby');
  }

  return {
    needsReview: reasons.length > 0,
    reason: reasons.join('; ')
  };
}

// Hlavní normalizační funkce
function normalizeProduct(raw: RawProduct): NormalizedProduct {
  const { needsReview, reason } = checkNeedsReview(raw);

  return {
    product_code: generateProductCode(raw),
    product_name: normalizeName(raw.name),
    category: raw.category,
    subcategory: raw.subcategory,
    product_type: raw.productType,
    brand: raw.brand || 'RENTMIL',
    description: raw.description || '',
    unit: determineUnit(raw),
    base_price: raw.price,
    currency: 'CZK',
    active: true,
    internal_code: raw.code || '',
    source_notes: raw.source,
    needs_review: needsReview,
    review_reason: reason
  };
}

// Generování mapovací tabulky
interface MappingEntry {
  old_code: string;
  old_name: string;
  new_code: string;
  new_name: string;
  action: string;
}

function generateMapping(raw: RawProduct[], normalized: NormalizedProduct[]): MappingEntry[] {
  const mapping: MappingEntry[] = [];

  for (let i = 0; i < raw.length; i++) {
    if (raw[i].code) {
      mapping.push({
        old_code: raw[i].code!,
        old_name: raw[i].name,
        new_code: normalized[i].product_code,
        new_name: normalized[i].product_name,
        action: 'mapped'
      });
    }
  }

  return mapping;
}

// Generování logu
function generateLog(
  normalized: NormalizedProduct[],
  mapping: MappingEntry[],
  stats: Record<string, number>
): string {
  let log = `# Produktový katalog Rentmil - Log normalizace\n\n`;
  log += `Datum: ${new Date().toISOString()}\n\n`;

  log += `## Statistiky\n\n`;
  log += `| Metrika | Hodnota |\n`;
  log += `|---------|--------|\n`;
  log += `| Celkem produktů | ${normalized.length} |\n`;
  log += `| S cenou | ${normalized.filter(p => p.base_price !== null).length} |\n`;
  log += `| Bez ceny | ${normalized.filter(p => p.base_price === null).length} |\n`;
  log += `| K revizi | ${normalized.filter(p => p.needs_review).length} |\n\n`;

  log += `## Kategorie\n\n`;
  log += `| Kategorie | Počet |\n`;
  log += `|-----------|-------|\n`;
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    log += `| ${cat} | ${count} |\n`;
  }
  log += `\n`;

  log += `## Položky k revizi\n\n`;
  const toReview = normalized.filter(p => p.needs_review);
  if (toReview.length > 0) {
    log += `| Kód | Název | Důvod |\n`;
    log += `|-----|-------|-------|\n`;
    for (const p of toReview) {
      log += `| ${p.product_code} | ${p.product_name.substring(0, 40)}... | ${p.review_reason} |\n`;
    }
  } else {
    log += `Žádné položky k revizi.\n`;
  }
  log += `\n`;

  if (mapping.length > 0) {
    log += `## Mapování kódů\n\n`;
    log += `| Starý kód | Nový kód | Název |\n`;
    log += `|-----------|----------|-------|\n`;
    for (const m of mapping.slice(0, 50)) {
      log += `| ${m.old_code} | ${m.new_code} | ${m.new_name.substring(0, 30)}... |\n`;
    }
    if (mapping.length > 50) {
      log += `| ... | ... | (dalších ${mapping.length - 50} položek) |\n`;
    }
  }

  return log;
}

// Položky k úplnému odstranění (nejsou produkty)
const ITEMS_TO_REMOVE = [
  'Platnost nabídky: 1 měsíc od vypracování',
  'Nadstandardní výbava celkem',
  'Standard a nadstandard celkem',
];

// Položky kategorie 'jine' k přesunutí do 'material'
function fixJineCategory(product: RawProduct): RawProduct {
  if (product.category === 'jine') {
    // Přesunout do kategorie material, subcategory armatury
    return {
      ...product,
      category: 'material',
      subcategory: 'armatury',
      productType: 'material'
    };
  }
  return product;
}

// Hlavní funkce
async function main() {
  console.log('='.repeat(60));
  console.log('NORMALIZACE PRODUKTOVÉHO KATALOGU');
  console.log('='.repeat(60));

  // Načti extrahované produkty
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`CHYBA: Soubor ${INPUT_FILE} neexistuje!`);
    console.error('Nejprve spusť extract-products.ts');
    process.exit(1);
  }

  let rawProducts: RawProduct[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  // Odstranit položky, které nejsou produkty
  const originalCount = rawProducts.length;
  rawProducts = rawProducts.filter(p => !ITEMS_TO_REMOVE.includes(p.name));
  const removedCount = originalCount - rawProducts.length;
  console.log(`\nOdstraněno ${removedCount} položek, které nejsou produkty`);

  // Přesunout položky z 'jine' do 'material'
  const jineCount = rawProducts.filter(p => p.category === 'jine').length;
  rawProducts = rawProducts.map(fixJineCategory);
  console.log(`Přesunuto ${jineCount} položek z kategorie 'jine' do 'material'`);

  // Nastavit cenu 0 tam, kde chybí
  const missingPriceCount = rawProducts.filter(p => p.price === null || p.price === undefined).length;
  rawProducts = rawProducts.map(p => ({
    ...p,
    price: p.price ?? 0
  }));
  console.log(`Nastavena cena 0 Kč u ${missingPriceCount} položek bez ceny`);
  console.log(`\nNačteno ${rawProducts.length} produktů z ${INPUT_FILE}`);

  // Reset čítačů kódů
  codeCounters = {};

  // Normalizuj produkty
  console.log('\nNormalizuji produkty...');
  const normalizedProducts = rawProducts.map(p => normalizeProduct(p));

  // Statistiky
  const categoryStats: Record<string, number> = {};
  for (const p of normalizedProducts) {
    categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
  }

  console.log('\nSTATISTIKY:');
  console.log(`  Celkem produktů: ${normalizedProducts.length}`);
  console.log(`  S cenou: ${normalizedProducts.filter(p => p.base_price !== null).length}`);
  console.log(`  K revizi: ${normalizedProducts.filter(p => p.needs_review).length}`);

  // Generuj mapování
  const mapping = generateMapping(rawProducts, normalizedProducts);
  console.log(`  Mapovaných kódů: ${mapping.length}`);

  // Export finálního CSV
  const finalCsvPath = path.join(OUTPUT_DIR, 'produkty-katalog-final.csv');
  // CSV s oběma kódy - starým (internal_code/old_code) i novým (product_code)
  const csvHeader = 'product_code;old_code;product_name;category;subcategory;product_type;brand;description;unit;base_price;currency;active;source_notes;needs_review;review_reason\n';
  const csvRows = normalizedProducts.map(p =>
    `"${p.product_code}";"${p.internal_code}";"${p.product_name}";"${p.category}";"${p.subcategory}";"${p.product_type}";"${p.brand}";"${p.description}";"${p.unit}";${p.base_price || ''};"${p.currency}";${p.active};"${p.source_notes}";${p.needs_review};"${p.review_reason}"`
  ).join('\n');
  fs.writeFileSync(finalCsvPath, csvHeader + csvRows, 'utf-8');
  console.log(`\nFinální katalog uložen: ${finalCsvPath}`);

  // Export mapovací tabulky
  const mappingCsvPath = path.join(OUTPUT_DIR, 'produkty-mapping.csv');
  const mappingHeader = 'old_code;old_name;new_code;new_name;action\n';
  const mappingRows = mapping.map(m =>
    `"${m.old_code}";"${m.old_name}";"${m.new_code}";"${m.new_name}";"${m.action}"`
  ).join('\n');
  fs.writeFileSync(mappingCsvPath, mappingHeader + mappingRows, 'utf-8');
  console.log(`Mapovací tabulka uložena: ${mappingCsvPath}`);

  // Export logu
  const logPath = path.join(OUTPUT_DIR, 'produkty-normalizace-log.md');
  const log = generateLog(normalizedProducts, mapping, categoryStats);
  fs.writeFileSync(logPath, log, 'utf-8');
  console.log(`Log normalizace uložen: ${logPath}`);

  // Export JSON (pro další zpracování)
  const jsonPath = path.join(OUTPUT_DIR, 'produkty-katalog-final.json');
  fs.writeFileSync(jsonPath, JSON.stringify(normalizedProducts, null, 2), 'utf-8');
  console.log(`JSON katalog uložen: ${jsonPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('NORMALIZACE DOKONČENA');
  console.log('='.repeat(60));
}

main().catch(console.error);
