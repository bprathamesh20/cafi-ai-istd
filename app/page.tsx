"use client"

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from "@stackframe/stack"

export default function Page() {
  const router = useRouter(); 
  const user = useUser()

  useEffect(() => {
    if(user){
      router.push('/dashboard');
    }
    else{
      router.push('/handler/sign-in');
    }
    
  }, [router]);

  return null;  
}