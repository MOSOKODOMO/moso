import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    // Windows may briefly lock native icon files while installing a shortcut.
    // Checkpoints are artifacts, so their copies should not reload the game.
    watch: { ignored: ['**/development/**', '**/*.ico'] },
  },
  build: {
    target: 'es2020',
  },
});
