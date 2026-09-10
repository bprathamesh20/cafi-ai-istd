# Answer-ID Association Experiments (Retrospective Extension)

This directory contains deterministic synthetic experiments comparing the original text-based assessment join (baseline commit `941cf3a`) with the retrospective answer-ID association extension on branch `cursor/answer-id-association-23a9`.

## One-command reproduction

```bash
npm install
npm run experiments:answer-id
npm run experiments:route-mock
```

Outputs:

- `experiments/answer-id-association/output/results.json`
- `experiments/answer-id-association/output/results.csv`

## Scope

- **Experiment A**: six controlled batch cases (20 synthetic answers each)
- **Experiment B**: identical question text, different answer IDs
- **Experiment C**: semantic negative control (validator accepts wrong scores)
- **Experiment D**: not run (no non-production Gemini credentials in this workspace)

## Note on original project work

These experiments were **not** conducted during the original Cafi AI student project (baseline dated 11 June 2025). They are a retrospective validation added for an admissions technical report.
