// types.ts

import { ObjectId } from 'mongodb';

// User Entity
interface User {
    _id: ObjectId;
    auth0id: string;
    name: string;
    email: string;
    password: string; 
    role?: string; 
    created_at: Date;
    updated_at: Date;
  }
  
  // Question Entity
  interface Question {
    _id: ObjectId;
    text: string;
    type: string; 
    question_set_id: ObjectId; 
    model_answer: string;
    difficulty?: string; 
    tags?: string[]; 
    created_at: Date;
    updated_at: Date;
  }
  
  // QuestionSet Entity
  interface QuestionSet {
    _id: ObjectId;
    name: string;
    description?: string; // Optional: Description of the question set
    questions: ObjectId[]; // Array of Question IDs
    created_at: Date;
    updated_at: Date;
  }
  
  // Interview Entity
  interface Interview {
    _id: ObjectId;
    user_id: ObjectId; // Changed from string to ObjectId
    company_id?: ObjectId;
    position: string;
    question_set_id: ObjectId;
    status: string;
    start_time: Date;
    end_time?: Date;
    created_at: Date;
    updated_at: Date;
  }
  
  // Answer Entity
  interface Answer {
    _id: ObjectId;
    interview_id: ObjectId; // Reference to Interview
    question_id: ObjectId; // Reference to Question
    text: string; // User's answer text
    audio_url?: string; // Optional: URL to audio recording
    video_url?: string; // Optional: URL to video recording
    created_at: Date;
  }
  
  // Result Entity
  interface Result {
    _id: ObjectId;
    user_id: ObjectId; // Reference to User
    interview_id: ObjectId; // Reference to Interview
    overall_score: number; // Overall score for the interview
    score_breakdown: {
      technical: number;
      communication: number;
      problem_solving: number;
      confidence: number;
    };
    questions: {
      question_id: ObjectId; // Reference to Question
      question_text: string; // Text of the question
      user_answer: string; // User's answer to the question
      score: number; // Score for this specific question
      feedback?: string; // Optional: Feedback for the user's answer
    }[];
    created_at: Date;
    updated_at: Date;
  }
  
  // Company Entity (Optional)
  interface Company {
    _id: ObjectId;
    name: string;
    description?: string; // Optional: Description of the company
    created_at: Date;
    updated_at: Date;
  }
  
  // Export all interfaces
  export type {
    User,
    Question,
    QuestionSet,
    Interview,
    Answer,
    Result,
    Company,
  };