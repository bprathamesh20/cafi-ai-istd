import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../../../lib/mongodb';
import { Question } from '../../../../../types/types';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<Question>('questions');

    const questionSetId = params.id;
    
    if (!ObjectId.isValid(questionSetId)) {
      return NextResponse.json({ message: 'Invalid question set ID' }, { status: 400 });
    }

    const questions = await collection
      .find({ question_set_id: new ObjectId(questionSetId) })
      .sort({ created_at: 1 }) // Sort by creation time to maintain order
      .toArray();

    return NextResponse.json(questions, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
} 