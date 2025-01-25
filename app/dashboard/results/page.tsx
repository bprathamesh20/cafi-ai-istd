import { DashboardShell } from "@/components/dashboard-shell"
import { ResultsContent } from "@/components/results-content"


export default function ResultsPage() {
  return (
    <DashboardShell>
      <div className="space-y-8 w-full">
        <ResultsContent />
      </div>
    </DashboardShell>
  )
}

