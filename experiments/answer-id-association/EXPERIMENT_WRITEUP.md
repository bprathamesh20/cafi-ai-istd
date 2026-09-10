# Experiment Write-up: Answer-ID Association in Cafi AI Assessment Pipeline

**Status:** Retrospective extension (September 2026). Not part of original student deployment.

## Research question

Does joining Gemini-generated per-question assessments to stored interview answers by stable `answer_id` (serialized MongoDB `Answer._id`) improve structural association reliability compared with the original join keyed on `question_text`?

## Historical baseline

- **Web repository:** [cafi-ai-istd](https://github.com/bprathamesh20/cafi-ai-istd)
- **Reviewed baseline commit:** `941cf3a5e7c7c995a1d82699849c9b8b1aa78de9` (11 June 2025)
- **Upstream HEAD at experiment run:** `941cf3a5e7c7c995a1d82699849c9b8b1aa78de9` (matches baseline)
- **Original association logic:** `app/api/evaluate/route.ts` built `questionEvaluationMap[question_text]` and matched `answer.question`, falling back to score `0` / feedback `N/A` on miss (including truthiness fallback `|| 0`).
- **Backend agent repo (context only):** [cafi-backend-istd](https://github.com/bprathamesh20/cafi-backend-istd) @ `2c697ab2f91546e2c8aafb3927182021e90a19de9` — not modified; ObjectId/string retrieval mismatch documented as pre-existing limitation.

## Method (retrospective extension)

### Implementation

1. Extracted baseline text join to `lib/evaluation/baseline-text-association.ts` (preserved behavior).
2. Added ID join + validation in `lib/evaluation/id-association.ts`:
   - Prompt/schema include required `answer_id`.
   - Before persistence: every expected ID exactly once; reject duplicate/missing/unknown/malformed IDs.
   - Match by ID; persist results in original answer order using stored question/answer text.
   - Optional `answer_id` field on result questions (`types/types.ts`); `question_id` remains question number.
3. Updated route: `app/api/evaluate/route.ts` returns HTTP 422 on validation failure; no insert/completion update.

### Synthetic fixtures

- 20 answers with unique 24-char hex IDs (`experiments/answer-id-association/fixtures.ts`).
- Independent ground-truth map `answer_id → score` (scores 5–96 via deterministic formula).
- Model outputs mocked as structured JSON (no live Gemini for A–C).
- Reorder seed for case A3: `[19,3,7,0,11,15,2,8,13,1,17,5,9,14,4,18,6,12,16,10]`.

### Metrics (reported separately)

| Metric | Meaning |
|--------|---------|
| `correct_associations` | Returned score equals ground truth for that answer slot |
| `wrong_associations` | Score mismatch |
| `missing_fallback_to_zero` | Expected non-zero score but got 0 due to failed text match |
| `silent_zero_score_fallbacks` | Score 0 **and** feedback `N/A` (baseline silent failure mode) |
| `rejected` | Revised implementation returned validation error (no persistence) |
| `order_preserved` | Output question slots follow original answer order with original stored text |

Association correctness is **structural** (ID/text join). Semantic grading correctness is explicitly out of scope.

## Results

### Experiment A — six batch cases (N=20 each)

| Case | Baseline text join | Revised answer-ID join |
|------|-------------------|------------------------|
| A1 unchanged text | 20/20 correct | 20/20 correct |
| A2 reworded text | 0/20 correct (20 silent 0/N/A fallbacks) | 20/20 correct |
| A3 reordered model output | 20/20 correct; order preserved | 20/20 correct; order preserved |
| A4 duplicate IDs | Not rejected; 20/20 (duplicate not detected) | **Rejected** (`DUPLICATE_MODEL_ANSWER_ID`) |
| A5 missing IDs | 19/20 correct; 1 silent 0/N/A fallback | **Rejected** (`MISSING_ANSWER_ID`) |
| A6 unknown IDs | Not rejected; one wrong + silent failures | **Rejected** (`UNKNOWN_ANSWER_ID`) |

**Interpretation:** Text join is fragile to benign model paraphrase (A2). Reordering alone does not break text join when question strings still match (A3 — reported honestly). ID join adds explicit contract enforcement for incomplete/ambiguous model output (A4–A6).

### Experiment B — identical question text, different answers

| Implementation | Scores returned (answer order) | Correct? |
|----------------|-------------------------------|----------|
| Baseline | `[85, 85]` | Both received last map entry for shared `question_text` |
| Revised | `[35, 85]` | Each `answer_id` retains distinct ground-truth score |

### Experiment C — semantic negative control

- Validator **accepted** structurally valid output where scores were intentionally permuted across IDs.
- All 20 fixture rows were semantically mismatched vs ground truth.
- **Limitation documented:** ID association validates identity/shape, not grading correctness.

### Route mock test (revised path)

Mocked DB handlers confirm invalid association never inserts results or marks interviews completed; legitimate score `0` persists.

### Experiment D — live model (retrospective)

**Ran:** 10 September 2026 (partial completion due to API quota).

**Model:** `gemini-2.5-flash` via `@ai-sdk/google` `generateObject`. Historical deployment used `gemini-2.5-pro-preview-05-06`; substitution documented — **does not reproduce June 2025 deployment**.

**Design:**

- Same 20-record synthetic fixture as experiments A–C.
- 10 runs per condition (baseline text schema vs revised ID schema).
- Constant generation settings: `temperature: 0`.
- Prompts recorded in output metadata (`baselineEvaluationSchema` vs `idEvaluationSchema`).
- Full raw responses and failures logged in `experiment_d_results.json` (secrets scrubbed).

**Command:**

```bash
GOOGLE_GENERATIVE_AI_API_KEY=... npm run experiments:live-d
```

(Do not commit or log the API key.)

### Experiment D results

| Metric | Baseline text (10/10 API ok) | Revised answer-ID (5/10 API ok) |
|--------|------------------------------|----------------------------------|
| API failures | 0 | 5 (free-tier quota / rate limit) |
| Association rejections | N/A | 0 |
| Text join failures | 0 | N/A |
| Silent 0/N/A fallbacks | 0 | 0 |
| Wording changes (model `question_text` ≠ fixture) | 0 / 200 rows | 0 / 100 rows |
| Scores preserved through association | 200 / 200 | 100 / 100 |
| Missing / duplicate / unknown IDs | N/A | 0 |

**Successful revised runs:** 2, 3, 4, 5, 9 — all returned 20/20 questions with exact `answer_id` copies, zero validation rejections, and full score preservation through ID association.

**Baseline live runs:** On this fixture, `gemini-2.5-flash` echoed exact question text in all 10 runs, yielding zero observed text-join failures. This is a **valid null result** for this model/fixture combination; it does not contradict deterministic failures in experiment A2 (reworded mock output).

**API failures (revised runs 1, 6, 7, 8, 10):** `generativelanguage.googleapis.com/generate_content_free_tier_requests` quota (limit 20) and transient high-demand errors. Retries after 35s did not succeed. Partial data retained; see `run_logs` in output JSON.

**Interpretation:** Live runs measure structural association under real model output, not grading quality. Score variation across runs is not interpreted as improved grading. ID contract enforcement was not stress-tested live (no duplicate/missing/unknown IDs observed); experiments A4–A6 remain the primary evidence for rejection behavior.

**Outputs:**

- `experiments/answer-id-association/output/experiment_d_results.json`
- `experiments/answer-id-association/output/experiment_d_summary.csv`

## Discussion

The retrospective extension addresses a concrete failure mode in the original pipeline: assessment rows are keyed by model-echoed question text, so punctuation/paraphrase triggers false zero scores despite valid model output. Answer-ID association is a minimal identity contract that:

1. Decouples association from natural-language question matching.
2. Rejects ambiguous model output instead of silently writing zero scores.
3. Preserves duplicate-question scenarios where question text alone is not unique.

This does **not** validate fairness, rubric quality, or deployment safety. Scale inconsistency (prompt 1–100 vs schema 1–10 vs UI %) was intentionally not refactored to avoid confounding the association comparison.

## Reproducibility

```bash
npm install
npm run experiments:answer-id
npm run experiments:route-mock
GOOGLE_GENERATIVE_AI_API_KEY=... npm run experiments:live-d
```

Machine-readable outputs: `experiments/answer-id-association/output/results.json`, `results.csv`, `experiment_d_results.json`, `experiment_d_summary.csv`.

Code references:

- Baseline join: `lib/evaluation/baseline-text-association.ts`
- ID join: `lib/evaluation/id-association.ts`
- Revised route: `app/api/evaluate/route.ts`
- Experiment runner: `experiments/answer-id-association/run.ts`
- Live experiment D: `experiments/answer-id-association/run-live-d.ts`

## Limitations

1. Synthetic mocks for A–C; live model partial for D (5/10 revised runs hit API quota).
2. Backend agent repo unchanged; cross-service ID serialization not integration-tested.
3. Manuscript sections on local machine unavailable here — this document is insert-ready for methods/results/discussion.
