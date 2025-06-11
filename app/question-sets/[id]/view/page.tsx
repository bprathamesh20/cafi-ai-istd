'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardShell } from "@/components/dashboard-shell";
import { ArrowLeft } from 'lucide-react';
import type { QuestionSet, Question } from '@/types/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ViewQuestionSetPage() {
  const params = useParams();
  const router = useRouter();
  const questionSetId = params.id as string;

  const { data: questionSet, error: questionSetError } = useSWR<QuestionSet>(
    questionSetId ? `/api/question-sets/${questionSetId}` : null, 
    fetcher
  );
  
  const { data: questions, error: questionsError } = useSWR<Question[]>(
    questionSetId ? `/api/question-sets/${questionSetId}/questions` : null, 
    fetcher
  );

  if (questionSetError || questionsError) return <div>Failed to load question set</div>;
  if (!questionSet || !questions) return <div>Loading...</div>;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/question-sets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{questionSet.name}</h1>
            {questionSet.description && (
              <p className="text-muted-foreground mt-2">{questionSet.description}</p>
            )}
          </div>
          <Link href={`/question-sets/${questionSetId}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Question Set Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Questions:</span> {questions.length}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(questionSet.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(questionSet.updated_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Question Types:</span>{' '}
                  {Array.from(new Set(questions.map(q => q.type))).join(', ')}
                </div>
              </div>
            </CardContent>
          </Card>

          {questions.map((question, index) => (
            <Card key={question._id.toString()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {question.type}
                    </span>
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {question.difficulty}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Question:</h4>
                  <p className="text-foreground whitespace-pre-wrap">{question.text}</p>
                </div>
                
                {question.model_answer && (
                  <div>
                    <h4 className="font-medium mb-2">Model Answer:</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                      {question.model_answer}
                    </p>
                  </div>
                )}

                {question.tags && question.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags:</h4>
                    <div className="flex gap-1">
                      {question.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
} 