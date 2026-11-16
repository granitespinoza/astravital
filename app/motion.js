// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Motion preference. Full motion is ON by default so the lens is seen to move; anyone can switch it off
// (the choice is remembered), and scripted scrolling follows the same setting (user control and freedom).
const KEY = 'astravital-motion';
export const motionMode = () => document.documentElement.dataset.motion === 'reduced' ? 'reduced' : 'full';
export const scrollBehavior = () => motionMode() === 'reduced' ? 'auto' : 'smooth';

export function initMotionToggle(button) {
  if (!button) return;
  button.setAttribute('role', 'switch');
  button.setAttribute('aria-label', 'Full motion');
  const render = () => {
    const full = motionMode() === 'full';
    button.textContent = 'Full motion: ' + (full ? 'on' : 'off');
    button.setAttribute('aria-checked', String(full));
    button.title = full ? 'Animations are on. Press to simplify them.' : 'Animations are simplified. Press to turn full motion on.';
  };
  button.addEventListener('click', () => {
    const next = motionMode() === 'reduced' ? 'full' : 'reduced';
    document.documentElement.dataset.motion = next;
    try { localStorage.setItem(KEY, next); } catch { /* the choice just lasts for this visit */ }
    render();
  });
  render();
}
