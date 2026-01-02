/**
 * Extrakční skript pro produkty z historických CSV souborů
 * Zdroj: /old sheet/csv/
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_DIR = path.join(__dirname, '..', 'old sheet', 'csv');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Typy produktů
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

// Pomocné funkce pro parsování
function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr === '-' || priceStr.trim() === '') return null;
  // Odstranit mezery, Kč, tabulátory
  const cleaned = priceStr
    .replace(/\s/g, '')
    .replace(/Kč/gi, '')
    .replace(/\t/g, '')
    .replace(/,/g, '.')  // Změnit desetinnou čárku na tečku
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanName(name: string): string {
  return name
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Kategorizace produktů podle názvu
function categorizeProduct(name: string): { category: string; subcategory: string; productType: ProductType; brand: string | null } {
  const nameLower = name.toLowerCase();

  // Bazény
  if (nameLower.includes('bazén') || nameLower.includes('skelet')) {
    return { category: 'bazeny', subcategory: 'obdelnikove', productType: 'core', brand: 'RENTMIL' };
  }

  // Sety
  if (nameLower.includes('set') && (nameLower.includes('x') || nameLower.includes('bazénový'))) {
    return { category: 'sety', subcategory: 'standardni', productType: 'core', brand: 'RENTMIL' };
  }

  // Schody
  if (nameLower.includes('schod') || nameLower.includes('schodiště') || nameLower.includes('schůdky')) {
    let subcategory = 'vnitrni';
    if (nameLower.includes('vnější') || nameLower.includes('vnejsi')) subcategory = 'vnejsi';
    if (nameLower.includes('přes celou šíř') || nameLower.includes('přes šíř')) subcategory = 'pres_sirku';
    if (nameLower.includes('trojúhelník')) subcategory = 'trojuhelnikove';
    if (nameLower.includes('román')) subcategory = 'romanske';
    return { category: 'schodiste', subcategory, productType: 'core', brand: 'RENTMIL' };
  }

  // Tepelná čerpadla
  if (nameLower.includes('tepelné čerpadlo') || nameLower.includes('tc ')) {
    let brand = null;
    if (nameLower.includes('norm')) brand = 'NORM';
    if (nameLower.includes('rapid')) brand = 'RAPID';
    return { category: 'ohrev', subcategory: 'tepelna_cerpadla', productType: 'addon', brand };
  }

  // Ohřev
  if (nameLower.includes('ohřev') || nameLower.includes('odbočka na ohřev')) {
    return { category: 'ohrev', subcategory: 'pripojky', productType: 'addon', brand: null };
  }

  // WiFi moduly
  if (nameLower.includes('wifi') || nameLower.includes('vzdálené ovládání')) {
    return { category: 'ohrev', subcategory: 'wifi_moduly', productType: 'addon', brand: null };
  }

  // Filtrace
  if (nameLower.includes('filtrace') || nameLower.includes('filtr')) {
    let brand = null;
    if (nameLower.includes('brilix')) brand = 'BRILIX';
    if (nameLower.includes('azur')) brand = 'AZUR';
    if (nameLower.includes('hanscraft')) brand = 'HANSCRAFT';
    return { category: 'technologie', subcategory: 'filtrace', productType: 'core', brand };
  }

  // Šachty
  if (nameLower.includes('šachta')) {
    let subcategory = 'filtracni';
    if (nameLower.includes('protiproud')) subcategory = 'protiproudove';
    if (nameLower.includes('kombinov') || (nameLower.includes('filtr') && nameLower.includes('protiproud'))) subcategory = 'kombinovane';
    return { category: 'technologie', subcategory: 'sachty', productType: 'addon', brand: null };
  }

  // Skimmery
  if (nameLower.includes('skimmer')) {
    let brand = null;
    if (nameLower.includes('brilix')) brand = 'BRILIX';
    if (nameLower.includes('hanscraft')) brand = 'HANSCRAFT';
    if (nameLower.includes('va')) brand = 'VA';
    return { category: 'technologie', subcategory: 'skimmery', productType: 'core', brand };
  }

  // Trysky
  if (nameLower.includes('tryska')) {
    return { category: 'technologie', subcategory: 'trysky', productType: 'core', brand: null };
  }

  // Osvětlení
  if (nameLower.includes('světlo') || nameLower.includes('led') || nameLower.includes('halogen') || nameLower.includes('transformátor')) {
    let subcategory = 'led';
    if (nameLower.includes('halogen')) subcategory = 'halogen';
    if (nameLower.includes('transformátor')) subcategory = 'transformatory';
    return { category: 'osvetleni', subcategory, productType: 'addon', brand: null };
  }

  // Protiproud
  if (nameLower.includes('protiproud')) {
    return { category: 'protiproud', subcategory: 'jednotky', productType: 'addon', brand: null };
  }

  // Úprava vody
  if (nameLower.includes('elektrolýza') || nameLower.includes('autochlor') || nameLower.includes('zodiac ei') || nameLower.includes('pixie')) {
    let brand = null;
    if (nameLower.includes('zodiac')) brand = 'ZODIAC';
    if (nameLower.includes('pixie') || nameLower.includes('autochlor')) brand = 'AUTOCHLOR';
    return { category: 'uprava_vody', subcategory: 'elektrolyza', productType: 'addon', brand };
  }

  if (nameLower.includes('uv lamp')) {
    return { category: 'uprava_vody', subcategory: 'uv_lampy', productType: 'addon', brand: null };
  }

  if (nameLower.includes('dávkov')) {
    let brand = null;
    if (nameLower.includes('seko')) brand = 'SEKO';
    if (nameLower.includes('zodiac')) brand = 'ZODIAC';
    return { category: 'uprava_vody', subcategory: 'davkovace', productType: 'addon', brand };
  }

  // Chemie
  if (nameLower.includes('ph') || nameLower.includes('chlor') || nameLower.includes('tablety') || nameLower.includes('sůl') || nameLower.includes('tester')) {
    let subcategory = 'dezinfekce';
    if (nameLower.includes('ph')) subcategory = 'ph_regulace';
    if (nameLower.includes('tablety')) subcategory = 'tablety';
    if (nameLower.includes('tester')) subcategory = 'testovani';
    if (nameLower.includes('sůl')) subcategory = 'sul';
    return { category: 'chemie', subcategory, productType: 'addon', brand: null };
  }

  // Vysavače
  if (nameLower.includes('vysavač')) {
    let subcategory = 'rucni';
    if (nameLower.includes('automat')) subcategory = 'automaticke';
    if (nameLower.includes('bateri')) subcategory = 'bateriove';
    let brand = null;
    if (nameLower.includes('zodiac')) brand = 'ZODIAC';
    if (nameLower.includes('voyager')) brand = 'VOYAGER';
    if (nameLower.includes('vektro')) brand = 'VEKTRO';
    return { category: 'cisteni', subcategory, productType: 'addon', brand };
  }

  // Zastřešení
  if (nameLower.includes('zastřešení') || nameLower.includes('practic')) {
    return { category: 'zastreseni', subcategory: 'practic', productType: 'addon', brand: 'PRACTIC' };
  }

  // Automatické ovládání
  if (nameLower.includes('automatické ovládání')) {
    return { category: 'ovladani', subcategory: 'automaticke', productType: 'addon', brand: null };
  }

  // Doprava
  if (nameLower.includes('doprava') || nameLower.includes('kč/km')) {
    return { category: 'sluzby', subcategory: 'doprava', productType: 'service', brand: null };
  }

  // Montáž
  if (nameLower.includes('montáž') || nameLower.includes('montaz')) {
    return { category: 'sluzby', subcategory: 'montaz', productType: 'service', brand: null };
  }

  // Materiály - PP desky
  if (nameLower.includes('pp ') && (nameLower.includes('mm') || nameLower.includes('dezén'))) {
    return { category: 'material', subcategory: 'pp_desky', productType: 'material', brand: null };
  }

  // Materiály - Polystyren
  if (nameLower.includes('polysty') || nameLower.includes('styrodur')) {
    return { category: 'material', subcategory: 'izolace', productType: 'material', brand: null };
  }

  // Materiály - Trubky a hadice
  if (nameLower.includes('trubka') || nameLower.includes('hadice') || nameLower.includes('flexi')) {
    return { category: 'material', subcategory: 'trubky', productType: 'material', brand: null };
  }

  // Materiály - Armatury
  if (nameLower.includes('ventil') || nameLower.includes('úhel') || nameLower.includes('mufna') ||
      nameLower.includes('redukce') || nameLower.includes('šroubení') || nameLower.includes('průchodka') ||
      nameLower.includes('hadicový trn') || nameLower.includes('spojka') || nameLower.includes('spona')) {
    return { category: 'material', subcategory: 'armatury', productType: 'material', brand: null };
  }

  // Materiály - Lepidla
  if (nameLower.includes('lepidlo') || nameLower.includes('čistič') || nameLower.includes('griffon')) {
    return { category: 'material', subcategory: 'lepidla', productType: 'material', brand: 'GRIFFON' };
  }

  // Materiály - Prostupy
  if (nameLower.includes('prostup')) {
    return { category: 'material', subcategory: 'prostupy', productType: 'material', brand: null };
  }

  // Materiály - Lemová trubka
  if (nameLower.includes('lemová') || nameLower.includes('ukončení hrany')) {
    return { category: 'material', subcategory: 'lemova_trubka', productType: 'core', brand: null };
  }

  // Změna hloubky
  if (nameLower.includes('hloubk')) {
    return { category: 'prislusenstvi', subcategory: 'modifikace', productType: 'addon', brand: null };
  }

  // Ostré rohy
  if (nameLower.includes('ostré rohy')) {
    return { category: 'prislusenstvi', subcategory: 'modifikace', productType: 'addon', brand: null };
  }

  // Barva skeletu
  if (nameLower.includes('barva') && (nameLower.includes('skelet') || nameLower.includes('ral') || nameLower.includes('bílá') || nameLower.includes('šedá'))) {
    return { category: 'prislusenstvi', subcategory: 'barvy', productType: 'addon', brand: null };
  }

  // Písek
  if (nameLower.includes('písek') && nameLower.includes('kg')) {
    return { category: 'chemie', subcategory: 'filtracni_media', productType: 'addon', brand: null };
  }

  // Propojovací materiál
  if (nameLower.includes('propojovací materiál')) {
    return { category: 'material', subcategory: 'propojovaci', productType: 'core', brand: null };
  }

  // Default
  return { category: 'jine', subcategory: 'neurceno', productType: 'addon', brand: null };
}

// Parsování jednotlivých CSV souborů
function parseRozsireni(content: string): RawProduct[] {
  const products: RawProduct[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(';');
    const name = cleanName(parts[0] || '');

    if (!name || name.length < 3) continue;
    if (name === 'SLEVA') continue;

    // Cena je v 6. sloupci (index 5)
    const priceStr = parts[5] || '';
    const price = parsePrice(priceStr);

    const cat = categorizeProduct(name);

    products.push({
      name,
      price,
      unit: 'ks',
      code: null,
      source: 'Rozšíření-Table 1.csv',
      ...cat,
      description: null,
      lineNumber: i + 1
    });
  }

  return products;
}

function parseZakazkovyList(content: string): RawProduct[] {
  const products: RawProduct[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(';');

    // Hledáme formát: kód;název
    const code = parts[0]?.trim();
    const name = cleanName(parts[1] || '');

    if (!code || !name || code.length < 2 || name.length < 3) continue;
    if (code.startsWith('kód') || code === 'ZAKÁZKOVÝ LIST') continue;

    // Přeskočit řádky s meta-informacemi
    if (name.includes('Termín') || name.includes('číslo objednávky') || name.includes('Zakázku')) continue;

    const cat = categorizeProduct(name);

    products.push({
      name,
      price: null,
      unit: 'ks',
      code,
      source: 'Zakázkový list-Table 1.csv',
      ...cat,
      description: null,
      lineNumber: i + 1
    });
  }

  return products;
}

function parseNabidkaBAZEN(content: string): RawProduct[] {
  const products: RawProduct[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(';');
    const name = cleanName(parts[0] || '');

    if (!name || name.length < 3) continue;
    if (name.startsWith('Název zboží') || name.includes('NABÍDKA') || name.includes('Zákazník')) continue;
    if (name === 'Standardní výbava' || name === 'Nadstandardní výbava') continue;
    if (name.includes('Celková cena') || name.includes('DPH')) continue;
    if (name.includes('Rentmil s.r.o.') || name.includes('IČ.') || name.includes('tel.')) continue;

    // Cena je ve 3. sloupci (index 2)
    const priceStr = parts[2] || '';
    const price = parsePrice(priceStr);

    const cat = categorizeProduct(name);

    products.push({
      name,
      price,
      unit: 'ks',
      code: null,
      source: 'Nabídka BAZÉN-Table 1.csv',
      ...cat,
      description: null,
      lineNumber: i + 1
    });
  }

  return products;
}

function parseDATA(content: string): RawProduct[] {
  const products: RawProduct[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(';');

    // Hledáme sety
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j]?.trim();
      if (part && part.startsWith('BAZÉNOVÝ SET')) {
        // Cena je v dalším sloupci
        const priceStr = parts[j + 1] || '';
        const price = parsePrice(priceStr);

        products.push({
          name: part,
          price,
          unit: 'ks',
          code: null,
          source: 'DATA-Table 1.csv',
          category: 'sety',
          subcategory: 'standardni',
          productType: 'core',
          brand: 'RENTMIL',
          description: null,
          lineNumber: i + 1
        });
      }
    }
  }

  return products;
}

function parseList1(content: string): RawProduct[] {
  const products: RawProduct[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Hledáme zastřešení
    if (line.includes('Bazénové zastřešení PRACTIC')) {
      const match = line.match(/PRACTIC\s+(\d+)\s*x\s*(\d+)/i);
      if (match) {
        const name = `Bazénové zastřešení PRACTIC ${match[1]}x${match[2]}cm`;
        products.push({
          name,
          price: null,
          unit: 'ks',
          code: null,
          source: 'List1-Table 1.csv',
          category: 'zastreseni',
          subcategory: 'practic',
          productType: 'addon',
          brand: 'PRACTIC',
          description: null,
          lineNumber: i + 1
        });
      }
    }

    // Hledáme sety s cenami
    if (line.includes('CELKOVÁ CENA SETU')) {
      const parts = line.split(';');
      for (const part of parts) {
        const price = parsePrice(part);
        if (price && price > 10000) {
          // Cena setu nalezena
        }
      }
    }
  }

  return products;
}

function parseVyrobak(content: string): RawProduct[] {
  // Výrobák má podobnou strukturu jako Zakázkový list
  return parseZakazkovyList(content);
}

// Deduplikace produktů
function deduplicateProducts(products: RawProduct[]): RawProduct[] {
  const seen = new Map<string, RawProduct>();

  for (const product of products) {
    // Normalizovaný klíč pro deduplikaci
    const normalizedName = product.name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[,\.\-]/g, '')
      .trim();

    const key = `${normalizedName}`;

    if (!seen.has(key)) {
      seen.set(key, product);
    } else {
      // Pokud už existuje, preferuj verzi s cenou
      const existing = seen.get(key)!;
      if (!existing.price && product.price) {
        seen.set(key, product);
      }
      // Pokud existující nemá kód ale nový ano, preferuj nový
      if (!existing.code && product.code) {
        seen.set(key, { ...existing, code: product.code });
      }
    }
  }

  return Array.from(seen.values());
}

// Hlavní funkce
async function main() {
  console.log('='.repeat(60));
  console.log('EXTRAKCE PRODUKTŮ Z CSV SOUBORŮ');
  console.log('='.repeat(60));

  // Vytvoř output adresář
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allProducts: RawProduct[] = [];

  // Parsuj jednotlivé soubory
  const files = [
    { name: 'Rozšíření-Table 1.csv', parser: parseRozsireni },
    { name: 'Zakázkový list-Table 1.csv', parser: parseZakazkovyList },
    { name: 'Nabídka BAZÉN-Table 1.csv', parser: parseNabidkaBAZEN },
    { name: 'DATA-Table 1.csv', parser: parseDATA },
    { name: 'List1-Table 1.csv', parser: parseList1 },
    { name: ' Výrobák-Table 1.csv', parser: parseVyrobak },
  ];

  for (const file of files) {
    const filePath = path.join(CSV_DIR, file.name);
    if (fs.existsSync(filePath)) {
      console.log(`\nParsování: ${file.name}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const products = file.parser(content);
      console.log(`  Nalezeno: ${products.length} produktů`);
      allProducts.push(...products);
    } else {
      console.log(`  CHYBÍ: ${file.name}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`CELKEM EXTRAHOVÁNO: ${allProducts.length} produktů`);

  // Deduplikace
  const uniqueProducts = deduplicateProducts(allProducts);
  console.log(`PO DEDUPLIKACI: ${uniqueProducts.length} unikátních produktů`);

  // Statistiky podle kategorií
  console.log('\nSTATISTIKY PODLE KATEGORIÍ:');
  const categoryStats = new Map<string, number>();
  for (const product of uniqueProducts) {
    const count = categoryStats.get(product.category) || 0;
    categoryStats.set(product.category, count + 1);
  }
  for (const [category, count] of Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count}`);
  }

  // Export do JSON
  const outputPath = path.join(OUTPUT_DIR, 'extracted-products.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniqueProducts, null, 2), 'utf-8');
  console.log(`\nVýstup uložen do: ${outputPath}`);

  // Export do CSV
  const csvPath = path.join(OUTPUT_DIR, 'extracted-products.csv');
  const csvHeader = 'name;price;unit;code;category;subcategory;productType;brand;source;lineNumber\n';
  const csvRows = uniqueProducts.map(p =>
    `"${p.name}";${p.price || ''};${p.unit};"${p.code || ''}";${p.category};${p.subcategory};${p.productType};"${p.brand || ''}";${p.source};${p.lineNumber}`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
  console.log(`CSV uložen do: ${csvPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('EXTRAKCE DOKONČENA');
  console.log('='.repeat(60));
}

main().catch(console.error);
