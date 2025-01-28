import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
    try {
        const { auth0id, displayName } = await request.json();
        console.log('API: Received request for auth0id:', auth0id);

        if (!auth0id) {
            console.log('API: Missing auth0id');
            return NextResponse.json({ error: 'Auth0 ID is required' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("cafi_db");
        const usersCollection = db.collection('users');

        // Check if user exists
        const existingUser = await usersCollection.findOne({ auth0id });
        console.log('API: Existing user check result:', !!existingUser);

        if (!existingUser) {
            // Double-check to prevent race conditions
            const doubleCheck = await usersCollection.findOne({ auth0id });
            if (doubleCheck) {
                console.log('API: User was created by another request');
                return NextResponse.json({ status: 'exists', user: doubleCheck });
            }

            // Create new user if they don't exist
            const newUser = {
                _id: new ObjectId(),
                auth0id,
                name: displayName || '',
                email: auth0id,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Use updateOne with upsert instead of insertOne to prevent duplicates
            const result = await usersCollection.updateOne(
                { auth0id },
                { $setOnInsert: newUser },
                { upsert: true }
            );

            console.log('API: User creation result:', result);
            return NextResponse.json({ 
                status: result.upsertedCount > 0 ? 'created' : 'exists',
                user: newUser 
            });
        }

        return NextResponse.json({ status: 'exists', user: existingUser });
    } catch (error) {
        console.error('API: Error during user check/creation:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 