# Answer-ID Association Experiments (Retrospective Extension)

This directory contains deterministic synthetic experiments comparing the original text-based assessment join (baseline commit `941cf3a`) with the retrospective answer-ID association extension on branch `cursor/answer-id-association-23a9`.

## One-command reproduction

```bash
npm install
npm run experiments:answer-id
npm run experiments:route-mock
```

Optional live model (Experiment D):

```bash
GOOGLE_GENERATIVE_AI_API_KEY=... npm run experiments:live-d
```

Outputs:

- `experiments/answer-id-association/output/results.json`
- `experiments/answer-id-association/output/results.csv`

## Scope

- **Experiment A**: six controlled batch cases (20 synthetic answers each)
- **Experiment B**: identical question text, different answer IDs
- **Experiment C**: semantic negative control (validator accepts wrong scores)
- **Experiment D**: live Gemini (`GOOGLE_GENERATIVE_AI_API_KEY` required; do not commit). Outputs `experiment_d_results.json`, `experiment_d_summary.csv`.

## Note on original project work

These experiments were **not** conducted during the original Cafi AI student project (baseline dated 11 June 2025). They are a retrospective validation added for an admissions technical report.
