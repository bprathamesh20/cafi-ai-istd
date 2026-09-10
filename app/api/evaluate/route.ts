import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

import clientPromise from '@/lib/mongodb';
import { associateQuestionsByAnswerId } from '@/lib/evaluation/id-association';
import { idEvaluationSchema } from '@/lib/evaluation/schemas';
import { serializeAnswerId } from '@/lib/evaluation/serialize-answer-id';
import { Answer, Interview, Result } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ message: 'Interview ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cafi_db');

    const answers = await db.collection<Answer>('answers').find({ interview_id: interviewId }).toArray();

    if (answers.length === 0) {
      return NextResponse.json({ message: 'No answers found for this interview' }, { status: 404 });
    }

    let interview = null;
    if (interviewId.length === 24) {
      try {
        interview = await db.collection<Interview>('interviews').findOne({ _id: ObjectId.createFromHexString(interviewId) });
      } catch (error) {
        console.log('Interview ObjectId conversion failed, trying as string:', error);
        interview = await db.collection<Interview>('interviews').findOne({ _id: interviewId as any });
      }
    } else {
      interview = await db.collection<Interview>('interviews').findOne({ _id: interviewId as any });
    }

    if (!interview) {
      return NextResponse.json({ message: 'Interview not found' }, { status: 404 });
    }

    const answerRecords = answers.map((answer) => ({
      answer_id: serializeAnswerId(answer._id),
      question_number: answer.question_number,
      question: answer.question,
      answer: answer.answer,
    }));

    const evaluationPrompt = `
      You are an expert interviewer. Evaluate the candidate's answers for the following questions.
      Provide a score and feedback for each question, and then an overall score and breakdown.
      The score should be from 1 to 100.

      also evaluate the candidate's overall performance and provide a feedback for the candidate.
      if model answer is not provided, then score the candidate's answer based on the question and the answer.

      Each answer has a unique answer_id. You MUST copy each answer_id exactly into your response.
      Do not invent, omit, or duplicate answer_id values.

      Questions and Candidate Answers:
      ${answerRecords
        .map(
          (answer) => `
        answer_id: ${answer.answer_id}
        Question ${answer.question_number}: ${answer.question}
        Candidate's Answer: ${answer.answer}
      `,
        )
        .join('\n\n')}
    `;

    const { object: evaluation } = await generateObject({
      model: google('gemini-2.5-pro-preview-05-06'),
      prompt: evaluationPrompt,
      schema: idEvaluationSchema,
    });

    const associationResult = associateQuestionsByAnswerId(answerRecords, evaluation.questions);

    if (!associationResult.ok) {
      return NextResponse.json(
        {
          message: 'Evaluation association validation failed',
          error: associationResult.error,
        },
        { status: 422 },
      );
    }

    const resultToSave: Omit<Result, '_id'> = {
      user_id: interview.user_id,
      interview_id: interviewId.length === 24 ? ObjectId.createFromHexString(interviewId) : interviewId as any,
      overall_score: evaluation.overall_score,
      score_breakdown: evaluation.score_breakdown,
      questions: associationResult.questions,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const insertedResult = await db.collection('results').insertOne(resultToSave);
    const newResult = { _id: insertedResult.insertedId, ...resultToSave };

    const completionTime = new Date();
    const totalQuestions = answers.length;
    const interviewObjectId = interviewId.length === 24 ? ObjectId.createFromHexString(interviewId) : interviewId as any;

    await db.collection('interviews').updateOne(
      { _id: interviewObjectId },
      {
        $set: {
          status: 'completed',
          completion_time: completionTime,
          total_questions_answered: totalQuestions,
        },
      },
    );

    return NextResponse.json(newResult, { status: 200 });
  } catch (error) {
    console.error('Error during evaluation:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
