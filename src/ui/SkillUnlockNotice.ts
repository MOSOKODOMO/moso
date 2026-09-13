/** A non-blocking, one-time learning invitation. Persistence belongs to Game. */
export class SkillUnlockNotice {
  private readonly root = document.createElement('section');
  private readonly openButton = document.createElement('button');
  private onOpenLearning: (() => void) | null = null;

  constructor() {
    this.root.id = 'skill-unlock-notice';
    this.root.className = 'hidden';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-labelledby', 'skill-unlock-title');
    this.root.innerHTML = '<div class="skill-unlock-copy" role="status"><span class="skill-unlock-eyebrow">LEVEL 3 · A NEW CHOICE</span>' +
      '<h3 id="skill-unlock-title">Skills unlocked!</h3><p>You earned 1 skill point. Choose Dash Slash, Sword Rain or Berserk as your first skill.</p></div>';
    const actions = document.createElement('div');
    actions.className = 'skill-unlock-actions';
    this.openButton.type = 'button';
    this.openButton.className = 'menu-btn primary';
    this.openButton.textContent = 'Open skill learning';
    this.openButton.addEventListener('click', () => {
      const open = this.onOpenLearning;
      this.dismiss();
      open?.();
    });
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'menu-btn';
    later.textContent = 'Later';
    later.setAttribute('aria-label', 'Dismiss skill unlock message; learn later in Stats');
    later.addEventListener('click', () => this.dismiss());
    actions.append(this.openButton, later);
    this.root.appendChild(actions);
    this.root.addEventListener('keydown', (event) => {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') event.stopPropagation();
    });
    (document.getElementById('hud') ?? document.body).appendChild(this.root);
  }

  show(onOpenLearning: () => void): void {
    this.onOpenLearning = onOpenLearning;
    this.root.classList.remove('hidden');
  }

  private dismiss(): void {
    const hadFocus = this.root.contains(document.activeElement);
    this.root.classList.add('hidden');
    this.onOpenLearning = null;
    if (hadFocus) document.getElementById('stats-button')?.focus({ preventScroll: true });
  }
}
