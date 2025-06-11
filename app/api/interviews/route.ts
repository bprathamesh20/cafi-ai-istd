import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Interview, User, QuestionSet, Question } from '../../../types/types';

export async function GET(req: NextRequest) {
  try {
    // Extract user_id from query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'user_id is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<Interview>('interviews');
    const users_collection = db.collection<User>('users');

    const user = await users_collection.findOne({ auth0id: userId });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const interviews = await collection.find({ user_id: user._id }).toArray();

    return NextResponse.json(interviews, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    
    const body = await req.json();
    const { user_id, position, start_time, status, question_set_id, custom_questions } = body;
    
    let final_question_set_id: ObjectId;

    if (!user_id || !position || !start_time || !status) {
      return NextResponse.json({ message: 'Missing required interview fields' }, { status: 400 });
    }
    
    if (custom_questions && custom_questions.length > 0) {
      const questionsCollection = db.collection<Question>('questions');
      const questionSetsCollection = db.collection<QuestionSet>('question_sets');

      const newQuestionSetData: Omit<QuestionSet, '_id'> = {
        name: `Custom Questions for ${position} - ${new Date().toLocaleDateString()}`,
        questions: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newQuestionSet = await questionSetsCollection.insertOne(newQuestionSetData as QuestionSet);
      const newQuestionSetId = newQuestionSet.insertedId;

      const questionDocs = custom_questions.map((q: { text: string, model_answer: string }) => ({
        text: q.text,
        type: 'custom',
        model_answer: q.model_answer || '',
        difficulty: 'normal',
        tags: ['custom'],
        question_set_id: newQuestionSetId,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      
      const insertedQuestions = await questionsCollection.insertMany(questionDocs as any[]);
      const insertedQuestionIds = Object.values(insertedQuestions.insertedIds);

      await questionSetsCollection.updateOne(
        { _id: newQuestionSetId },
        { $set: { questions: insertedQuestionIds } }
      );

      final_question_set_id = newQuestionSetId;

    } else if (question_set_id) {
      final_question_set_id = new ObjectId(String(question_set_id));
    } else {
      return NextResponse.json({ message: 'Either question_set_id or custom_questions must be provided' }, { status: 400 });
    }

    const interviewsCollection = db.collection<Interview>('interviews');
    const newInterview: Omit<Interview, '_id'> = {
      user_id: new ObjectId(String(user_id)),
      question_set_id: final_question_set_id,
      position,
      start_time: new Date(start_time),
      status,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await interviewsCollection.insertOne(newInterview as Interview);

    return NextResponse.json(result.insertedId, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}