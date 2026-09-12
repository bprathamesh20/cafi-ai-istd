import { AnswerRecord } from '../../lib/evaluation/types';

export const EXPERIMENT_SEED = 20250910;
export const BATCH_SIZE = 20;

function buildSyntheticAnswers(count: number): AnswerRecord[] {
  const answers: AnswerRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const questionNumber = index + 1;
    answers.push({
      answer_id: `507f1f77bcf86cd7994390${(10 + index).toString(16).padStart(2, '0')}`,
      question_number: questionNumber,
      question: `Explain concept ${questionNumber} in distributed systems.`,
      answer: `Candidate response for question ${questionNumber} covering trade-offs and examples.`,
    });
  }

  return answers;
}

export const syntheticAnswers = buildSyntheticAnswers(BATCH_SIZE);

export const groundTruthScoreByAnswerId: Record<string, number> = Object.fromEntries(
  syntheticAnswers.map((answer, index) => [answer.answer_id, 5 + ((index * 7) % 96)]),
);

export function buildModelEvaluations(
  answers: AnswerRecord[],
  scoreByAnswerId: Record<string, number>,
  transformQuestionText?: (text: string, index: number) => string,
  order?: number[],
) {
  const indices = order ?? answers.map((_, index) => index);

  return indices.map((answerIndex) => {
    const answer = answers[answerIndex];
    const questionText = transformQuestionText
      ? transformQuestionText(answer.question, answerIndex)
      : answer.question;

    return {
      answer_id: answer.answer_id,
      question_text: questionText,
      user_answer: answer.answer,
      score: scoreByAnswerId[answer.answer_id],
      feedback: `Feedback for ${answer.answer_id}`,
    };
  });
}

export function buildBaselineModelEvaluations(
  answers: AnswerRecord[],
  scoreByAnswerId: Record<string, number>,
  transformQuestionText?: (text: string, index: number) => string,
  order?: number[],
) {
  const indices = order ?? answers.map((_, index) => index);

  return indices.map((answerIndex) => {
    const answer = answers[answerIndex];
    const questionText = transformQuestionText
      ? transformQuestionText(answer.question, answerIndex)
      : answer.question;

    return {
      question_text: questionText,
      user_answer: answer.answer,
      score: scoreByAnswerId[answer.answer_id],
      feedback: `Feedback for ${answer.answer_id}`,
    };
  });
}

export const reorderSeed = [19, 3, 7, 0, 11, 15, 2, 8, 13, 1, 17, 5, 9, 14, 4, 18, 6, 12, 16, 10];
