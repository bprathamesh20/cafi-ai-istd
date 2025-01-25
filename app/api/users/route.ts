import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import type { Interview } from '../../../types/types';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('cafi_db');
    const collection = db.collection<Interview>('users');

    const Interview = await collection.find({}).toArray();
    return NextResponse.json(Interview, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Something went wrong', error }, { status: 500 });
  }
}


export async function POST(req:NextRequest) {
    
    try {
      const client = await clientPromise;
      const db = client.db('cafi_db');
      const collection = db.collection<Interview>('users');
  
      const Interview = await collection.find({}).toArray();
      return NextResponse.json(Interview, { status: 200 });
    } catch (error) {
      return NextResponse.json({ message: 'Something went wrong', error }, { status: 500 });
    }
  }