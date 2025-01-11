"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"

// Mock data for the interview report
const interviewData = {
  overallScore: 85,
  communicationScore: 90,
  correctnessScore: 80,
  areaScores: [
    { area: "Problem Solving", score: 85 },
    { area: "Data Structures", score: 80 },
    { area: "Algorithms", score: 75 },
    { area: "System Design", score: 90 },
    { area: "Coding Skills", score: 85 },
  ],
  questions: [
    { id: 1, question: "Explain the difference between a stack and a queue.", answer: "A stack follows LIFO (Last In First Out) principle, while a queue follows FIFO (First In First Out) principle.", score: 90 },
    { id: 2, question: "What is the time complexity of quicksort?", answer: "The average time complexity of quicksort is O(n log n), but in the worst case, it can be O(n^2).", score: 85 },
    { id: 3, question: "Describe the concept of dynamic programming.", answer: "Dynamic programming is an algorithmic paradigm that solves complex problems by breaking them down into simpler subproblems and storing the results for future use.", score: 80 },
    { id: 4, question: "How would you design a distributed cache system?", answer: "A distributed cache system can be designed using a hash ring for consistent hashing, with multiple nodes storing key-value pairs and replication for fault tolerance.", score: 95 },
    { id: 5, question: "Implement a function to reverse a linked list.", answer: "I would use three pointers: prev, current, and next. Iterate through the list, updating the next pointer of each node to point to the previous node.", score: 85 },
  ],
}

export default function InterviewReport() {
  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Score</span>
                  <span className="text-sm font-medium">{interviewData.overallScore}%</span>
                </div>
                <Progress value={interviewData.overallScore} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Communication</span>
                  <span className="text-sm font-medium">{interviewData.communicationScore}%</span>
                </div>
                <Progress value={interviewData.communicationScore} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Correctness</span>
                  <span className="text-sm font-medium">{interviewData.correctnessScore}%</span>
                </div>
                <Progress value={interviewData.correctnessScore} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance by Area</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                score: {
                  label: "Score",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={interviewData.areaScores}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.6} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Question Scores</CardTitle>
          <CardDescription>Performance breakdown by individual questions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              score: {
                label: "Score",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interviewData.questions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="id" />
                <YAxis domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="score" fill="var(--color-score)" name="Score" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detailed Question Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Your Answer</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviewData.questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.question}</TableCell>
                  <TableCell>{q.answer}</TableCell>
                  <TableCell className="text-right">{q.score}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

