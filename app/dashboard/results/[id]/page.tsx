"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import InterviewReport from "@/components/interview-report"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function InterviewReportPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/results">
            <Button variant="outline">Back to Results</Button>
          </Link>
          <h1 className="text-3xl font-bold">Interview Report #{params.id}</h1>
        </div>
        <InterviewReport />
      </div>
    </DashboardShell>
  )
} 