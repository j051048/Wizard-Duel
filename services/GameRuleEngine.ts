import { DuelState, GameActionCommand, StatusEffect, SpellType } from '../types';
import { checkGameOver, executeSpell, executeAITurn, prepareNextTurn } from './gameLogic';
import { GameSequenceExecutor } from './sequence';

/**
 * GameRuleEngine
 * 
 * Centralizes the "business logic" of the game loop.
 * Orchestrates the transition between states and generates the necessary
 * UI commands (animations, logs) for the GameLoop to consume.
 */
export class GameRuleEngine {

  /**
   * Executes a spell cast by a player or opponent.
   * Handles the immediate effects + chained reaction commands.
   */
  static castSpell(
    currentState: DuelState,
    spellId: SpellType,
    caster: 'player' | 'opponent'
  ): { newState: DuelState, commands: GameActionCommand[] } {
    const commands: GameActionCommand[] = [];

    // 1. Initial Logic Execution (Calculations)
    // executeSpell now performs validation internally (e.g. Frozen check)
    const { newState: postCastState, logs, command: spellCommand } = executeSpell(currentState, caster, spellId);
    
    // If validation failed (e.g. logs returned but no actions?), we still proceed but maybe state didn't change much.
    // However, if it failed completely, usually we want to show that.

    // 2. Simulate/Apply the actions into a sequence of commands for the UI
    // We start from the *original* state because we want to animate the transition step-by-step.
    // Wait, `executeSpell` returns the *Final* state as `newState`.
    // But `useGameLoop` needs the *Steps*.
    
    let tempState = { ...currentState };

    // Push the logic command source if needed?
    // Current loop pushes 'playerCard' UI updates before calling this. We can assume UI handled that.

    // 2.1 Process the main spell command actions
    if (spellCommand && spellCommand.actions.length > 0) {
        // [Optimization] We could push the entire command to `GameSequenceExecutor` but 
        // the current UI queue expects granular UPDATE_STATE and messages.
        
        for (const action of spellCommand.actions) {
            const result = GameSequenceExecutor.applyAction(tempState, action);
            tempState = result.state;
            
            commands.push({ type: 'UPDATE_STATE', payload: result.state });
            if (result.log) {
                commands.push({ type: 'ADD_MESSAGE', payload: result.log });
            }

            // Early breakout on death
            if (checkGameOver(tempState)) break;
        }
    } else {
        // If no actions (e.g. failure), we still might have logs.
    }

    // Add any top-level logs from executeSpell that weren't inside actions
    if (logs && logs.length > 0) {
        // Filter out logs that might have been duplicated if they were attached to actions?
        // executeSpell logs usually are about 'Countered', 'Frozen', etc.
        logs.forEach(msg => commands.push({ type: 'ADD_MESSAGE', payload: msg }));
    }

    // 3. Final Death Check
    const gameOver = checkGameOver(tempState);
    if (gameOver) {
        commands.push({ type: 'UPDATE_UI', payload: {
            isGameOver: true,
            gameResult: gameOver === 'DRAW' ? 'LOSS' : gameOver,
            resultText: gameOver,
        }});
        commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
        // We return the state at point of death
        return { newState: tempState, commands };
    } 

    // 4. Return the final clean state (from executeSpell) to ensure consistency
    // However, tempState should be identical to postCastState if GameSequenceExecutor is deterministic.
    // Let's trust tempState which reflects the *animation path*.
    
    return { newState: tempState, commands };
  }

  /**
   * Resolves the Minion Combat Phase properly.
   * - Sequential attacks
   * - Death check after EACH attack
   * - Consistent snapshotting
   */
  static resolveMinionCombat(initialState: DuelState): { 
      finalState: DuelState, 
      commands: GameActionCommand[] 
  } {
      // Snapshot state
      let currentState = { ...initialState };
      const commands: GameActionCommand[] = [];

      // Helper to check game over
      const checkBreak = () => {
           const result = checkGameOver(currentState);
           if (result) {
                commands.push({ type: 'UPDATE_UI', payload: {
                    isGameOver: true,
                    gameResult: result === 'DRAW' ? 'LOSS' : result,
                    resultText: result,
                }});
                commands.push({ type: 'SET_PHASE', payload: 'ROUND_RESET' });
                return true;
           }
           return false;
      };

      if (checkBreak()) return { finalState: currentState, commands };

      // Identify active minions by ID to handle array shifting
      const playerMinionIds = currentState.playerMinions
        .filter(m => !m.exhausted)
        .map(m => m.instanceId);
        
      const opponentMinionIds = currentState.opponentMinions
        .filter(m => !m.exhausted)
        .map(m => m.instanceId);

      if (playerMinionIds.length === 0 && opponentMinionIds.length === 0) {
          return { finalState: currentState, commands };
      }

      commands.push({ type: 'ADD_MESSAGE', payload: '⚔️ 随从进攻阶段！' });
      commands.push({ type: 'WAIT', payload: null, delay: 500 });
      
      // 1. Player Minions Attack
      for (const id of playerMinionIds) {
           // Find current index
           const idx = currentState.playerMinions.findIndex(m => m.instanceId === id);
           if (idx === -1) continue; // Minion died
           
           // Double check exhaustion (though we filtered initially)
           if (currentState.playerMinions[idx].exhausted) continue;

           commands.push({ type: 'EXECUTE_LOGIC', payload: () => {}, delay: 300 });

           // target='player' means Player is the Attacker source (Legacy convention)
           const action = { type: 'MINION_ATTACK', target: 'player', value: idx } as any;
           const result = GameSequenceExecutor.applyAction(currentState, action);
           
           currentState = result.state;
           commands.push({ type: 'UPDATE_STATE', payload: currentState });
           if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });

           if (checkBreak()) return { finalState: currentState, commands };
      }

      // 2. Opponent Minions Attack
      for (const id of opponentMinionIds) {
           const idx = currentState.opponentMinions.findIndex(m => m.instanceId === id);
           if (idx === -1) continue;
           if (currentState.opponentMinions[idx].exhausted) continue;

           commands.push({ type: 'WAIT', payload: null, delay: 300 });

           // target='opponent' means Opponent is the Attacker source
           const action = { type: 'MINION_ATTACK', target: 'opponent', value: idx } as any;
           const result = GameSequenceExecutor.applyAction(currentState, action);
           
           currentState = result.state;
           commands.push({ type: 'UPDATE_STATE', payload: currentState });
           if (result.log) commands.push({ type: 'ADD_MESSAGE', payload: result.log });

           if (checkBreak()) return { finalState: currentState, commands };
      }
      
      return { finalState: currentState, commands };
  }

}
