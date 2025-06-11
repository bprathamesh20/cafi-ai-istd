'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

export default function NewQuestionSetPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<{ text: string; model_answer: string; type: string; difficulty: string }[]>([
    { text: '', model_answer: '', type: 'coding', difficulty: 'normal' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', model_answer: '', type: 'coding', difficulty: 'normal' }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleQuestionChange = (index: number, field: keyof typeof questions[0], value: string) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!name || questions.some(q => q.text.trim() === '')) {
      setError('Name and all question texts are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/question-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, questions }),
      });

      if (!response.ok) {
        throw new Error('Failed to create question set');
      }

      router.push('/question-sets');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Question Set</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Frontend Developer Interview Questions"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this question set..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                  Questions
                </label>
                <Button type="button" variant="outline" onClick={handleAddQuestion}>
                  Add Question
                </Button>
              </div>
              
              {questions.map((question, index) => (
                <div key={index} className="space-y-4 p-4 border rounded-md">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Question {index + 1}</p>
                    {questions.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Question Text
                    </label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                      placeholder={`Enter question ${index + 1} text...`}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Model Answer
                    </label>
                    <Textarea
                      value={question.model_answer}
                      onChange={(e) => handleQuestionChange(index, 'model_answer', e.target.value)}
                      placeholder={`Enter the ideal answer for question ${index + 1}...`}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="coding">Coding</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="technical">Technical</option>
                        <option value="system-design">System Design</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Difficulty
                      </label>
                      <select
                        value={question.difficulty}
                        onChange={(e) => handleQuestionChange(index, 'difficulty', e.target.value)}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="easy">Easy</option>
                        <option value="normal">Normal</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-red-500">{error}</p>}
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating Question Set...' : 'Create Question Set'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 