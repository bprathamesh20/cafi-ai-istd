'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import type { User, QuestionSet } from '@/types/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function NewInterviewForm() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string | null>(null);
  const [position, setPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomQuestions, setUseCustomQuestions] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<{ text: string; model_answer: string }[]>([{ text: '', model_answer: '' }]);

  const { data: users, error: usersError } = useSWR<User[]>('/api/users', fetcher);
  const { data: questionSets, error: questionSetsError } = useSWR<QuestionSet[]>('/api/question-sets', fetcher);

  const handleAddQuestion = () => {
    setCustomQuestions([...customQuestions, { text: '', model_answer: '' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = customQuestions.filter((_, i) => i !== index);
    setCustomQuestions(newQuestions);
  };

  const handleQuestionChange = (index: number, field: 'text' | 'model_answer', value: string) => {
    const newQuestions = [...customQuestions];
    newQuestions[index][field] = value;
    setCustomQuestions(newQuestions);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (
      !selectedUserId ||
      !position ||
      (!useCustomQuestions && !selectedQuestionSetId) ||
      (useCustomQuestions && customQuestions.some(q => q.text.trim() === ''))
    ) {
      setError('All fields are required, and custom question text cannot be empty.');
      setIsSubmitting(false);
      return;
    }

    const requestBody: any = {
      user_id: selectedUserId,
      position,
      start_time: new Date(),
      status: 'scheduled',
    };

    if (useCustomQuestions) {
      requestBody.custom_questions = customQuestions;
    } else {
      requestBody.question_set_id = selectedQuestionSetId;
    }

    try {
      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create interview');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (usersError || questionSetsError) return <div>Failed to load data</div>;
  if (!users) return <div>Loading...</div>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Schedule New Interview</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-foreground mb-2">
              Candidate
            </label>
            <Select onValueChange={setSelectedUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a candidate" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user._id.toString()} value={user._id.toString()}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="custom-questions-switch" checked={useCustomQuestions} onCheckedChange={setUseCustomQuestions} />
            <Label htmlFor="custom-questions-switch">Use Custom Questions</Label>
          </div>

          {useCustomQuestions ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Custom Questions
              </label>
              {customQuestions.map((question, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-md">
                   <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Question {index + 1}</p>
                    {customQuestions.length > 1 && (
                     <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveQuestion(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  </div>
                  <Input
                    type="text"
                    value={question.text}
                    onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                    placeholder={`Question ${index + 1} Text`}
                    required
                  />
                  <Textarea
                    value={question.model_answer}
                    onChange={(e) => handleQuestionChange(index, 'model_answer', e.target.value)}
                    placeholder={`Model Answer for Question ${index + 1}`}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddQuestion}>
                Add Question
              </Button>
            </div>
          ) : (
            <div>
              <label htmlFor="question-set" className="block text-sm font-medium text-foreground mb-2">
                Question Set
              </label>
              <Select onValueChange={setSelectedQuestionSetId} required={!useCustomQuestions}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a question set" />
                </SelectTrigger>
                <SelectContent>
                  {questionSets?.map(qs => (
                    <SelectItem key={qs._id.toString()} value={qs._id.toString()}>
                      {qs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-foreground mb-2">
              Position
            </label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 