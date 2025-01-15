import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";

export default function Handler(props: unknown) {
  {/* @ts-expect-error Server Component */}
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
  