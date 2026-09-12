import {
  AnswerRecord,
  AssociatedQuestionResult,
  IdAssociationValidationError,
  ModelQuestionEvaluationWithId,
} from '@/lib/evaluation/types';

function validateExpectedAnswerIds(
  answers: AnswerRecord[],
):
  | { ok: true; expectedIds: string[] }
  | { ok: false; error: IdAssociationValidationError } {
  const seen = new Set<string>();

  for (const answer of answers) {
    if (!answer.answer_id || typeof answer.answer_id !== 'string') {
      return {
        ok: false,
        error: {
          code: 'MALFORMED_ANSWER_ID',
          answer_id: String(answer.answer_id),
        },
      };
    }

    if (seen.has(answer.answer_id)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_EXPECTED_ANSWER_ID',
          answer_id: answer.answer_id,
        },
      };
    }

    seen.add(answer.answer_id);
  }

  return { ok: true, expectedIds: answers.map((answer) => answer.answer_id) };
}

export function associateQuestionsByAnswerId(
  answers: AnswerRecord[],
  evaluations: ModelQuestionEvaluationWithId[],
):
  | { ok: true; questions: AssociatedQuestionResult[] }
  | { ok: false; error: IdAssociationValidationError } {
  const expectedCheck = validateExpectedAnswerIds(answers);
  if (!expectedCheck.ok) {
    return expectedCheck;
  }

  const expectedSet = new Set(expectedCheck.expectedIds);
  const modelMap = new Map<string, ModelQuestionEvaluationWithId>();

  for (const evaluation of evaluations) {
    if (!evaluation.answer_id || typeof evaluation.answer_id !== 'string') {
      return {
        ok: false,
        error: {
          code: 'MALFORMED_ANSWER_ID',
          answer_id: String(evaluation.answer_id),
        },
      };
    }

    if (modelMap.has(evaluation.answer_id)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_MODEL_ANSWER_ID',
          answer_id: evaluation.answer_id,
        },
      };
    }

    modelMap.set(evaluation.answer_id, evaluation);
  }

  const missingIds = expectedCheck.expectedIds.filter((id) => !modelMap.has(id));
  if (missingIds.length > 0) {
    return {
      ok: false,
      error: { code: 'MISSING_ANSWER_ID', missing_ids: missingIds },
    };
  }

  const unknownIds = Array.from(modelMap.keys()).filter((id) => !expectedSet.has(id));
  if (unknownIds.length > 0) {
    return {
      ok: false,
      error: { code: 'UNKNOWN_ANSWER_ID', unknown_ids: unknownIds },
    };
  }

  const questions = answers.map((answer) => {
    const questionEval = modelMap.get(answer.answer_id)!;
    return {
      question_id: answer.question_number.toString(),
      answer_id: answer.answer_id,
      question_text: answer.question,
      user_answer: answer.answer,
      score: questionEval.score ?? 0,
      feedback: questionEval.feedback ?? 'N/A',
    };
  });

  return { ok: true, questions };
}
