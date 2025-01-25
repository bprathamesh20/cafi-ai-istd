"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import InterviewReport from "@/components/interview-report"
import { Button } from "@/components/ui/button"
import {  Result } from "@/types/types"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function InterviewReportPage({
  params,
}: {
  params: { id: string }
}) {
  console.log(params.id)
  const { data: result, error } = useSWR<Result>(`/api/results?interview_id=${params.id}`, fetcher);

  if (error) return <div>Failed to load result</div>;
  if (!result) return <div>Loading result...</div>;
  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/results">
            <Button variant="outline">Back to Results</Button>
          </Link>
          <h1 className="text-3xl font-bold">Interview Report</h1>
        </div>
        <InterviewReport result={result} />
      </div>
    </DashboardShell>
  )
} 