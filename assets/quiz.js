/**
 * Reusable quiz widget for lessons.
 * Usage: data-quiz on .quiz container; data-correct on the right button;
 * data-messages as JSON on the container for true/false feedback strings.
 */
function initQuizzes() {
  document.querySelectorAll('.quiz[data-messages]').forEach(quiz => {
    const messages = JSON.parse(quiz.dataset.messages);
    const quizId = quiz.id;

    quiz.querySelectorAll('.quiz-options button').forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.dataset.correct === 'true';
        const feedback = document.getElementById(quizId + '-feedback');

        quiz.querySelectorAll('.quiz-options button').forEach(b => {
          b.disabled = true;
          if (b === btn) {
            b.classList.add(isCorrect ? 'correct' : 'wrong');
          } else if (b.dataset.correct === 'true') {
            b.classList.add('correct');
          }
        });

        feedback.textContent = isCorrect ? messages.true : messages.false;
        feedback.style.color = isCorrect ? 'var(--correct)' : 'var(--wrong)';
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initQuizzes);
