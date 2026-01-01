// Generated changelog data
// Update this file when releasing a new version
// Or run a script to generate from CHANGELOG.md

import type { ChangelogVersion } from './changelog'

export const CURRENT_VERSION = '0.1.0'

export const changelogVersions: ChangelogVersion[] = [
  {
    version: '0.1.0',
    date: '2025-01-01',
    changes: [
      {
        type: 'feature',
        scope: 'nabidky',
        description: 'Drag & drop řazení položek v editoru nabídek',
      },
      {
        type: 'feature',
        scope: 'nabidky',
        description: 'Nové produkty se přidávají na začátek seznamu',
      },
      {
        type: 'feature',
        scope: 'ui',
        description: 'Vylepšený katalog produktů s tlačítkem "+" a hover efektem',
      },
      {
        type: 'feature',
        scope: 'konfigurace',
        description: '11-krokový konfigurátor bazénů',
      },
      {
        type: 'feature',
        scope: 'nabidky',
        description: 'Systém variant nabídek (Ekonomická, Optimální, Prémiová)',
      },
      {
        type: 'feature',
        scope: 'objednavky',
        description: 'Konverze nabídek na objednávky',
      },
      {
        type: 'feature',
        scope: 'vyroba',
        description: 'Sledování výroby s checklistem',
      },
      {
        type: 'feature',
        scope: 'produkty',
        description: 'Synchronizace produktů z Pipedrive',
      },
      {
        type: 'feature',
        scope: 'auth',
        description: 'Přihlašování a správa uživatelů',
      },
      {
        type: 'fix',
        scope: 'nabidky',
        description: 'Oprava načítání položek při editaci existující nabídky',
      },
    ],
  },
]
