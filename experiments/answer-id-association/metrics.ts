import {
  associateQuestionsByText,
  buildTextEvaluationMap,
} from '../../lib/evaluation/baseline-text-association';
import { associateQuestionsByAnswerId } from '../../lib/evaluation/id-association';
import {
  AnswerRecord,
  AssociatedQuestionResult,
  IdAssociationValidationError,
  ModelQuestionEvaluation,
  ModelQuestionEvaluationWithId,
} from '../../lib/evaluation/types';

export interface AssociationMetrics {
  implementation: 'baseline_text' | 'revised_answer_id';
  case_id: string;
  expected_count: number;
  returned_count: number;
  rejected: boolean;
  rejection_error?: IdAssociationValidationError;
  correct_associations: number;
  wrong_associations: number;
  missing_fallback_to_zero: number;
  missing_fallback_to_na_feedback: number;
  silent_zero_score_fallbacks: number;
  wrong_non_default_scores: number;
  order_preserved: boolean;
  scores: number[];
  expected_scores: number[];
}

function countMissingFallbacks(
  results: AssociatedQuestionResult[],
  groundTruth: Record<string, number>,
  answers: AnswerRecord[],
): { zeroFallbacks: number; naFallbacks: number; silentZeroFallbacks: number } {
  let zeroFallbacks = 0;
  let naFallbacks = 0;
  let silentZeroFallbacks = 0;

  results.forEach((result, index) => {
    const answer = answers[index];
    const expectedScore = groundTruth[answer.answer_id];
    const hadMatch = result.score !== 0 || result.feedback !== 'N/A';

    if (result.score === 0 && expectedScore !== 0 && !hadMatch) {
      zeroFallbacks += 1;
    }

    if (result.feedback === 'N/A' && expectedScore !== undefined) {
      naFallbacks += 1;
    }

    if (result.score === 0 && expectedScore !== 0 && result.feedback === 'N/A') {
      silentZeroFallbacks += 1;
    }
  });

  return { zeroFallbacks, naFallbacks, silentZeroFallbacks };
}

function evaluateAssociationCorrectness(
  results: AssociatedQuestionResult[],
  answers: AnswerRecord[],
  groundTruth: Record<string, number>,
): { correct: number; wrong: number; wrongNonDefault: number } {
  let correct = 0;
  let wrong = 0;
  let wrongNonDefault = 0;

  results.forEach((result, index) => {
    const answer = answers[index];
    const expectedScore = groundTruth[answer.answer_id];

    if (result.score === expectedScore) {
      correct += 1;
    } else {
      wrong += 1;
      if (result.score !== 0) {
        wrongNonDefault += 1;
      }
    }
  });

  return { correct, wrong, wrongNonDefault };
}

function isOrderPreserved(
  results: AssociatedQuestionResult[],
  answers: AnswerRecord[],
): boolean {
  return results.every(
    (result, index) =>
      result.question_id === answers[index].question_number.toString() &&
      result.user_answer === answers[index].answer &&
      result.question_text === answers[index].question,
  );
}

export function runBaselineCase(
  caseId: string,
  answers: AnswerRecord[],
  modelEvaluations: ModelQuestionEvaluation[],
  groundTruth: Record<string, number>,
): AssociationMetrics {
  const evaluationMap = buildTextEvaluationMap(modelEvaluations);
  const results = associateQuestionsByText(answers, evaluationMap);
  const correctness = evaluateAssociationCorrectness(results, answers, groundTruth);
  const fallbacks = countMissingFallbacks(results, groundTruth, answers);

  return {
    implementation: 'baseline_text',
    case_id: caseId,
    expected_count: answers.length,
    returned_count: results.length,
    rejected: false,
    correct_associations: correctness.correct,
    wrong_associations: correctness.wrong,
    missing_fallback_to_zero: fallbacks.zeroFallbacks,
    missing_fallback_to_na_feedback: fallbacks.naFallbacks,
    silent_zero_score_fallbacks: fallbacks.silentZeroFallbacks,
    wrong_non_default_scores: correctness.wrongNonDefault,
    order_preserved: isOrderPreserved(results, answers),
    scores: results.map((result) => result.score),
    expected_scores: answers.map((answer) => groundTruth[answer.answer_id]),
  };
}

export function runRevisedCase(
  caseId: string,
  answers: AnswerRecord[],
  modelEvaluations: ModelQuestionEvaluationWithId[],
  groundTruth: Record<string, number>,
): AssociationMetrics {
  const associationResult = associateQuestionsByAnswerId(answers, modelEvaluations);

  if (!associationResult.ok) {
    return {
      implementation: 'revised_answer_id',
      case_id: caseId,
      expected_count: answers.length,
      returned_count: 0,
      rejected: true,
      rejection_error: associationResult.error,
      correct_associations: 0,
      wrong_associations: 0,
      missing_fallback_to_zero: 0,
      missing_fallback_to_na_feedback: 0,
      silent_zero_score_fallbacks: 0,
      wrong_non_default_scores: 0,
      order_preserved: false,
      scores: [],
      expected_scores: answers.map((answer) => groundTruth[answer.answer_id]),
    };
  }

  const results = associationResult.questions;
  const correctness = evaluateAssociationCorrectness(results, answers, groundTruth);
  const fallbacks = countMissingFallbacks(results, groundTruth, answers);

  return {
    implementation: 'revised_answer_id',
    case_id: caseId,
    expected_count: answers.length,
    returned_count: results.length,
    rejected: false,
    correct_associations: correctness.correct,
    wrong_associations: correctness.wrong,
    missing_fallback_to_zero: fallbacks.zeroFallbacks,
    missing_fallback_to_na_feedback: fallbacks.naFallbacks,
    silent_zero_score_fallbacks: fallbacks.silentZeroFallbacks,
    wrong_non_default_scores: correctness.wrongNonDefault,
    order_preserved: isOrderPreserved(results, answers),
    scores: results.map((result) => result.score),
    expected_scores: answers.map((answer) => groundTruth[answer.answer_id]),
  };
}

export interface SemanticNegativeControlMetrics {
  case_id: string;
  validator_accepted: boolean;
  shape_valid: boolean;
  semantic_mismatch_count: number;
  note: string;
}

export function runSemanticNegativeControl(
  answers: AnswerRecord[],
  groundTruth: Record<string, number>,
): SemanticNegativeControlMetrics {
  const shuffledScores = [...answers]
    .map((answer) => groundTruth[answer.answer_id])
    .reverse();

  const wrongScoreEvaluations = answers.map((answer, index) => ({
    answer_id: answer.answer_id,
    question_text: answer.question,
    user_answer: answer.answer,
    score: shuffledScores[index],
    feedback: 'Semantically mismatched fixture score',
  }));

  const associationResult = associateQuestionsByAnswerId(answers, wrongScoreEvaluations);
  const semanticMismatchCount = wrongScoreEvaluations.filter(
    (evaluation, index) => evaluation.score !== groundTruth[answers[index].answer_id],
  ).length;

  return {
    case_id: 'C_semantic_negative_control',
    validator_accepted: associationResult.ok,
    shape_valid: associationResult.ok,
    semantic_mismatch_count: semanticMismatchCount,
    note:
      'ID validator checks structural identity only; intentionally permuted scores pass validation.',
  };
}
