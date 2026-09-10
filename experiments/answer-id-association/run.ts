import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  BATCH_SIZE,
  buildBaselineModelEvaluations,
  buildModelEvaluations,
  groundTruthScoreByAnswerId,
  reorderSeed,
  syntheticAnswers,
} from './fixtures';
import {
  AssociationMetrics,
  runBaselineCase,
  runRevisedCase,
  runSemanticNegativeControl,
  SemanticNegativeControlMetrics,
} from './metrics';

const OUTPUT_DIR = path.join(__dirname, 'output');

interface ExperimentCase {
  case_id: string;
  description: string;
  answers: typeof syntheticAnswers;
  ground_truth: Record<string, number>;
  baseline_model_evaluations: ReturnType<typeof buildBaselineModelEvaluations>;
  revised_model_evaluations: ReturnType<typeof buildModelEvaluations>;
}

function buildExperimentCases(): ExperimentCase[] {
  const groundTruth = groundTruthScoreByAnswerId;

  return [
    {
      case_id: 'A1_unchanged_text',
      description: 'Model returns unchanged question text; both implementations should associate correctly.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(syntheticAnswers, groundTruth),
      revised_model_evaluations: buildModelEvaluations(syntheticAnswers, groundTruth),
    },
    {
      case_id: 'A2_reworded_text',
      description: 'Model paraphrases question text and alters punctuation; revised uses answer_id.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(
        syntheticAnswers,
        groundTruth,
        (text) => text.replace(/\.$/, '').replace('Explain', 'Describe'),
      ),
      revised_model_evaluations: buildModelEvaluations(
        syntheticAnswers,
        groundTruth,
        (text) => text.replace(/\.$/, '').replace('Explain', 'Describe'),
      ),
    },
    {
      case_id: 'A3_reordered_assessments',
      description: 'Model assessment array reordered (seed recorded); order in persisted results should follow answers.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(
        syntheticAnswers,
        groundTruth,
        undefined,
        reorderSeed,
      ),
      revised_model_evaluations: buildModelEvaluations(
        syntheticAnswers,
        groundTruth,
        undefined,
        reorderSeed,
      ),
    },
    {
      case_id: 'A4_duplicate_ids',
      description: 'Duplicate answer_id in model output; revised must reject explicitly.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(syntheticAnswers, groundTruth),
      revised_model_evaluations: (() => {
        const evaluations = buildModelEvaluations(syntheticAnswers, groundTruth);
        evaluations[1] = { ...evaluations[1], answer_id: evaluations[0].answer_id };
        return evaluations;
      })(),
    },
    {
      case_id: 'A5_missing_ids',
      description: 'Model omits one answer_id; revised must reject incomplete assessments.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(syntheticAnswers, groundTruth).slice(1),
      revised_model_evaluations: buildModelEvaluations(syntheticAnswers, groundTruth).slice(1),
    },
    {
      case_id: 'A6_unknown_ids',
      description: 'Model includes an extra unknown answer_id while batch size remains fixed at 20.',
      answers: syntheticAnswers,
      ground_truth: groundTruth,
      baseline_model_evaluations: buildBaselineModelEvaluations(syntheticAnswers, groundTruth),
      revised_model_evaluations: (() => {
        const evaluations = buildModelEvaluations(syntheticAnswers, groundTruth);
        evaluations.push({
          ...evaluations[0],
          answer_id: '507f1f77bcf86cd799439999',
          score: 42,
          feedback: 'Unknown ID fixture row',
        });
        return evaluations;
      })(),
    },
  ];
}

function buildExperimentB(): {
  case_id: string;
  description: string;
  answers: typeof syntheticAnswers;
  ground_truth: Record<string, number>;
  baseline_metrics: AssociationMetrics;
  revised_metrics: AssociationMetrics;
} {
  const sharedQuestion = 'What is the CAP theorem?';
  const answers = [
    {
      answer_id: '507f1f77bcf86cd79943b001',
      question_number: 1,
      question: sharedQuestion,
      answer: 'Consistency, Availability, Partition tolerance — favors CP under partitions.',
    },
    {
      answer_id: '507f1f77bcf86cd79943b002',
      question_number: 2,
      question: sharedQuestion,
      answer: 'You can only pick two of consistency, availability, and partition tolerance.',
    },
  ];

  const groundTruth = {
    [answers[0].answer_id]: 35,
    [answers[1].answer_id]: 85,
  };

  const baselineModelEvaluations = [
    {
      question_text: sharedQuestion,
      user_answer: answers[0].answer,
      score: 35,
      feedback: 'First evaluation',
    },
    {
      question_text: sharedQuestion,
      user_answer: answers[1].answer,
      score: 85,
      feedback: 'Second evaluation (overwrites map key)',
    },
  ];

  const revisedModelEvaluations = buildModelEvaluations(answers, groundTruth);

  return {
    case_id: 'B_identical_questions_different_answers',
    description:
      'Two answers share question text but have distinct answer IDs/scores; baseline map overwrite vs revised ID join.',
    answers,
    ground_truth: groundTruth,
    baseline_metrics: runBaselineCase('B_identical_questions_different_answers', answers, baselineModelEvaluations, groundTruth),
    revised_metrics: runRevisedCase('B_identical_questions_different_answers', answers, revisedModelEvaluations, groundTruth),
  };
}

function toCsvRow(values: Array<string | number | boolean>): string {
  return values
    .map((value) => {
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
    .join(',');
}

function writeCsv(metrics: AssociationMetrics[], semantic: SemanticNegativeControlMetrics, experimentB: ReturnType<typeof buildExperimentB>) {
  const header = [
    'experiment',
    'implementation',
    'case_id',
    'expected_count',
    'returned_count',
    'rejected',
    'rejection_code',
    'correct_associations',
    'wrong_associations',
    'missing_fallback_to_zero',
    'missing_fallback_to_na_feedback',
    'silent_zero_score_fallbacks',
    'wrong_non_default_scores',
    'order_preserved',
  ];

  const rows = metrics.map((metric) =>
    toCsvRow([
      'A',
      metric.implementation,
      metric.case_id,
      metric.expected_count,
      metric.returned_count,
      metric.rejected,
      metric.rejection_error?.code ?? '',
      metric.correct_associations,
      metric.wrong_associations,
      metric.missing_fallback_to_zero,
      metric.missing_fallback_to_na_feedback,
      metric.silent_zero_score_fallbacks,
      metric.wrong_non_default_scores,
      metric.order_preserved,
    ]),
  );

  rows.push(
    toCsvRow([
      'B',
      experimentB.baseline_metrics.implementation,
      experimentB.baseline_metrics.case_id,
      experimentB.baseline_metrics.expected_count,
      experimentB.baseline_metrics.returned_count,
      experimentB.baseline_metrics.rejected,
      experimentB.baseline_metrics.rejection_error?.code ?? '',
      experimentB.baseline_metrics.correct_associations,
      experimentB.baseline_metrics.wrong_associations,
      experimentB.baseline_metrics.missing_fallback_to_zero,
      experimentB.baseline_metrics.missing_fallback_to_na_feedback,
      experimentB.baseline_metrics.silent_zero_score_fallbacks,
      experimentB.baseline_metrics.wrong_non_default_scores,
      experimentB.baseline_metrics.order_preserved,
    ]),
  );

  rows.push(
    toCsvRow([
      'B',
      experimentB.revised_metrics.implementation,
      experimentB.revised_metrics.case_id,
      experimentB.revised_metrics.expected_count,
      experimentB.revised_metrics.returned_count,
      experimentB.revised_metrics.rejected,
      experimentB.revised_metrics.rejection_error?.code ?? '',
      experimentB.revised_metrics.correct_associations,
      experimentB.revised_metrics.wrong_associations,
      experimentB.revised_metrics.missing_fallback_to_zero,
      experimentB.revised_metrics.missing_fallback_to_na_feedback,
      experimentB.revised_metrics.silent_zero_score_fallbacks,
      experimentB.revised_metrics.wrong_non_default_scores,
      experimentB.revised_metrics.order_preserved,
    ]),
  );

  rows.push(
    toCsvRow([
      'C',
      'revised_answer_id',
      semantic.case_id,
      BATCH_SIZE,
      semantic.validator_accepted ? BATCH_SIZE : 0,
      !semantic.validator_accepted,
      '',
      '',
      '',
      '',
      '',
      '',
      semantic.semantic_mismatch_count,
      '',
    ]),
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, 'results.csv'), [header.join(','), ...rows].join('\n'));
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const metadata = {
    web_repo: 'https://github.com/bprathamesh20/cafi-ai-istd',
    baseline_commit: '941cf3a5e7c7c995a1d82699849c9b8b1aa78de9',
    upstream_head_at_run: '941cf3a5e7c7c995a1d82699849c9b8b1aa78de9',
    backend_repo: 'https://github.com/bprathamesh20/cafi-backend-istd',
    backend_baseline_commit: '2c697ab2f91546e2c8aafb3927182021e90a19de9',
    note: 'Retrospective extension; experiments are synthetic and not part of original student deployment.',
    experiment_seed: reorderSeed,
    batch_size: BATCH_SIZE,
    node_version: process.version,
    run_timestamp_utc: new Date().toISOString(),
    experiment_d_live_model: {
      ran: false,
      reason: 'No non-production Gemini credentials configured in this cloud workspace.',
    },
  };

  const cases = buildExperimentCases();
  const allMetrics: AssociationMetrics[] = [];

  for (const experimentCase of cases) {
    allMetrics.push(
      runBaselineCase(
        experimentCase.case_id,
        experimentCase.answers,
        experimentCase.baseline_model_evaluations,
        experimentCase.ground_truth,
      ),
    );
    allMetrics.push(
      runRevisedCase(
        experimentCase.case_id,
        experimentCase.answers,
        experimentCase.revised_model_evaluations,
        experimentCase.ground_truth,
      ),
    );
  }

  const experimentB = buildExperimentB();
  allMetrics.push(experimentB.baseline_metrics, experimentB.revised_metrics);

  const semanticNegativeControl = runSemanticNegativeControl(syntheticAnswers, groundTruthScoreByAnswerId);

  const payload = {
    metadata,
    experiment_a_cases: cases.map((experimentCase) => ({
      case_id: experimentCase.case_id,
      description: experimentCase.description,
      baseline: allMetrics.find(
        (metric) =>
          metric.case_id === experimentCase.case_id && metric.implementation === 'baseline_text',
      ),
      revised: allMetrics.find(
        (metric) =>
          metric.case_id === experimentCase.case_id && metric.implementation === 'revised_answer_id',
      ),
    })),
    experiment_b: experimentB,
    experiment_c: semanticNegativeControl,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(payload, null, 2));
  writeCsv(allMetrics, semanticNegativeControl, experimentB);

  let failures = 0;

  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`FAIL: ${message}`);
      failures += 1;
    } else {
      console.log(`PASS: ${message}`);
    }
  };

  const a1Baseline = payload.experiment_a_cases[0].baseline!;
  const a1Revised = payload.experiment_a_cases[0].revised!;
  assert(a1Baseline.correct_associations === BATCH_SIZE, 'A1 baseline associates all scores');
  assert(a1Revised.correct_associations === BATCH_SIZE, 'A1 revised associates all scores');

  const a2Baseline = payload.experiment_a_cases[1].baseline!;
  const a2Revised = payload.experiment_a_cases[1].revised!;
  assert(a2Baseline.correct_associations === 0, 'A2 baseline fails under reworded text');
  assert(a2Revised.correct_associations === BATCH_SIZE, 'A2 revised preserves association under reworded text');

  const a3Baseline = payload.experiment_a_cases[2].baseline!;
  const a3Revised = payload.experiment_a_cases[2].revised!;
  assert(a3Baseline.correct_associations === BATCH_SIZE, 'A3 baseline also passes when texts still match');
  assert(a3Revised.order_preserved, 'A3 revised preserves answer order');

  const a4Revised = payload.experiment_a_cases[3].revised!;
  assert(a4Revised.rejected && a4Revised.rejection_error?.code === 'DUPLICATE_MODEL_ANSWER_ID', 'A4 revised rejects duplicate IDs');

  const a5Revised = payload.experiment_a_cases[4].revised!;
  assert(a5Revised.rejected && a5Revised.rejection_error?.code === 'MISSING_ANSWER_ID', 'A5 revised rejects missing IDs');

  const a6Revised = payload.experiment_a_cases[5].revised!;
  assert(a6Revised.rejected && a6Revised.rejection_error?.code === 'UNKNOWN_ANSWER_ID', 'A6 revised rejects unknown IDs');

  assert(
    experimentB.baseline_metrics.scores.every((score) => score === 85),
    'B baseline assigns last duplicate question_text score to both answers',
  );
  assert(
    experimentB.revised_metrics.scores.join(',') === '35,85',
    'B revised retains distinct scores for identical question text',
  );

  assert(semanticNegativeControl.validator_accepted, 'C validator accepts structurally valid but semantically wrong scores');
  assert(semanticNegativeControl.semantic_mismatch_count === BATCH_SIZE, 'C all fixture scores are semantically permuted');

  console.log(`\nWrote ${path.join(OUTPUT_DIR, 'results.json')}`);
  console.log(`Wrote ${path.join(OUTPUT_DIR, 'results.csv')}`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
