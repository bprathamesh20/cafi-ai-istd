import { z } from 'zod';

const scoreBreakdownSchema = z.object({
  technical: z.number().describe('Technical skills score.'),
  communication: z.number().describe('Communication skills score.'),
  problem_solving: z.number().describe('Problem-solving skills score.'),
  confidence: z.number().describe('Confidence score.'),
});

const baselineQuestionSchema = z.object({
  question_text: z.string().describe('The text of the question.'),
  user_answer: z.string().describe("The user's answer."),
  score: z.number().describe('Score for this specific question.'),
  feedback: z.string().describe("Feedback for the user's answer."),
});

const idQuestionSchema = baselineQuestionSchema.extend({
  answer_id: z
    .string()
    .describe('The exact answer_id from the input; must match exactly.'),
});

export const baselineEvaluationSchema = z.object({
  overall_score: z.number().describe('Overall score for the interview, from 1 to 10.'),
  score_breakdown: scoreBreakdownSchema,
  questions: z.array(baselineQuestionSchema),
});

export const idEvaluationSchema = baselineEvaluationSchema.extend({
  questions: z.array(idQuestionSchema),
});

export type BaselineEvaluation = z.infer<typeof baselineEvaluationSchema>;
export type IdEvaluation = z.infer<typeof idEvaluationSchema>;
