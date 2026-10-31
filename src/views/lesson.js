import { content, playable, unitStats, lessonTrack } from '../content.js';
import { progress } from '../progress.js';
import { runSession, finishScreen } from '../player.js';
import { go } from '../router.js';

export function renderLesson(root, { id }) {
  if (!playable(id)) return go('/', { replace: true });
  const lesson = content.lessons.get(id).data;
  const { unit, track } = lessonTrack(id);
  const wasUnitComplete = unitStats(unit).complete;
  const xp = lesson.xp ?? 10;
  const replay = progress.isComplete(id);

  runSession(root, {
    mode: 'lesson',
    items: lesson.steps.map((step) => ({ key: `${id}:${step.id}`, step, color: track.color })),
    onExit: () => go(`/unit/${encodeURIComponent(unit.id)}`),
    onDone: ({ graded, correct }) => {
      progress.completeLesson(id, xp);
      const unitJustDone = !wasUnitComplete && unitStats(unit).complete;
      finishScreen(root, {
        color: track.color,
        highlightUnit: unit.id,
        newLesson: replay ? null : id,
        title: unitJustDone ? `${unit.title} complete` : 'Lesson complete',
        stats: [
          ['XP', `+${replay ? Math.ceil(xp / 2) : xp}`],
          ['First try', graded ? `${Math.round((correct / graded) * 100)}%` : '—'],
          ['Day streak', progress.streak()],
        ],
        button: 'Continue',
        onContinue: () => go(unitJustDone ? `/?fired=${encodeURIComponent(unit.id)}` : `/unit/${encodeURIComponent(unit.id)}?fired=${encodeURIComponent(id)}`),
      });
    },
  });
}
