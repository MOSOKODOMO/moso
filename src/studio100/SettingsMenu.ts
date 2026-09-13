export const SETTINGS_TABS = ['general', 'graphics', 'audio', 'controls'] as const;
export type SettingsTab = typeof SETTINGS_TABS[number];

interface SettingsMenuState {
  tab: SettingsTab;
  musicEnabled: boolean;
  musicVolume: number;
  lowGraphics: boolean;
  canVisit: boolean;
  fighting: boolean;
  saveFailed: boolean;
  bindings: ReadonlyArray<{ action: string; label: string; keys: string }>;
}
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]!));

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}
export function nextSettingsTab(tab: SettingsTab, key: string): SettingsTab | null {
  const current = SETTINGS_TABS.indexOf(tab);
  if (key === 'Home') return SETTINGS_TABS[0];
  if (key === 'End') return SETTINGS_TABS[SETTINGS_TABS.length - 1];
  if (key === 'ArrowLeft') return SETTINGS_TABS[(current + SETTINGS_TABS.length - 1) % SETTINGS_TABS.length];
  if (key === 'ArrowRight') return SETTINGS_TABS[(current + 1) % SETTINGS_TABS.length];
  return null;
}
export function updateSettingsVolume(root: ParentNode, volume: number): void {
  const percent = Math.round(Math.max(0, Math.min(1, volume)) * 100);
  const slider = root.querySelector<HTMLInputElement>('#music-volume');
  if (slider) {
    slider.style.setProperty('--music-level', percent + '%');
    slider.setAttribute('aria-valuetext', percent + ' percent');
  }
  const output = root.querySelector<HTMLOutputElement>('#music-volume-value');
  if (output) output.value = percent + '%';
}

/** A translucent in-world settings window; every control connects to existing game behavior. */
export function settingsMenu(state: SettingsMenuState): string {
  const volume = Math.round(Math.max(0, Math.min(1, state.musicVolume)) * 100);
  let panel = '';
  if (state.tab === 'general') {
    panel = `<div class="settings-row"><div><strong>Save game</strong><small id="settings-save-feedback" role="status">${state.saveFailed ? 'Saving is unavailable in this browser.' : 'Your progress saves on this browser.'}</small></div><button class="settings-text-button" data-action="save-game">Save now <span aria-hidden="true">◇</span></button></div>
      ${state.canVisit ? '<div class="settings-row"><strong>Your character</strong><button class="settings-text-button" data-action="character">Dressing room <span aria-hidden="true">↗</span></button></div><div class="settings-row"><strong>Professor archive</strong><button class="settings-text-button" data-action="faculty">Browse <span aria-hidden="true">↗</span></button></div>' : ''}
      ${state.fighting ? '<div class="settings-row"><strong>Leave this fight</strong><button class="settings-text-button" data-action="retreat">Go home <span aria-hidden="true">↗</span></button></div>' : ''}
      <div class="settings-row"><div><strong>Restart semester</strong><small>Keep your appearance and settings.</small></div><button class="settings-text-button settings-restart" data-action="restart-game">Restart <span aria-hidden="true">↻</span></button></div>`;
  } else if (state.tab === 'graphics') {
    panel = `<div class="settings-row settings-quality-row"><div><strong>Render quality</strong><small>Choose the resolution that suits your device.</small></div><div class="settings-options" role="group" aria-label="Render quality"><button data-action="graphics-toggle" aria-pressed="${!state.lowGraphics}" ${!state.lowGraphics ? 'disabled' : ''}>High</button><button data-action="graphics-toggle" aria-pressed="${state.lowGraphics}" ${state.lowGraphics ? 'disabled' : ''}>Battery saver</button></div></div><p class="settings-note">${state.lowGraphics ? 'Reduced rendering resolution for older phones and lower power use.' : 'Sharper rendering on high-density screens.'}</p>`;
  } else if (state.tab === 'audio') {
    panel = `<div class="settings-row"><div><strong>Background music</strong><small>A little way home · original game music</small></div><button class="settings-switch" data-action="music-toggle" role="switch" aria-label="Background music" aria-checked="${state.musicEnabled}"><i aria-hidden="true"></i><span>${state.musicEnabled ? 'On' : 'Off'}</span></button></div>
      <div class="settings-volume-row"><label for="music-volume">Music volume</label><input id="music-volume" type="range" min="0" max="100" step="1" value="${volume}" style="--music-level:${volume}%" aria-valuetext="${volume} percent"><output id="music-volume-value" for="music-volume">${volume}%</output></div>`;
  } else {
    panel = `<p class="settings-note" id="binding-feedback" role="status">Select a key to change it. Escape cancels.</p><div class="settings-binding-grid">${state.bindings.map(binding => `<button class="settings-binding" data-action="rebind:${escape(binding.action)}" aria-label="Change ${escape(binding.label.toLowerCase())} key"><span>${escape(binding.label)}</span><kbd>${escape(binding.keys)}</kbd></button>`).join('')}</div><p class="settings-note settings-fixed-keys"><kbd>M</kbd> Building &nbsp; <kbd>1–3</kbd> Tools &nbsp; <kbd>Esc</kbd> Menu</p>`;
  }
  return `<nav class="settings-tabs" role="tablist" aria-label="Settings categories">${SETTINGS_TABS.map(tab => `<button id="settings-tab-${tab}" role="tab" aria-selected="${state.tab === tab}" aria-controls="settings-panel" tabindex="${state.tab === tab ? 0 : -1}" data-action="settings-tab:${tab}">${tab.toUpperCase()}</button>`).join('')}</nav><section class="settings-content" id="settings-panel" role="tabpanel" aria-labelledby="settings-tab-${state.tab}" tabindex="0">${panel}</section><footer class="settings-footer"><span><kbd>Esc</kbd> Back to the game</span><button data-action="close" class="settings-resume">Resume →</button></footer>`;
}
