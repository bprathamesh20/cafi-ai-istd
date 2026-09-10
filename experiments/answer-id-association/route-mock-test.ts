import { associateQuestionsByAnswerId } from '../../lib/evaluation/id-association';
import { AnswerRecord } from '../../lib/evaluation/types';

interface MockDbState {
  insertedResults: unknown[];
  interviewUpdates: unknown[];
}

function createMockDb(initialInterviewStatus: string): { db: MockDbState; handlers: MockHandlers } {
  const state: MockDbState = {
    insertedResults: [],
    interviewUpdates: [],
  };

  const handlers: MockHandlers = {
    insertResult: (result: unknown) => {
      state.insertedResults.push(result);
      return { insertedId: 'mock-result-id' };
    },
    updateInterview: (update: unknown) => {
      state.interviewUpdates.push(update);
    },
    getInterviewStatus: () => initialInterviewStatus,
  };

  return { db: state, handlers };
}

interface MockHandlers {
  insertResult: (result: unknown) => { insertedId: string };
  updateInterview: (update: unknown) => void;
  getInterviewStatus: () => string;
}

function simulateEvaluatePersistence(
  answers: AnswerRecord[],
  modelEvaluations: Array<{
    answer_id: string;
    question_text: string;
    user_answer: string;
    score: number;
    feedback: string;
  }>,
  handlers: MockHandlers,
  initialInterviewStatus: string,
):
  | { status: 422; inserted: false; completed: false }
  | { status: 200; inserted: true; completed: true } {
  const associationResult = associateQuestionsByAnswerId(answers, modelEvaluations);

  if (!associationResult.ok) {
    return { status: 422, inserted: false, completed: false };
  }

  handlers.insertResult({ questions: associationResult.questions });
  handlers.updateInterview({ status: 'completed' });

  return {
    status: 200,
    inserted: handlers.getInterviewStatus() !== 'completed' || true,
    completed: true,
  };
}

function runRouteMockTests(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    details.push(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
    if (condition) {
      passed += 1;
    } else {
      failed += 1;
    }
  };

  const validAnswers: AnswerRecord[] = [
    {
      answer_id: '507f1f77bcf86cd79943c001',
      question_number: 1,
      question: 'Q1',
      answer: 'A1',
    },
  ];

  const validEvaluations = [
    {
      answer_id: '507f1f77bcf86cd79943c001',
      question_text: 'Q1',
      user_answer: 'A1',
      score: 80,
      feedback: 'Good',
    },
  ];

  const validRun = createMockDb('in_progress');
  const validOutcome = simulateEvaluatePersistence(
    validAnswers,
    validEvaluations,
    validRun.handlers,
    'in_progress',
  );
  assert(validOutcome.status === 200, 'valid association persists result');
  assert(validRun.db.insertedResults.length === 1, 'valid association performs insert');
  assert(validRun.db.interviewUpdates.length === 1, 'valid association marks interview completed');

  const duplicateRun = createMockDb('in_progress');
  const duplicateOutcome = simulateEvaluatePersistence(
    validAnswers,
    [
      ...validEvaluations,
      {
        ...validEvaluations[0],
      },
    ],
    duplicateRun.handlers,
    'in_progress',
  );
  assert(duplicateOutcome.status === 422, 'duplicate model answer_id rejected before writes');
  assert(duplicateRun.db.insertedResults.length === 0, 'duplicate model answer_id skips insert');
  assert(duplicateRun.db.interviewUpdates.length === 0, 'duplicate model answer_id skips completion update');

  const missingRun = createMockDb('in_progress');
  const missingOutcome = simulateEvaluatePersistence(validAnswers, [], missingRun.handlers, 'in_progress');
  assert(missingOutcome.status === 422, 'missing assessments rejected before writes');
  assert(missingRun.db.insertedResults.length === 0, 'missing assessments skip insert');
  assert(missingRun.db.interviewUpdates.length === 0, 'missing assessments skip completion update');

  const zeroScoreRun = createMockDb('in_progress');
  const zeroScoreOutcome = simulateEvaluatePersistence(
    validAnswers,
    [{ ...validEvaluations[0], score: 0 }],
    zeroScoreRun.handlers,
    'in_progress',
  );
  assert(zeroScoreOutcome.status === 200, 'legitimate zero score is accepted');
  assert(
    (zeroScoreRun.db.insertedResults[0] as { questions: Array<{ score: number }> }).questions[0].score === 0,
    'legitimate zero score is persisted without truthiness fallback',
  );

  return { passed, failed, details };
}

const result = runRouteMockTests();

console.log(JSON.stringify({ route_mock_tests: result }, null, 2));

if (result.failed > 0) {
  process.exitCode = 1;
}
