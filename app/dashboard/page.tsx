import { DashboardShell } from "@/components/dashboard-shell"
import { InterviewContent } from "@/components/interview-content"
import { DashboardSummary } from "@/components/dashboard-summary"

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="space-y-8 w-full">
        <InterviewContent />
      </div>
    </DashboardShell>
  )
}
