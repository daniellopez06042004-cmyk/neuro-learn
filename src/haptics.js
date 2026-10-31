// Phone vibration. Android browsers support navigator.vibrate(). iPhone
// Safari doesn't, but toggling a native switch control (iOS 18+) plays a
// system haptic tick, so on iPhone we tap a hidden switch instead. iOS only
// allows this right after you touch the screen, which is when we use it.

let label = null;

function iosTick() {
  if (!label) {
    const id = 'haptic-switch';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    label = document.createElement('label');
    label.htmlFor = id;
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-10px;top:0';
    label.append(input);
    document.body.append(label);
  }
  label.click();
}

// pattern: vibrate-style list, e.g. [12] or [30, 40, 30, 40, 60]
export function haptic(pattern = [12]) {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
    return;
  }
  let t = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(iosTick, t);
    t += ms;
  });
}

export const light = () => haptic([12]);
export const fire = () => haptic([40, 50, 40, 50, 80]);
