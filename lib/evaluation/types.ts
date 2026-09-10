export interface ModelQuestionEvaluation {
  question_text: string;
  user_answer: string;
  score: number;
  feedback: string;
}

export interface ModelQuestionEvaluationWithId extends ModelQuestionEvaluation {
  answer_id: string;
}

export interface AnswerRecord {
  answer_id: string;
  question_number: number;
  question: string;
  answer: string;
}

export interface AssociatedQuestionResult {
  question_id: string;
  answer_id?: string;
  question_text: string;
  user_answer: string;
  score: number;
  feedback: string;
}

export type IdAssociationValidationError =
  | { code: 'DUPLICATE_EXPECTED_ANSWER_ID'; answer_id: string }
  | { code: 'DUPLICATE_MODEL_ANSWER_ID'; answer_id: string }
  | { code: 'MISSING_ANSWER_ID'; missing_ids: string[] }
  | { code: 'UNKNOWN_ANSWER_ID'; unknown_ids: string[] }
  | { code: 'MALFORMED_ANSWER_ID'; answer_id: string };
