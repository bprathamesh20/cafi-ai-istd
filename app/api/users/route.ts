import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import type { User } from '../../../types/types';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<User>('users');

    const users = await collection.find({}).toArray();
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
  }
}


export async function POST() {
    
    try {
      const client = await clientPromise;
      const db = client.db('cafi_db');
      const collection = db.collection<User>('users');
  
      const users = await collection.find({}).toArray();
      return NextResponse.json(users, { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ message: 'Something went wrong', error: errorMessage }, { status: 500 });
    }
  }