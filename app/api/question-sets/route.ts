import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { QuestionSet, Question } from '../../../types/types';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    
    const body = await req.json();
    const { name, description, questions } = body;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'At least one question is required' }, { status: 400 });
    }

    // Validate that all questions have text
    const invalidQuestions = questions.filter((q: any) => !q.text || q.text.trim() === '');
    if (invalidQuestions.length > 0) {
      return NextResponse.json({ message: 'All questions must have text' }, { status: 400 });
    }

    const questionSetsCollection = db.collection<QuestionSet>('question_sets');
    const questionsCollection = db.collection<Question>('questions');

    // First, create the question set
    const newQuestionSetData: Omit<QuestionSet, '_id'> = {
      name,
      description: description || '',
      questions: [], // Will be populated after creating questions
      created_at: new Date(),
      updated_at: new Date(),
    };

    const questionSetResult = await questionSetsCollection.insertOne(newQuestionSetData as QuestionSet);
    const questionSetId = questionSetResult.insertedId;

    // Create individual question documents
    const questionDocs = questions.map((q: { text: string; model_answer: string; type: string; difficulty: string }) => ({
      text: q.text.trim(),
      type: q.type || 'general',
      model_answer: q.model_answer?.trim() || '',
      difficulty: q.difficulty || 'normal',
      tags: [q.type || 'general'],
      question_set_id: questionSetId,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const questionsResult = await questionsCollection.insertMany(questionDocs as any[]);
    const questionIds = Object.values(questionsResult.insertedIds);

    // Update the question set with the question IDs
    await questionSetsCollection.updateOne(
      { _id: questionSetId },
      { 
        $set: { 
          questions: questionIds,
          updated_at: new Date()
        } 
      }
    );

    return NextResponse.json({ 
      questionSetId: questionSetId,
      questionsCreated: questionIds.length,
      message: 'Question set created successfully'
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<QuestionSet>('question_sets');

    const questionSets = await collection.find({}).toArray();

    return NextResponse.json(questionSets, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
} 