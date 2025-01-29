'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import useSWR from 'swr';
import type { Interview } from "@/types/types";
import { useUser } from "@stackframe/stack";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ResultsContent() {
  const user = useUser()
  const userId = user?.id
  const { data: interviews, error } = useSWR<Interview[]>(`/api/interviews?user_id=${userId}`, fetcher);


  const filterInterviews = interviews?.filter((interview)=> interview.status == 'completed')

  if (error) return <div>Failed to load interviews</div>;
  if (!filterInterviews) return <div>Loading interviews...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Results</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filterInterviews.map((interview) => (
          <Card key={interview._id.toString()}>
            <CardHeader>
              <CardTitle>{interview.company_id ? interview.company_id.toString() : 'Cafi AI DEMO'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{interview.position}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(interview.start_time).toLocaleString()}
              </p>
              <p className={`mt-2 text-sm font-medium ${
                interview.status === "scheduled" ? "text-blue-500" : "text-green-500"
              }`}>
                {interview.status}
              </p>
            </CardContent>
            <CardFooter>
              <Link href={`/dashboard/results/${interview._id.toString()}`}>
                <Button variant="outline" className="w-full">
                  View Feedback
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}