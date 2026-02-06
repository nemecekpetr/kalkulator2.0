-- Update set product descriptions to a cleaner format
UPDATE products
SET description = 'Bazénový skelet obdélníkového tvaru se zakulacenými rohy z vysoce kvalitního polypropylénu německé výroby

Set obsahuje:
• Vnitřní rohové románské třístupňové schodiště z protiskluzového materiálu
• Ukončení hran bazénu trubkovým lemem v barvě skeletu
• Skimmer, recirkulační trysky
• Kvalitní písková filtrace vč. pískové náplně
• Kompletní propojovací materiál do 2 m od bazénu
• Kompletní montáž vč. proškolení obsluhy v den dodání
• Doprava do 100 km od Plzně ZDARMA
• Zateplení dna polystyrénem STYRODUR ZDARMA'
WHERE category = 'sety' AND description IS NOT NULL;
