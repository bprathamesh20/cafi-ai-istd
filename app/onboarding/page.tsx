"use client"

import { useUser } from "@stackframe/stack";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
    const user = useUser();
    const router = useRouter();
    const isCheckingRef = useRef(false);

    useEffect(() => {
        const checkAndCreateUser = async () => {
            if (!user?.id || isCheckingRef.current) return;

            try {
                isCheckingRef.current = true;
                console.log('Client: Starting user check for auth0id:', user.id);
                
                const response = await fetch('/api/users/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        auth0id: user.id,
                        displayName: user.displayName
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to check/create user');
                }

                const data = await response.json();
                console.log('Client: User check response:', data.status);

                // Redirect to dashboard after successful check/creation
                router.push('/dashboard');
            } catch (error) {
                console.error('Client: Error during user check/creation:', error);
                isCheckingRef.current = false; // Reset flag only on error to allow retry
            }
        };

        checkAndCreateUser();
    }, [user, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Setting up your account...</h1>
                <p>Please wait while we prepare your dashboard.</p>
            </div>
        </div>
    );
}