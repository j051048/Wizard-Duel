import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPELLS } from '../constants.ts';

const SAFE_ZERO_MANA_IDS = new Set(['fire7', 'vine7', 'luck_coin']);

export function validateSpells() {
  const issues: string[] = [];
  const seenIds = new Set<string>();

  SPELLS.forEach(spell => {
    if (seenIds.has(spell.id)) {
      issues.push(`Duplicate spell id: ${spell.id}`);
    }
    seenIds.add(spell.id);

    if (spell.manaCost < 0) {
      issues.push(`Negative mana cost in ${spell.id}: ${spell.manaCost}`);
    }

    // Zero-cost cards are allowed only when explicitly reviewed and kept low impact.
    if (
      spell.manaCost === 0 &&
      !spell.id.startsWith('hero_') &&
      spell.id !== 'skip' &&
      !SAFE_ZERO_MANA_IDS.has(spell.id)
    ) {
      issues.push(`Zero mana cost detected for ${spell.id} (${spell.name})`);
    }

    if (spell.description) {
      const desc = spell.description.toLowerCase();

      if (desc.includes('free') || desc.includes('cast for free') || desc.includes('without paying')) {
        issues.push(`Potential free-cast mechanic in description of ${spell.id} (${spell.name})`);
      }

      if (desc.includes('for each') || desc.includes('每个')) {
        issues.push(`Potential uncapped scaling in ${spell.id} (${spell.name})`);
      }
    }

    if (spell.manaCost > 0 && spell.damage > spell.manaCost * 2 + 2) {
      issues.push(`High damage efficiency in ${spell.id}: ${spell.damage} damage for ${spell.manaCost} mana`);
    }

    if (!spell.artSrc && !spell.id.startsWith('hero_') && spell.id !== 'skip') {
      issues.push(`Missing artSrc for ${spell.id} (${spell.name})`);
    }
  });

  return issues;
}

const isCli = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isCli) {
  const issues = validateSpells();

  if (issues.length === 0) {
    console.log(`OK: ${SPELLS.length} spells validated successfully.`);
  } else {
    console.error(`Found ${issues.length} card validation issue(s):`);
    issues.forEach(issue => console.error(`  - ${issue}`));
    process.exitCode = 1;
  }
}
