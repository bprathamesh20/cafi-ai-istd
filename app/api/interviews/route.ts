import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId
import type { Interview } from '../../../types/types';

export async function GET(req: NextRequest) {
  try {
    // Extract user_id from query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'user_id is required' }, { status: 400 });
    }

    // Convert user_id string to ObjectId
    const userObjectId = new ObjectId(userId);

    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<Interview>('interviews');

    // Fetch interviews for the given user_id (as ObjectId)
    const interviews = await collection.find({ user_id: userObjectId }).toArray();

    return NextResponse.json(interviews, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}