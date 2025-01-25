import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb'; 
import type { Result } from '../../../types/types';

export async function GET(req: NextRequest) {
  try {
    // Extract interview_id from query parameters
    const { searchParams } = new URL(req.url);
    const interviewId = searchParams.get('interview_id');

    if (!interviewId) {
      return NextResponse.json({ message: 'interview_id is required' }, { status: 400 });
    }

    // Convert interview_id string to ObjectId
    const interviewObjectId = new ObjectId(interviewId);
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<Result>('results');

    // Fetch result for the given interview_id
    const result = await collection.findOne({ interview_id: interviewObjectId });

    if (!result) {
      return NextResponse.json({ message: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}