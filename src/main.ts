/** Entry point — mounts the game. Systems live in game/Game.ts. */
import './style.css';
import './ui/compact-hud.css';
import './ui/character-panel.css';
import './ui/inventory-panel.css';
import './ui/skill-learning.css';
import './ui/campaign.css';
import { Game } from './game/Game';
import { StudioGame } from './studio100/StudioGame';

function showFatalError(error: unknown): void {
  console.error(error);
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;' +
    'background:rgba(10,12,20,0.9);color:#ffb3b3;font-family:monospace;padding:24px;text-align:center;';
  overlay.textContent = `Game failed to start: ${error instanceof Error ? error.message : String(error)}`;
  document.body.appendChild(overlay);
}

try {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container element not found');
  const game = new URLSearchParams(location.search).get('mode') === 'farm' ? new Game(container) : new StudioGame(container);
  game.start();
} catch (error) {
  showFatalError(error);
}
