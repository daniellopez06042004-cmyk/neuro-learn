// Shows the number of review questions due on the home-screen icon, like an
// unread count. iPhone allows this only for apps added to the Home Screen,
// and only after you allow notifications (no notifications are ever sent).

import { progress, settings } from './progress.js';

export const badgeSupported = () => 'setAppBadge' in navigator;

export function updateBadge() {
  if (!badgeSupported() || !settings.get('iconBadge')) return;
  const due = progress.dueKeys().length;
  (due ? navigator.setAppBadge(due) : navigator.clearAppBadge()).catch(() => {});
}

// Turn the badge on or off. Must run from a tap (iOS asks for permission).
export async function setBadgeEnabled(on) {
  if (!on) {
    settings.set('iconBadge', false);
    navigator.clearAppBadge?.().catch(() => {});
    return { on: false };
  }
  if (!badgeSupported()) return { on: false, message: 'This browser can’t show a badge. On iPhone, open the app from your Home Screen first.' };
  let permission = 'granted';
  if ('Notification' in window && Notification.permission !== 'granted') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return { on: false, message: 'Allow notifications for Neuro Learn in iPhone Settings to show the badge. The app never sends notifications.' };
  settings.set('iconBadge', true);
  updateBadge();
  return { on: true };
}
