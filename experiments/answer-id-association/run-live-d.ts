import * as fs from 'node:fs';
import * as path from 'node:path';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

import {
  buildBaselineEvaluationPrompt,
  buildIdEvaluationPrompt,
} from '../../lib/evaluation/prompts';
import {
  baselineEvaluationSchema,
  idEvaluationSchema,
} from '../../lib/evaluation/schemas';
import { syntheticAnswers } from './fixtures';
import {
  analyzeBaselineLiveRun,
  analyzeRevisedLiveRun,
  LiveRunMetrics,
  summarizeLiveRuns,
} from './live-metrics';

const OUTPUT_DIR = path.join(__dirname, 'output');
const RUNS_PER_CONDITION = 10;
const REQUESTED_MODEL = 'gemini-3.6-flash';
const DEPLOYMENT_MODEL = 'gemini-2.5-pro-preview-05-06';
const PRIOR_PARTIAL_MODEL = 'gemini-2.5-flash';

const GENERATION_SETTINGS = {
  temperature: 0,
};
const INTER_CALL_DELAY_MS = 8000;
const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 30000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scrubSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_API_KEY]');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubSecrets(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, scrubSecrets(entry)]),
    );
  }

  return value;
}

function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limit') ||
    lower.includes('high demand') ||
    lower.includes('resource exhausted') ||
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('try again')
  );
}

function parseRetryDelayMs(message: string): number | null {
  const match = message.match(/retry in ([0-9.]+)s/i);
  if (!match) {
    return null;
  }
  return Math.ceil(Number(match[1]) * 1000);
}

async function generateObjectWithRetry<T extends z.ZodTypeAny>(params: {
  modelId: string;
  prompt: string;
  schema: T;
  label: string;
}): Promise<{ object: z.infer<T> }> {
  let lastError = 'Unknown error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await generateObject({
        model: google(params.modelId),
        prompt: params.prompt,
        schema: params.schema,
        ...GENERATION_SETTINGS,
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      const retryable = isRetryableError(lastError);
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw new Error(lastError);
      }

      const suggestedDelay = parseRetryDelayMs(lastError);
      const backoff = suggestedDelay ?? BASE_BACKOFF_MS * attempt;
      console.log(
        `${params.label}: attempt ${attempt}/${MAX_ATTEMPTS} failed; backing off ${Math.round(backoff / 1000)}s`,
      );
      await sleep(backoff);
    }
  }

  throw new Error(lastError);
}

async function runBaselineCall(modelId: string, runIndex: number) {
  const prompt = buildBaselineEvaluationPrompt(syntheticAnswers);

  try {
    const { object } = await generateObjectWithRetry({
      modelId,
      prompt,
      schema: baselineEvaluationSchema,
      label: `baseline run ${runIndex}`,
    });

    return {
      metrics: analyzeBaselineLiveRun(runIndex, syntheticAnswers, object.questions),
      raw: object,
      prompt,
      failure: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      metrics: analyzeBaselineLiveRun(runIndex, syntheticAnswers, null, message),
      raw: null,
      prompt,
      failure: message,
    };
  }
}

async function runRevisedCall(modelId: string, runIndex: number) {
  const prompt = buildIdEvaluationPrompt(syntheticAnswers);

  try {
    const { object } = await generateObjectWithRetry({
      modelId,
      prompt,
      schema: idEvaluationSchema,
      label: `revised run ${runIndex}`,
    });

    return {
      metrics: analyzeRevisedLiveRun(runIndex, syntheticAnswers, object.questions),
      raw: object,
      prompt,
      failure: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      metrics: analyzeRevisedLiveRun(runIndex, syntheticAnswers, null, message),
      raw: null,
      prompt,
      failure: message,
    };
  }
}

function toCsvSummary(summary: ReturnType<typeof summarizeLiveRuns>): string {
  const header = [
    'condition',
    'runs_requested',
    'runs_api_success',
    'runs_api_failed',
    'runs_rejected',
    'total_text_join_failures',
    'total_silent_zero_score_fallbacks',
    'total_wording_changes',
    'total_exact_question_text_matches',
    'total_scores_preserved',
    'total_scores_lost',
    'total_missing_answer_ids',
    'total_unknown_answer_ids',
    'total_duplicate_model_answer_ids',
  ];

  const rows = summary.map((row) =>
    [
      row.condition,
      row.runs_requested,
      row.runs_api_success,
      row.runs_api_failed,
      row.runs_rejected,
      row.total_text_join_failures,
      row.total_silent_zero_score_fallbacks,
      row.total_wording_changes,
      row.total_exact_question_text_matches,
      row.total_scores_preserved,
      row.total_scores_lost,
      row.total_missing_answer_ids,
      row.total_unknown_answer_ids,
      row.total_duplicate_model_answer_ids,
    ].join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

function loadPriorPartialSummary():
  | { model: string; baseline_api_success: number; revised_api_success: number; note: string }
  | null {
  const priorPath = path.join(OUTPUT_DIR, 'experiment_d_results.json');
  if (!fs.existsSync(priorPath)) {
    return null;
  }

  try {
    const prior = JSON.parse(fs.readFileSync(priorPath, 'utf8')) as {
      metadata?: { model_used?: string };
      summary?: Array<{ condition: string; runs_api_success: number }>;
    };

    if (prior.metadata?.model_used !== PRIOR_PARTIAL_MODEL) {
      return null;
    }

    const baseline = prior.summary?.find((row) => row.condition === 'baseline_text');
    const revised = prior.summary?.find((row) => row.condition === 'revised_answer_id');

    return {
      model: PRIOR_PARTIAL_MODEL,
      baseline_api_success: baseline?.runs_api_success ?? 0,
      revised_api_success: revised?.runs_api_success ?? 0,
      note: 'Prior partial run retained as experiment_d_results_2.5-flash_partial.json before this re-run.',
    };
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('GOOGLE_GENERATIVE_AI_API_KEY is required for Experiment D.');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const priorPartial = loadPriorPartialSummary();
  const priorResultsPath = path.join(OUTPUT_DIR, 'experiment_d_results.json');
  if (priorPartial && fs.existsSync(priorResultsPath)) {
    fs.copyFileSync(
      priorResultsPath,
      path.join(OUTPUT_DIR, 'experiment_d_results_2.5-flash_partial.json'),
    );
    fs.copyFileSync(
      path.join(OUTPUT_DIR, 'experiment_d_summary.csv'),
      path.join(OUTPUT_DIR, 'experiment_d_summary_2.5-flash_partial.csv'),
    );
  }

  const modelId = REQUESTED_MODEL;
  const substitutionNote = `Used ${REQUESTED_MODEL} instead of historical ${DEPLOYMENT_MODEL}; does not reproduce June 2025 deployment. Required for new API keys where ${PRIOR_PARTIAL_MODEL} returns 404.`;

  console.log(`Experiment D using model: ${modelId}`);
  console.log(substitutionNote);

  const allRuns: LiveRunMetrics[] = [];
  const runLogs: Array<Record<string, unknown>> = [];

  for (let runIndex = 1; runIndex <= RUNS_PER_CONDITION; runIndex += 1) {
    console.log(`Baseline run ${runIndex}/${RUNS_PER_CONDITION}...`);
    const baseline = await runBaselineCall(modelId, runIndex);
    allRuns.push(baseline.metrics);
    runLogs.push(
      scrubSecrets({
        condition: 'baseline_text',
        run_index: runIndex,
        metrics: baseline.metrics,
        failure: baseline.failure,
        model_response: baseline.raw,
      }) as Record<string, unknown>,
    );
    if (runIndex < RUNS_PER_CONDITION) {
      await sleep(INTER_CALL_DELAY_MS);
    }
  }

  for (let runIndex = 1; runIndex <= RUNS_PER_CONDITION; runIndex += 1) {
    console.log(`Revised run ${runIndex}/${RUNS_PER_CONDITION}...`);
    const revised = await runRevisedCall(modelId, runIndex);
    allRuns.push(revised.metrics);
    runLogs.push(
      scrubSecrets({
        condition: 'revised_answer_id',
        run_index: runIndex,
        metrics: revised.metrics,
        failure: revised.failure,
        model_response: revised.raw,
      }) as Record<string, unknown>,
    );
    if (runIndex < RUNS_PER_CONDITION) {
      await sleep(INTER_CALL_DELAY_MS);
    }
  }

  const summary = summarizeLiveRuns(allRuns);

  const payload = scrubSecrets({
    metadata: {
      experiment: 'D_live_model',
      run_label: 'D_rerun_gemini-3.6-flash_full',
      retrospective: true,
      note: 'Live Gemini runs added retrospectively; not part of original June 2025 deployment.',
      historical_deployment_model: DEPLOYMENT_MODEL,
      model_used: modelId,
      model_substitution_note: substitutionNote,
      prior_partial_run: priorPartial,
      runs_per_condition: RUNS_PER_CONDITION,
      batch_size: syntheticAnswers.length,
      generation_settings: GENERATION_SETTINGS,
      retry_policy: {
        max_attempts: MAX_ATTEMPTS,
        base_backoff_ms: BASE_BACKOFF_MS,
        inter_call_delay_ms: INTER_CALL_DELAY_MS,
      },
      baseline_prompt_template: buildBaselineEvaluationPrompt(syntheticAnswers),
      revised_prompt_template: buildIdEvaluationPrompt(syntheticAnswers),
      baseline_schema: 'baselineEvaluationSchema (question_text, no answer_id)',
      revised_schema: 'idEvaluationSchema (requires answer_id)',
      run_timestamp_utc: new Date().toISOString(),
      node_version: process.version,
    },
    summary,
    runs: allRuns,
    run_logs: runLogs,
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'experiment_d_results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'experiment_d_summary.csv'), `${toCsvSummary(summary)}\n`);

  console.log('\nExperiment D summary:');
  console.log(toCsvSummary(summary));
  console.log(`\nWrote ${path.join(OUTPUT_DIR, 'experiment_d_results.json')}`);
  console.log(`Wrote ${path.join(OUTPUT_DIR, 'experiment_d_summary.csv')}`);

  const failed = allRuns.filter((run) => !run.api_success).length;
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(scrubSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
