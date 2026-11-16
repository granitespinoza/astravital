// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Motion preference. It starts from the system setting ("reduce motion"), but the person can switch it:
// a simplified intro should never leave someone unable to see how the glasses move (user control and freedom).
const KEY = 'astravital-motion';
export const motionMode = () => document.documentElement.dataset.motion === 'reduced' ? 'reduced' : 'full';
// Scripted scrolling must follow the same preference as the CSS animations.
export const scrollBehavior = () => motionMode() === 'reduced' ? 'auto' : 'smooth';

export function initMotionToggle(button) {
  if (!button) return;
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-label', 'Full motion');
  const render = () => {
    const full = motionMode() === 'full';
    const system = document.documentElement.dataset.source === 'system';
    button.textContent = 'Full motion: ' + (full ? 'on' : 'off') + (!full && system ? ' (system setting)' : '');
    button.setAttribute('aria-checked', String(full));
    button.title = full ? 'Animations are on. Press to simplify them.' : 'Animations are simplified. Press to turn full motion on.';
  };
  button.addEventListener('click', () => {
    const next = motionMode() === 'reduced' ? 'full' : 'reduced';
    document.documentElement.dataset.motion = next;
    document.documentElement.dataset.source = 'you';
    try { localStorage.setItem(KEY, next); } catch { /* the choice just lasts for this visit */ }
    render();
  });
  render();
}
