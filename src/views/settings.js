import { h, icon } from '../ui.js';
import { content } from '../content.js';
import { progress, settings, today } from '../progress.js';
import { go } from '../router.js';
import { badgeSupported, setBadgeEnabled } from '../badge.js';
import { setSoundEnabled } from '../sound.js';

export function renderSettings(root) {
  const unlock = h('input', {
    type: 'checkbox', role: 'switch', id: 'unlock-all',
    onchange: (e) => settings.set('unlockAll', e.target.checked),
  });
  unlock.checked = !!settings.get('unlockAll');

  const lessons = [...content.lessons.values()];
  const ready = lessons.filter((l) => l.status === 'ok').length;
  const broken = lessons.filter((l) => l.status === 'broken').length;

  root.replaceChildren(h('div', { class: 'screen' },
    h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back to map', onclick: () => go('/') }, icon('back')),
      h('h1', null, 'Settings')),
    h('div', { class: 'stack' },
      h('div', { class: 'card' },
        h('div', { class: 'toggle-row' },
          h('label', { for: 'unlock-all' }, h('strong', null, 'Unlock everything'), h('br'),
            h('span', { class: 'small muted' }, 'Skip prereqs and open every unit and lesson.')),
          h('span', { class: 'switch' }, unlock))),
      h('div', { class: 'card' },
        toggle('apOnly', 'Action potential only', 'Use the membrane-potential trace in every lesson instead of rotating lab scenes.', (on) => settings.set('apOnly', on)),
        h('hr', { class: 'card-rule' }),
        toggle('sound', 'Sound effects', 'A tick for each EPSP, chimes for answers, and a pop when the neuron fires.', (on) => setSoundEnabled(on)),
        h('hr', { class: 'card-rule' }),
        toggle('iconBadge', 'Reviews due on app icon', badgeSupported()
          ? 'Shows how many review questions are due on the Home Screen icon. iPhone asks to allow notifications for this; none are ever sent.'
          : 'Shows how many review questions are due on the Home Screen icon. Open the app from your Home Screen to turn this on.',
        async (on, input, note) => {
          const r = await setBadgeEnabled(on);
          input.checked = r.on;
          note.textContent = r.message || '';
        })),
      h('div', { class: 'card small' },
        h('p', { style: 'margin:0' }, `${ready} lessons ready · ${lessons.length - ready - broken} not written yet${broken ? ` · ${broken} with errors` : ''}`),
        content.errors.length ? h('a', { href: '#/errors' }, `See ${content.errors.length} content problems`) : null),
      backupCard(),
      h('div', { class: 'card' },
        h('p', { style: 'margin:0 0 12px' }, h('strong', null, 'Reset progress'), h('br'),
          h('span', { class: 'small muted' }, 'Clears XP, streak, finished lessons and review boxes on this device. Lessons stay.')),
        h('button', {
          class: 'btn secondary',
          onclick: () => { if (confirm('Reset all progress on this device? This can’t be undone.')) { progress.reset(); go('/'); } },
        }, 'Reset progress')))));
}

// Progress only lives on this device, so let you save it to Files/iCloud
// and restore it later (or on another phone).
function backupCard() {
  const status = h('p', { class: 'small muted', role: 'status', style: 'margin:10px 0 0' });
  const last = settings.get('lastBackup');
  status.textContent = last ? `Last backup: ${last}` : 'No backup yet.';

  const save = async () => {
    const name = `neuro-learn-backup-${today()}.json`;
    const blob = new Blob([JSON.stringify(progress.exportData(), null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Neuro Learn backup' }); // iPhone: "Save to Files"
      } else {
        const a = h('a', { href: URL.createObjectURL(blob), download: name });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      settings.set('lastBackup', today());
      status.textContent = `Backup saved (${name}).`;
    } catch (e) {
      if (e.name !== 'AbortError') status.textContent = "Couldn't save the backup. Try again.";
    }
  };

  const picker = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    picker.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const summary = progress.describeBackup(data);
      if (!confirm(`Restore this backup?\n\n${summary}\n\nIt replaces the progress on this device.`)) return;
      progress.importData(data);
      location.reload();
    } catch (e) {
      status.textContent = e instanceof SyntaxError ? "That file isn't a Neuro Learn backup." : e.message;
    }
  });

  return h('div', { class: 'card' },
    h('p', { style: 'margin:0 0 12px' }, h('strong', null, 'Back up progress'), h('br'),
      h('span', { class: 'small muted' }, 'Your XP, streak, finished lessons and review boxes are stored only on this phone. Save a backup to Files or iCloud now and then, and restore it if you reinstall the app or switch phones.')),
    h('div', { class: 'row-btns' },
      h('button', { class: 'btn', onclick: save }, 'Save backup'),
      h('button', { class: 'btn secondary', onclick: () => picker.click() }, 'Restore')),
    picker, status);
}

function toggle(key, title, help, onChange) {
  const id = `set-${key}`;
  const note = h('p', { class: 'small', style: 'margin:6px 0 0;color:var(--bad)', role: 'status' });
  const input = h('input', { type: 'checkbox', role: 'switch', id });
  input.checked = Boolean(settings.get(key));
  input.addEventListener('change', () => onChange(input.checked, input, note));
  return h('div', null,
    h('div', { class: 'toggle-row' },
      h('label', { for: id }, h('strong', null, title), h('br'), h('span', { class: 'small muted' }, help)),
      h('span', { class: 'switch' }, input)),
    note);
}
