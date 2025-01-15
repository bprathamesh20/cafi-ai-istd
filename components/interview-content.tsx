import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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

export function InterviewContent() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Interviews</h1>
        <Button variant='cta'>Schedule New Interview</Button>
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
              <p className={`mt-2 text-sm font-medium ${
                interview.status === "Upcoming" ? "text-blue-500" : "text-green-500"
              }`}>
                {interview.status}
              </p>
            </CardContent>
            <CardFooter>
              <Link href={`/interview`}>
                <Button variant="outline" className="w-full">
                  {interview.status === "Upcoming" ? "Prepare" : "View Feedback"}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

