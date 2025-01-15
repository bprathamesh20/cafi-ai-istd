"use client"
import { DashboardShell } from "@/components/dashboard-shell"
import { InterviewContent } from "@/components/interview-content"
import { useUser } from "@stackframe/stack"

export default function DashboardPage() {
  const user = useUser();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell>
      <div className="space-y-8 w-full">
        <InterviewContent />
      </div>
    </DashboardShell>
  )
}

