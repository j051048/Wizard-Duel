
import { createInitialDuelState, executeSpell, executeAITurn, prepareNextTurn, canAffordSpell, recalculateCostMod } from '../services/gameLogic';
import { DuelState, SpellType } from '../types';
import { SPELLS } from '../constants';

// ANSI Colors for Console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m"
};

const log = (msg: string, color: string = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const pass = (msg: string) => log(`[PASS] ${msg}`, colors.green);
const fail = (msg: string) => log(`[FAIL] ${msg}`, colors.red);
const info = (msg: string) => log(`[INFO] ${msg}`, colors.blue);

function assert(condition: boolean, msg: string) {
  if (condition) pass(msg);
  else {
    fail(msg);
    process.exit(1);
  }
}

async function runSimulation() {
  log("\n⚔️  WIZARD DUEL - BATTLE LIGIC E2E TEST (BLIZZARD STANDARD) ⚔️\n", colors.bold + colors.magenta);

  // ==========================================
  // TEST SUITE 1: BASIC COMBAT MECHANICS
  // ==========================================
  info(">>> STARTING SUITE 1: Basic Combat Flow");
  
  let state = createInitialDuelState(['fire', 'ice', 'thunder', 'vine', 'rock']);
  
  // 1.1 Initial State Check
  assert(state.playerMana === 1, "Player starts with 1 Mana");
  assert(state.playerHand.length === 5, "Player starts with 5 cards");
  assert(state.opponentHandSize === 5, "Opponent has 5 cards");

  // Force give player 10 mana for testing actions
  state.playerMana = 10;
  state.opponentMana = 10;
  
  // 1.2 Play 'Fire' (Cost 4, Dmg 6)
  info("Action: Player casts Fire (4 Mana, 6 Dmg)");
  const fireResult = executeSpell(state, 'player', 'fire');
  state = fireResult.newState;
  
  assert(state.playerMana === 6, "Mana deducted correctly (10 - 4 = 6)");
  assert(state.opponentHP === 24, "Damage applied correctly (30 - 6 = 24)"); // Assuming 30 MaxHP from config
  assert(state.playerLastSpell === 'fire', "Last spell recorded");

  // 1.3 AI Turn (Basic)
  info("Action: AI Turn Execution");
  const aiResult = executeAITurn(state);
  state = aiResult.newState;
  
  // AI should have played something if mana allowed
  if (state.opponentMana < 10) {
      pass("AI consumed mana to play cards");
      log(`   AI Logs: ${aiResult.logs.join(' | ')}`, colors.yellow);
  } else {
      info("AI passed turn (might be intentional if no cards affordable)");
  }

  // ==========================================
  // TEST SUITE 2: STATUS EFFECTS (FROZEN/TANGLE)
  // ==========================================
  info("\n>>> STARTING SUITE 2: Status Effects (Deep Logic)");

  // Reset State
  state = createInitialDuelState(['fire', 'ice', 'thunder', 'vine', 'rock']);
  state.playerMana = 10;
  state.opponentMana = 10;

  // 2.1 Test FREEZE Logic
  info("Testing ICE (Freeze) Mechanic...");
  // Player cast Ice (3 Mana, 4 Dmg, Freeze opponent)
  // Note: Freeze mechanic usually requires DRAW or WIN condition in description, 
  // but let's check if the generic 'freeze' mechanic applies 'frozen' effect in code
  // Looking at code: if (spell.mechanic === 'freeze') -> applies frozen if not immune.
  
  const iceResult = executeSpell(state, 'player', 'ice');
  state = iceResult.newState;
  
  const isOpponentFrozen = state.opponentEffects.some(e => e.type === 'frozen');
  assert(isOpponentFrozen, "Opponent should be Frozen after Ice spell");

  // 2.2 Verify AI Skip on Freeze
  info("Verifying AI obeys Freeze...");
  const frozenAiTurn = executeAITurn(state);
  state = frozenAiTurn.newState;
  
  const frozenLogPresent = frozenAiTurn.logs.some(l => l.includes('被彻底冻结') || l.includes('Frozen'));
  assert(frozenLogPresent, "AI Log should indicate Freeze skip");
  assert(state.opponentMana === 10, "AI used NO mana while frozen");

  // 2.3 Test TANGLE Logic
  info("\nTesting VINE (Tangle) Mechanic...");
  // Clear effects
  state.opponentEffects = [];
  state.playerEffects = [];
  
  // Player cast Vine (2 Mana, 3 Dmg, Tangle opponent)
  const vineResult = executeSpell(state, 'player', 'vine');
  state = vineResult.newState;
  
  const isTangled = state.opponentEffects.some(e => e.type === 'tangle');
  assert(isTangled, "Opponent should be Tangled");
  
  // Check Cost Mod Calculation
  assert(state.opponentCostMod === 2, "Opponent Cost Mod should be +2 immediately");
  
  // Verify Affordability Impact
  // AI has 10 Mana. A 4 cost spell should now cost 6.
  // A 10 cost spell (if exists) should be unaffordable (12).
  
  const testSpellCost = 4;
  const spellId = 'fire'; // assuming fire is 4 cost
  const check = canAffordSpell(spellId, 5, state.opponentEffects, state.opponentCostMod);
  // Cost 4 + 2 = 6. Mana 5. Should fail.
  assert(check.canAfford === false, "Tangle should make 4-cost spell unaffordable with 5 mana");
  assert(check.reason !== undefined && check.reason.includes('法力不足'), "Reason should be insufficient mana");

  // ==========================================
  // TEST SUITE 3: DOT & ROUND TRANSITION
  // ==========================================
  info("\n>>> STARTING SUITE 3: DoT & Round Transition");
  
  // Setup Burn
  state.opponentEffects = [{ type: 'burn', value: 2, duration: 2 }];
  state.opponentHP = 10;
  
  info("Processing Round Transition (Turn End)...");
  state = prepareNextTurn(state);
  
  assert(state.opponentHP === 8, "Burn damage applied correctly (10 - 2 = 8)");
  assert(state.opponentEffects[0].duration === 1, "Burn duration decreased");

  // ==========================================
  // TEST SUITE 4: EXTREME CASES (CHEATING/BUGS)
  // ==========================================
  info("\n>>> STARTING SUITE 4: Boundary & Safety Checks");
  
  // 4.1 Negative Mana Protection
  state.playerMana = 1;
  const cheatResult = executeSpell(state, 'player', 'fire'); // Costs 4
  // Logic should prevent executing or just strictly deduct?
  // Our executeSpell assumes "canAfford" was checked by UI, but inside it has a "double check"
  
  const cheatLog = cheatResult.logs.find(l => l.includes('法力不足') || l.includes('Insufficient'));
  assert(!!cheatLog, "Backend should reject insufficient mana actions");

  log("\n✅ ALL SYSTEMS FUNCTIONAL. READY FOR DEPLOYMENT.", colors.bold + colors.green);
}

runSimulation().catch(console.error);
