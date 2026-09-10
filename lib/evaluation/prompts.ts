import { AnswerRecord } from '@/lib/evaluation/types';

export function buildBaselineEvaluationPrompt(answers: AnswerRecord[]): string {
  return `
      You are an expert interviewer. Evaluate the candidate's answers for the following questions.
      Provide a score and feedback for each question, and then an overall score and breakdown.
      The score should be from 1 to 100.

      also evaluate the candidate's overall performance and provide a feedback for the candidate.
      if model answer is not provided, then score the candidate's answer based on the question and the answer.

      Questions and Candidate Answers:
      ${answers
        .map(
          (answer) => `
        Question ${answer.question_number}: ${answer.question}
        Candidate's Answer: ${answer.answer}
      `,
        )
        .join('\n\n')}
    `;
}

export function buildIdEvaluationPrompt(answers: AnswerRecord[]): string {
  return `
      You are an expert interviewer. Evaluate the candidate's answers for the following questions.
      Provide a score and feedback for each question, and then an overall score and breakdown.
      The score should be from 1 to 100.

      also evaluate the candidate's overall performance and provide a feedback for the candidate.
      if model answer is not provided, then score the candidate's answer based on the question and the answer.

      Each answer has a unique answer_id. You MUST copy each answer_id exactly into your response.
      Do not invent, omit, or duplicate answer_id values.

      Questions and Candidate Answers:
      ${answers
        .map(
          (answer) => `
        answer_id: ${answer.answer_id}
        Question ${answer.question_number}: ${answer.question}
        Candidate's Answer: ${answer.answer}
      `,
        )
        .join('\n\n')}
    `;
}
