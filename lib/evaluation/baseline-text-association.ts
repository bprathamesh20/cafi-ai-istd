import {
  AnswerRecord,
  AssociatedQuestionResult,
  ModelQuestionEvaluation,
} from '@/lib/evaluation/types';

export function buildTextEvaluationMap(
  evaluations: ModelQuestionEvaluation[],
): Record<string, ModelQuestionEvaluation> {
  return evaluations.reduce(
    (map, evaluation) => {
      map[evaluation.question_text] = evaluation;
      return map;
    },
    {} as Record<string, ModelQuestionEvaluation>,
  );
}

export function associateQuestionsByText(
  answers: AnswerRecord[],
  evaluationMap: Record<string, ModelQuestionEvaluation>,
): AssociatedQuestionResult[] {
  return answers.map((answer) => {
    const questionEval = evaluationMap[answer.question];
    return {
      question_id: answer.question_number.toString(),
      question_text: answer.question,
      user_answer: answer.answer,
      score: questionEval?.score || 0,
      feedback: questionEval?.feedback || 'N/A',
    };
  });
}
