import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Link from "next/link"

const interviews = [
  {
    id: 1,
    company: "Tech Innovators Inc.",
    position: "Senior Frontend Developer",
    date: "2023-06-15T14:00:00",
    status: "Upcoming",
  },
  {
    id: 2,
    company: "DataDriven Solutions",
    position: "Data Scientist",
    date: "2023-06-18T10:30:00",
    status: "Upcoming",
  },
  {
    id: 3,
    company: "CloudScale Systems",
    position: "DevOps Engineer",
    date: "2023-06-10T11:00:00",
    status: "Completed",
  },
  {
    id: 4,
    company: "AI Frontiers",
    position: "Machine Learning Engineer",
    date: "2023-06-05T15:30:00",
    status: "Completed",
  },
]

export default function ResultsPage() {
  return (
    <DashboardShell>
       <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Results</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {interviews.map((interview) => (
          <Card key={interview.id}>
            <CardHeader>
              <CardTitle>{interview.company}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{interview.position}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(interview.date).toLocaleString()}
              </p>
            </CardContent>
            <CardFooter>
              <Link href={`/dashboard/results/${interview.id}`}>
              <Button variant="cta" className="w-full">
               View Report
              </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
    </DashboardShell>
  )
}

