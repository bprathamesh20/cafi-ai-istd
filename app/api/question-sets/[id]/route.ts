import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { QuestionSet } from '../../../../types/types';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<QuestionSet>('question_sets');

    const questionSetId = params.id;
    
    if (!ObjectId.isValid(questionSetId)) {
      return NextResponse.json({ message: 'Invalid question set ID' }, { status: 400 });
    }

    const questionSet = await collection.findOne({ _id: new ObjectId(questionSetId) });

    if (!questionSet) {
      return NextResponse.json({ message: 'Question set not found' }, { status: 404 });
    }

    return NextResponse.json(questionSet, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const questionSetsCollection = db.collection<QuestionSet>('question_sets');
    const questionsCollection = db.collection('questions');

    const questionSetId = params.id;
    
    if (!ObjectId.isValid(questionSetId)) {
      return NextResponse.json({ message: 'Invalid question set ID' }, { status: 400 });
    }

    const objectId = new ObjectId(questionSetId);

    // First, delete all questions associated with this question set
    await questionsCollection.deleteMany({ question_set_id: objectId });

    // Then delete the question set itself
    const result = await questionSetsCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Question set not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question set deleted successfully' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
} 