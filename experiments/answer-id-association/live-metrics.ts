import {
  associateQuestionsByText,
  buildTextEvaluationMap,
} from '../../lib/evaluation/baseline-text-association';
import { associateQuestionsByAnswerId } from '../../lib/evaluation/id-association';
import {
  AnswerRecord,
  IdAssociationValidationError,
  ModelQuestionEvaluation,
  ModelQuestionEvaluationWithId,
} from '../../lib/evaluation/types';

export interface LiveRunMetrics {
  run_index: number;
  condition: 'baseline_text' | 'revised_answer_id';
  api_success: boolean;
  api_error?: string;
  model_question_count: number;
  expected_question_count: number;
  text_join_failures: number;
  silent_zero_score_fallbacks: number;
  wording_changes_in_model_output: number;
  exact_question_text_matches_in_model_output: number;
  scores_preserved_through_association: number;
  scores_lost_through_association: number;
  rejected: boolean;
  rejection_error?: IdAssociationValidationError;
  duplicate_model_answer_ids: number;
  missing_answer_ids: number;
  unknown_answer_ids: number;
  order_preserved: boolean;
}

function countWordingChanges(
  answers: AnswerRecord[],
  modelRows: Array<{ question_text: string; answer_id?: string }>,
  matchBy: 'text' | 'id',
): { wordingChanges: number; exactMatches: number } {
  let wordingChanges = 0;
  let exactMatches = 0;

  for (const answer of answers) {
    const row =
      matchBy === 'id'
        ? modelRows.find((modelRow) => modelRow.answer_id === answer.answer_id)
        : modelRows.find((modelRow) => modelRow.question_text === answer.question);

    if (!row) {
      continue;
    }

    if (row.question_text === answer.question) {
      exactMatches += 1;
    } else {
      wordingChanges += 1;
    }
  }

  return { wordingChanges, exactMatches };
}

function countScorePreservation(
  answers: AnswerRecord[],
  modelRows: ModelQuestionEvaluation[] | ModelQuestionEvaluationWithId[],
  associatedScores: number[],
  matchBy: 'text' | 'id',
): { preserved: number; lost: number } {
  let preserved = 0;
  let lost = 0;

  answers.forEach((answer, index) => {
    const modelRow =
      matchBy === 'id'
        ? (modelRows as ModelQuestionEvaluationWithId[]).find(
            (row) => row.answer_id === answer.answer_id,
          )
        : (modelRows as ModelQuestionEvaluation[]).find(
            (row) => row.question_text === answer.question,
          );

    if (!modelRow) {
      lost += 1;
      return;
    }

    if (associatedScores[index] === modelRow.score) {
      preserved += 1;
    } else {
      lost += 1;
    }
  });

  return { preserved, lost };
}

export function analyzeBaselineLiveRun(
  runIndex: number,
  answers: AnswerRecord[],
  modelEvaluations: ModelQuestionEvaluation[] | null,
  apiError?: string,
): LiveRunMetrics {
  if (!modelEvaluations) {
    return {
      run_index: runIndex,
      condition: 'baseline_text',
      api_success: false,
      api_error: apiError,
      model_question_count: 0,
      expected_question_count: answers.length,
      text_join_failures: 0,
      silent_zero_score_fallbacks: 0,
      wording_changes_in_model_output: 0,
      exact_question_text_matches_in_model_output: 0,
      scores_preserved_through_association: 0,
      scores_lost_through_association: 0,
      rejected: false,
      duplicate_model_answer_ids: 0,
      missing_answer_ids: 0,
      unknown_answer_ids: 0,
      order_preserved: false,
    };
  }

  const evaluationMap = buildTextEvaluationMap(modelEvaluations);
  const results = associateQuestionsByText(answers, evaluationMap);
  const wording = countWordingChanges(answers, modelEvaluations, 'text');
  const scoreStats = countScorePreservation(answers, modelEvaluations, results.map((r) => r.score), 'text');

  let textJoinFailures = 0;
  let silentZeroFallbacks = 0;

  answers.forEach((answer, index) => {
    const matched = evaluationMap[answer.question];
    if (!matched) {
      textJoinFailures += 1;
    }
    if (results[index].score === 0 && results[index].feedback === 'N/A') {
      silentZeroFallbacks += 1;
    }
  });

  return {
    run_index: runIndex,
    condition: 'baseline_text',
    api_success: true,
    model_question_count: modelEvaluations.length,
    expected_question_count: answers.length,
    text_join_failures: textJoinFailures,
    silent_zero_score_fallbacks: silentZeroFallbacks,
    wording_changes_in_model_output: wording.wordingChanges,
    exact_question_text_matches_in_model_output: wording.exactMatches,
    scores_preserved_through_association: scoreStats.preserved,
    scores_lost_through_association: scoreStats.lost,
    rejected: false,
    duplicate_model_answer_ids: 0,
    missing_answer_ids: 0,
    unknown_answer_ids: 0,
    order_preserved: results.every(
      (result, index) =>
        result.question_text === answers[index].question &&
        result.user_answer === answers[index].answer,
    ),
  };
}

export function analyzeRevisedLiveRun(
  runIndex: number,
  answers: AnswerRecord[],
  modelEvaluations: ModelQuestionEvaluationWithId[] | null,
  apiError?: string,
): LiveRunMetrics {
  if (!modelEvaluations) {
    return {
      run_index: runIndex,
      condition: 'revised_answer_id',
      api_success: false,
      api_error: apiError,
      model_question_count: 0,
      expected_question_count: answers.length,
      text_join_failures: 0,
      silent_zero_score_fallbacks: 0,
      wording_changes_in_model_output: 0,
      exact_question_text_matches_in_model_output: 0,
      scores_preserved_through_association: 0,
      scores_lost_through_association: 0,
      rejected: false,
      duplicate_model_answer_ids: 0,
      missing_answer_ids: 0,
      unknown_answer_ids: 0,
      order_preserved: false,
    };
  }

  const associationResult = associateQuestionsByAnswerId(answers, modelEvaluations);

  if (!associationResult.ok) {
    const error = associationResult.error;
    return {
      run_index: runIndex,
      condition: 'revised_answer_id',
      api_success: true,
      model_question_count: modelEvaluations.length,
      expected_question_count: answers.length,
      text_join_failures: 0,
      silent_zero_score_fallbacks: 0,
      wording_changes_in_model_output: 0,
      exact_question_text_matches_in_model_output: 0,
      scores_preserved_through_association: 0,
      scores_lost_through_association: answers.length,
      rejected: true,
      rejection_error: error,
      duplicate_model_answer_ids: error.code === 'DUPLICATE_MODEL_ANSWER_ID' ? 1 : 0,
      missing_answer_ids: error.code === 'MISSING_ANSWER_ID' ? error.missing_ids.length : 0,
      unknown_answer_ids: error.code === 'UNKNOWN_ANSWER_ID' ? error.unknown_ids.length : 0,
      order_preserved: false,
    };
  }

  const results = associationResult.questions;
  const wording = countWordingChanges(answers, modelEvaluations, 'id');
  const scoreStats = countScorePreservation(
    answers,
    modelEvaluations,
    results.map((result) => result.score),
    'id',
  );

  return {
    run_index: runIndex,
    condition: 'revised_answer_id',
    api_success: true,
    model_question_count: modelEvaluations.length,
    expected_question_count: answers.length,
    text_join_failures: 0,
    silent_zero_score_fallbacks: 0,
    wording_changes_in_model_output: wording.wordingChanges,
    exact_question_text_matches_in_model_output: wording.exactMatches,
    scores_preserved_through_association: scoreStats.preserved,
    scores_lost_through_association: scoreStats.lost,
    rejected: false,
    duplicate_model_answer_ids: 0,
    missing_answer_ids: 0,
    unknown_answer_ids: 0,
    order_preserved: results.every(
      (result, index) =>
        result.question_text === answers[index].question &&
        result.user_answer === answers[index].answer,
    ),
  };
}

export interface LiveSummaryRow {
  condition: 'baseline_text' | 'revised_answer_id';
  runs_requested: number;
  runs_api_success: number;
  runs_api_failed: number;
  runs_rejected: number;
  total_text_join_failures: number;
  total_silent_zero_score_fallbacks: number;
  total_wording_changes: number;
  total_exact_question_text_matches: number;
  total_scores_preserved: number;
  total_scores_lost: number;
  total_missing_answer_ids: number;
  total_unknown_answer_ids: number;
  total_duplicate_model_answer_ids: number;
}

export function summarizeLiveRuns(runs: LiveRunMetrics[]): LiveSummaryRow[] {
  const conditions: Array<'baseline_text' | 'revised_answer_id'> = [
    'baseline_text',
    'revised_answer_id',
  ];

  return conditions.map((condition) => {
    const subset = runs.filter((run) => run.condition === condition);
    return {
      condition,
      runs_requested: subset.length,
      runs_api_success: subset.filter((run) => run.api_success).length,
      runs_api_failed: subset.filter((run) => !run.api_success).length,
      runs_rejected: subset.filter((run) => run.rejected).length,
      total_text_join_failures: subset.reduce((sum, run) => sum + run.text_join_failures, 0),
      total_silent_zero_score_fallbacks: subset.reduce(
        (sum, run) => sum + run.silent_zero_score_fallbacks,
        0,
      ),
      total_wording_changes: subset.reduce(
        (sum, run) => sum + run.wording_changes_in_model_output,
        0,
      ),
      total_exact_question_text_matches: subset.reduce(
        (sum, run) => sum + run.exact_question_text_matches_in_model_output,
        0,
      ),
      total_scores_preserved: subset.reduce(
        (sum, run) => sum + run.scores_preserved_through_association,
        0,
      ),
      total_scores_lost: subset.reduce((sum, run) => sum + run.scores_lost_through_association, 0),
      total_missing_answer_ids: subset.reduce((sum, run) => sum + run.missing_answer_ids, 0),
      total_unknown_answer_ids: subset.reduce((sum, run) => sum + run.unknown_answer_ids, 0),
      total_duplicate_model_answer_ids: subset.reduce(
        (sum, run) => sum + run.duplicate_model_answer_ids,
        0,
      ),
    };
  });
}
