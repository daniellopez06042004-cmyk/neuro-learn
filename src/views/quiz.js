import { h, icon } from '../ui.js';
import { content, quizColor } from '../content.js';
import { progress } from '../progress.js';
import { runSession, finishScreen } from '../player.js';
import { go } from '../router.js';
import { weeklyQuiz, finishQuiz, quizTracks } from '../quiz.js';

// This week's quiz: one try per question (no re-asks), misses go to review.
export function renderQuiz(root) {
  const quiz = weeklyQuiz();
  if (!quiz || quiz.locked || !quiz.questions.length) return go('/', { replace: true });
  const xp = content.quiz.xp;
  const items = quiz.questions.map((q) => ({ key: `quiz:${q.id}`, step: q, color: quizColor(q) }));
  items.unshift({
    key: 'quiz:__intro', color: items[0].color,
    step: {
      type: 'intro', id: '__intro', title: 'Weekly quiz', stepCount: quiz.questions.length, countWord: 'questions', objectiveLabel: 'How it works', minutes: Math.ceil(quiz.questions.length * 1.5),
      objective: "Put together what you've learned across tracks. One try per question; any you miss go into your review.",
    },
  });

  runSession(root, {
    mode: 'quiz',
    items,
    onExit: () => go('/'),
    onDone: ({ graded, correct }) => {
      const first = finishQuiz(quiz.week, correct, graded);
      if (first) progress.addBonusXp(xp);
      progress.bumpStreak();
      const perfect = graded > 0 && correct === graded;
      finishScreen(root, {
        color: items[1].color,
        title: perfect ? 'Perfect run' : 'Weekly quiz done',
        top: perfect ? h('div', { class: 'perfect', role: 'img', 'aria-label': 'Every answer right the first time' },
          h('span', { class: 'perfect-ring', 'aria-hidden': 'true' }), h('span', { class: 'perfect-ring r2', 'aria-hidden': 'true' }), icon('star')) : null,
        stats: [
          ['XP', first ? `+${xp}` : '+0'],
          ['Correct', `${correct}/${graded}`],
          ['Day streak', progress.streak()],
        ],
        button: 'Back to map',
        onContinue: () => go('/'),
      });
      if (!perfect && graded > correct) {
        root.querySelector('.stats')?.after(h('p', { class: 'small muted', style: 'text-align:center;margin:8px 0 0' },
          `The ${graded - correct === 1 ? 'one you missed is' : `${graded - correct} you missed are`} in your review now.`));
      }
    },
  });
}

// Home-screen card: start this week's quiz, see how it went, or how close it is.
export function quizCard() {
  const quiz = weeklyQuiz();
  if (!quiz) return null;
  if (quiz.locked) {
    return h('div', { class: 'quiz-line', title: 'Hard questions that connect the tracks. Each opens once you finish the units it draws on.' },
      icon('lock'), h('span', null, h('b', null, 'Weekly quiz'), ` · ${quiz.ready} of ${quiz.needed} questions ready`));
  }
  const n = quiz.questions.length;
  if (quiz.done) {
    return h('div', { class: 'quiz-card done' },
      icon(quiz.correct === quiz.graded ? 'star' : 'check'),
      h('div', null,
        h('p', { class: 'quiz-title' }, `Weekly quiz: ${quiz.correct}/${quiz.graded}`),
        h('p', { class: 'small muted' }, 'A new one opens on Monday.')));
  }
  return h('a', { class: 'quiz-card ready', href: '#/quiz' },
    icon('star'),
    h('div', null,
      h('p', { class: 'quiz-title' }, 'Weekly quiz'),
      h('p', { class: 'small muted' }, `${n} new question${n === 1 ? '' : 's'} that connect ${quizTracksText(quiz.questions)} · ${content.quiz.xp} xp`)),
    h('span', { class: 'quiz-go', 'aria-hidden': 'true' }, 'Start'));
}

const quizTracksText = (qs) => { const t = quizTracks(qs); return t ? `tracks ${t}` : 'the tracks'; };
