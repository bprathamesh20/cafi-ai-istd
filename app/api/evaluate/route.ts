//route to evaluate interview answers for a candidate interview 

// request: interview-id 
// what it does : 1) fetch all the answers with questions for the interview 
// 2) fetch all model answers for the interview 
// 3) evaluate the answers for the questions with model answers    
// 4) generate a result object using vercel ai sdk (with gemini) 
// 5) save the evaluation in the database 
// 6) return the evaluation 

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';

import clientPromise from '@/lib/mongodb';
import { Answer, Question, Result, Interview } from '@/types/types';

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

    const evaluationPrompt = `
      You are an expert interviewer. Evaluate the candidate's answers for the following questions.
      Provide a score and feedback for each question, and then an overall score and breakdown.
      The score should be from 1 to 100.

      also evaluate the candidate's overall performance and provide a feedback for the candidate.
      if model answer is not provided, then score the candidate's answer based on the question and the answer.
      
      Questions and Candidate Answers:
      ${answers.map(answer => `
        Question ${answer.question_number}: ${answer.question}
        Candidate's Answer: ${answer.answer}
      `).join('\n\n')}
    `;

    const resultSchema = z.object({
        overall_score: z.number().describe('Overall score for the interview, from 1 to 10.'),
        score_breakdown: z.object({
            technical: z.number().describe('Technical skills score.'),
            communication: z.number().describe('Communication skills score.'),
            problem_solving: z.number().describe('Problem-solving skills score.'),
            confidence: z.number().describe('Confidence score.'),
        }),
        questions: z.array(z.object({
            question_text: z.string().describe('The text of the question.'),
            user_answer: z.string().describe("The user's answer."),
            score: z.number().describe('Score for this specific question.'),
            feedback: z.string().describe('Feedback for the user\'s answer.'),
        })),
    });

    const { object: evaluation } = await generateObject({
      model: google('gemini-2.5-pro-preview-05-06'),
      prompt: evaluationPrompt,
      schema: resultSchema,
    });
    
    type QuestionEvaluation = (typeof evaluation.questions)[0];

    const questionEvaluationMap = evaluation.questions.reduce((map: Record<string, QuestionEvaluation>, q: QuestionEvaluation) => {
        map[q.question_text] = q;
        return map;
    }, {});

    const resultToSave: Omit<Result, '_id'> = {
        user_id: interview.user_id,
        interview_id: interviewId.length === 24 ? ObjectId.createFromHexString(interviewId) : interviewId as any,
        overall_score: evaluation.overall_score,
        score_breakdown: evaluation.score_breakdown,
        questions: answers.map(answer => {
            const questionEval = questionEvaluationMap[answer.question];
            return {
                question_id: answer.question_number.toString(),
                question_text: answer.question,
                user_answer: answer.answer,
                score: questionEval?.score || 0,
                feedback: questionEval?.feedback || 'N/A',
            };
        }),
        created_at: new Date(),
        updated_at: new Date(),
    };

    const insertedResult = await db.collection('results').insertOne(resultToSave);
    const newResult = { _id: insertedResult.insertedId, ...resultToSave };

    // Update interview status
    const completionTime = new Date();
    const totalQuestions = answers.length;
    
    const interviewObjectId = interviewId.length === 24 ? ObjectId.createFromHexString(interviewId) : interviewId as any;
    
    await db.collection('interviews').updateOne(
      { _id: interviewObjectId },
      {
        $set: {
          status: "completed",
          completion_time: completionTime,
          total_questions_answered: totalQuestions
        }
      }
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