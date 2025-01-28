import "server-only";

import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  urls:{
    signIn: '/signin',
    afterSignUp: '/onboarding',
    afterSignIn: '/onboarding'
  },
  tokenStore: "nextjs-cookie",
});
