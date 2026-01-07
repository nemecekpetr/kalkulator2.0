/**
 * Script to crawl and index rentmil.cz website content for RAG
 *
 * Usage: npx tsx scripts/index-website.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Pages to index - from sitemap
const PAGES_TO_INDEX = [
  // Hlavní stránky
  { url: 'https://www.rentmil.cz/', type: 'page' as const, title: 'Úvodní stránka' },
  { url: 'https://www.rentmil.cz/o-nas', type: 'page' as const, title: 'O nás' },
  { url: 'https://www.rentmil.cz/kontakty', type: 'page' as const, title: 'Kontakty' },
  { url: 'https://www.rentmil.cz/reference', type: 'page' as const, title: 'Reference' },

  // Katalog
  { url: 'https://www.rentmil.cz/katalog', type: 'product' as const, title: 'Katalog' },
  { url: 'https://www.rentmil.cz/katalog/bazeny', type: 'product' as const, title: 'Bazény' },
  { url: 'https://www.rentmil.cz/katalog/bazenove-sety', type: 'product' as const, title: 'Bazénové sety' },
  { url: 'https://www.rentmil.cz/katalog/zastreseni-bazenu', type: 'product' as const, title: 'Zastřešení bazénů' },
  { url: 'https://www.rentmil.cz/katalog/bazeny/zapustene-bazeny', type: 'product' as const, title: 'Zapuštěné bazény' },
  { url: 'https://www.rentmil.cz/katalog/bazeny/nadzemni-bazeny', type: 'product' as const, title: 'Nadzemní bazény' },
  { url: 'https://www.rentmil.cz/katalog/bazeny/bazenove-prislusenstvi', type: 'product' as const, title: 'Bazénové příslušenství' },

  // Radíme vám - nejdůležitější články
  { url: 'https://www.rentmil.cz/radime-vam', type: 'blog' as const, title: 'Radíme vám' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-zazimovat-bazen', type: 'blog' as const, title: 'Jak zazimovat bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-ten-spravny-bazen-73946', type: 'blog' as const, title: 'Jak vybrat správný bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/jaka-je-idealni-alkalita-vody-v-bazenu-a-proc-na-ni-zalezi', type: 'blog' as const, title: 'Ideální alkalita vody' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-bazenovou-filtraci-73952', type: 'blog' as const, title: 'Jak vybrat filtraci' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-udrzovat-cistou-vodu-v-bazenu', type: 'blog' as const, title: 'Údržba čisté vody' },
  { url: 'https://www.rentmil.cz/radime-vam/ohrev-vody-v-bazenu-73953', type: 'blog' as const, title: 'Ohřev vody v bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/5-velkych-vyhod-zastreseni-bazenu-73957', type: 'blog' as const, title: 'Výhody zastřešení' },
  { url: 'https://www.rentmil.cz/radime-vam/proc-si-vybrat-plastovy-bazen', type: 'blog' as const, title: 'Proč plastový bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/prelivovy-bazen', type: 'blog' as const, title: 'Přelivový bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/kdy-vyhrava-plastovy-a-kdy-foliovy-bazen', type: 'blog' as const, title: 'Plastový vs fóliový' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-bazen-podle-svych-predstav', type: 'blog' as const, title: 'Výběr bazénu podle představ' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-idealni-parametry-bazenu', type: 'blog' as const, title: 'Ideální parametry bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/bazeny-se-slanou-vodou', type: 'blog' as const, title: 'Bazény se slanou vodou' },
  { url: 'https://www.rentmil.cz/radime-vam/bazeny-s-filtraci', type: 'blog' as const, title: 'Bazény s filtrací' },
  { url: 'https://www.rentmil.cz/radime-vam/krok-za-krokem-jak-odzimovat-bazen-111234', type: 'blog' as const, title: 'Jak odzimovat bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/bazen-na-zahradu', type: 'blog' as const, title: 'Bazén na zahradu' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-a-pripravit-podklad-pod-bazen', type: 'blog' as const, title: 'Podklad pod bazén' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-zastreseni-bazenu', type: 'blog' as const, title: 'Výběr zastřešení' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vycistit-zeleny-bazen-zbavte-se-necistot-v-5-krocich', type: 'blog' as const, title: 'Čištění zeleného bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/solarni-ohrev-bazenu-prodlouzi-koupaci-sezonu-o-tydny-jak-ho-vybrat', type: 'blog' as const, title: 'Solární ohřev' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vycistit-bazen-po-zime-a-pripravit-ho-na-novou-sezonu', type: 'blog' as const, title: 'Čištění po zimě' },
  { url: 'https://www.rentmil.cz/radime-vam/krok-za-krokem-stavime-novy-bazen-90741', type: 'blog' as const, title: 'Stavba nového bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-spravne-a-jak-casto-filtrovat-bazen', type: 'blog' as const, title: 'Jak často filtrovat' },
  { url: 'https://www.rentmil.cz/radime-vam/udrzba-bazenu-jak-na-to', type: 'blog' as const, title: 'Údržba bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vybrat-tepelne-cerpadlo-pro-bazen', type: 'blog' as const, title: 'Výběr tepelného čerpadla' },
  { url: 'https://www.rentmil.cz/radime-vam/trapi-vas-mlecna-voda-v-bazenu-vysvetlime-co-ji-zpusobuje-a-jak-se-ji-zbavite', type: 'blog' as const, title: 'Mléčná voda v bazénu' },
  { url: 'https://www.rentmil.cz/radime-vam/vymena-pisku-ve-filtraci-kdy-jak-a-proc-ji-delat', type: 'blog' as const, title: 'Výměna písku ve filtraci' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-vycistit-steny-bazenu-a-dno-krok-za-krokem', type: 'blog' as const, title: 'Čištění stěn a dna' },
  { url: 'https://www.rentmil.cz/radime-vam/jak-upravit-ph-vody-v-bazenu-zvyseni-i-snizeni-krok-za-krokem', type: 'blog' as const, title: 'Úprava pH vody' },
]

// Create Supabase client with service role
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Fetch and extract text from a webpage
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    console.log(`  Fetching: ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RentmilBot/1.0 (indexing for internal assistant)',
      },
    })

    if (!response.ok) {
      console.error(`  Failed to fetch ${url}: ${response.status}`)
      return null
    }

    const html = await response.text()
    return extractTextFromHtml(html)
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error)
    return null
  }
}

/**
 * Extract clean text from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Remove header and footer (common patterns)
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')

  // Keep only main content if possible
  const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  const contentMatch = text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)

  if (mainMatch) {
    text = mainMatch[1]
  } else if (articleMatch) {
    text = articleMatch[1]
  } else if (contentMatch) {
    text = contentMatch[1]
  }

  // Convert common block elements to newlines
  text = text.replace(/<\/?(h[1-6]|p|div|section|article|li|br)[^>]*>/gi, '\n')

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()

  return text
}

/**
 * Split text into chunks of approximately targetSize tokens
 */
function chunkText(
  text: string,
  targetSize: number = 500,
  overlap: number = 50
): string[] {
  // Rough approximation: 1 token ≈ 4 characters for Czech
  const charSize = targetSize * 4
  const overlapChars = overlap * 4

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + charSize

    // Find a good break point (sentence or paragraph end)
    if (end < text.length) {
      // Look for sentence end
      const sentenceEnd = text.lastIndexOf('. ', end)
      const paragraphEnd = text.lastIndexOf('\n', end)

      if (sentenceEnd > start + charSize / 2) {
        end = sentenceEnd + 1
      } else if (paragraphEnd > start + charSize / 2) {
        end = paragraphEnd + 1
      }
    }

    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) {
      // Only add meaningful chunks
      chunks.push(chunk)
    }

    start = end - overlapChars
    if (start < 0) start = 0
    if (start >= text.length) break
  }

  return chunks
}

/**
 * Extract keywords from text (simple approach)
 */
function extractKeywords(text: string): string[] {
  // Common Czech stop words
  const stopWords = new Set([
    'a', 'i', 'o', 'u', 'v', 'k', 's', 'z', 'na', 'do', 'pro', 'od', 'za',
    'je', 'jsou', 'byl', 'byla', 'bylo', 'být', 'se', 'si', 'to', 'ta', 'ten',
    'ty', 'tato', 'tento', 'které', 'který', 'která', 'co', 'jak', 'když',
    'nebo', 'ale', 'že', 've', 'po', 'při', 'pod', 'nad', 'mezi', 'před',
    'již', 'jen', 'tak', 'také', 'jako', 'více', 'velmi', 'může', 'můžete',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))

  // Count occurrences
  const counts = new Map<string, number>()
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1)
  }

  // Return top keywords
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}

/**
 * Generate content hash for change detection
 */
function generateHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

async function main() {
  console.log('Starting website indexing...\n')

  const supabase = createSupabaseClient()

  let totalChunks = 0
  let newChunks = 0
  let updatedChunks = 0

  for (const page of PAGES_TO_INDEX) {
    console.log(`\nProcessing: ${page.title}`)

    const content = await fetchPageContent(page.url)
    if (!content) {
      console.log('  Skipped (no content)')
      continue
    }

    console.log(`  Content length: ${content.length} chars`)

    // Chunk the content
    const chunks = chunkText(content)
    console.log(`  Chunks: ${chunks.length}`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const hash = generateHash(chunk)
      const keywords = extractKeywords(chunk)

      const chunkUrl = `${page.url}#chunk-${i + 1}`

      // Check if chunk exists
      const { data: existing } = await supabase
        .from('assistant_knowledge')
        .select('id, content_hash')
        .eq('source_url', chunkUrl)
        .single()

      if (existing) {
        if (existing.content_hash === hash) {
          // No change
          totalChunks++
          continue
        }

        // Update existing
        await supabase
          .from('assistant_knowledge')
          .update({
            content: chunk,
            content_hash: hash,
            keywords,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        updatedChunks++
      } else {
        // Insert new
        await supabase.from('assistant_knowledge').insert({
          source_url: chunkUrl,
          source_type: page.type,
          title: `${page.title} (část ${i + 1})`,
          content: chunk,
          content_hash: hash,
          keywords,
          active: true,
        })

        newChunks++
      }

      totalChunks++
    }
  }

  console.log('\n=== Indexing Complete ===')
  console.log(`Total chunks: ${totalChunks}`)
  console.log(`New chunks: ${newChunks}`)
  console.log(`Updated chunks: ${updatedChunks}`)
  console.log(`Unchanged: ${totalChunks - newChunks - updatedChunks}`)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
