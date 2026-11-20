import { settings } from './data';

let iosSwitch: HTMLLabelElement | null = null;

/** Petite vibration. Android : API Vibration. iPhone (Safari 18+) : on bascule un
 *  interrupteur caché, ce qui déclenche le retour haptique natif (une impulsion). */
export function buzz(pattern: number | number[]) {
  if (!settings.vibration) return;
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(pattern); return; }
  } catch { /* refusé */ }
  try {
    if (!iosSwitch) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.setAttribute('switch', '');
      label.appendChild(input);
      label.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
      label.setAttribute('aria-hidden', 'true');
      document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
  } catch { /* pas de retour haptique disponible */ }
}
