'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardShell } from "@/components/dashboard-shell";
import type { QuestionSet } from '@/types/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function QuestionSetsPage() {
  const { data: questionSets, error, mutate } = useSWR<QuestionSet[]>('/api/question-sets', fetcher);

  const handleDelete = async (questionSetId: string) => {
    if (!confirm('Are you sure you want to delete this question set?')) {
      return;
    }

    try {
      const response = await fetch(`/api/question-sets/${questionSetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        mutate();
      } else {
        alert('Failed to delete question set');
      }
    } catch (error) {
      alert('Error deleting question set');
    }
  };

  if (error) return <div>Failed to load question sets</div>;
  if (!questionSets) return <div>Loading question sets...</div>;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Question Sets</h1>
          <Link href="/question-sets/new">
            <Button variant='cta'>Create New Question Set</Button>
          </Link>
        </div>
        
        {questionSets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">No question sets created yet.</p>
              <Link href="/question-sets/new">
                <Button>Create Your First Question Set</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questionSets.map((questionSet) => (
              <Card key={questionSet._id.toString()}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{questionSet.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {questionSet.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {questionSet.description}
                    </p>
                  )}
                  <p className="text-sm font-medium">
                    {questionSet.questions.length} question{questionSet.questions.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(questionSet.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Link href={`/question-sets/${questionSet._id}/view`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View
                    </Button>
                  </Link>
                  <Link href={`/question-sets/${questionSet._id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => handleDelete(questionSet._id.toString())}
                  >
                    ×
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
} 