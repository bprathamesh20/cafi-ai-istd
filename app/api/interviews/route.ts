import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId
import type { Interview, User } from '../../../types/types';

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