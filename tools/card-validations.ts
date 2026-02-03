import { SPELLS } from '../constants.ts';

export function validateSpells() {
  const issues: string[] = [];

  SPELLS.forEach(s => {
    if (s.manaCost !== undefined && s.manaCost === 0) {
      issues.push(`Zero mana cost detected for ${s.id} (${s.name})`);
    }
    // detect potential free-cast strings in abilities
    if (s.abilities) {
      const joined = s.abilities.join(' ').toLowerCase();
      if (joined.includes('free') || joined.includes('cast for free') || joined.includes('without paying')) {
        issues.push(`Potential free-cast mechanic in abilities of ${s.id} (${s.name})`);
      }
    }
    // uncapped scaling detection (simple heuristic)
    if (s.abilities) {
      const joined = s.abilities.join(' ').toLowerCase();
      if (joined.includes('for each') || joined.includes('each')) {
        issues.push(`Potential uncapped scaling ability in ${s.id} (${s.name})`);
      }
    }
  });

  return issues;
}
