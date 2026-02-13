'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks';
import { interviewApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Play,
  CheckCircle,
  Clock,
  Trophy,
  Lightbulb,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const experienceLevels = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (2-5 years)' },
  { value: 'senior', label: 'Senior Level (5-10 years)' },
  { value: 'executive', label: 'Executive (10+ years)' },
];

interface InterviewSession {
  _id: string;
  jobRole: string;
  experienceLevel: string;
  industry: string;
  status: string;

  overallScore?: number;

  feedback?: {
    summary?: string;
    strengths: string[];
    areasForImprovement: string[];
  };

  questions: {
    id: string;
    question: string;
    category: string;
    difficulty: string;
    userAnswer?: string;
    aiFeedback?: {
      score: number;
      strengths: string[];
      improvements: string[];
      modelAnswer: string;
    };
  }[];
}


export default function InterviewPage() {
  const toast = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Form state
  const [jobRole, setJobRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [industry, setIndustry] = useState('');
  const [skills, setSkills] = useState('');

  const createSession = async () => {
    if (!jobRole || !experienceLevel || !industry) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
  const response = (await interviewApi.createSession({
    jobRole,
    experienceLevel,
    industry,
    skills: skills.split(',').map(s => s.trim()).filter(Boolean),
  })) as any;

  setSession(response.data);
  toast.success('Interview session created!');
} catch (error: any) {
  toast.error('Failed to create session', error.response?.data?.message);
} finally {
  setIsCreating(false);
}

  };

  const submitAnswer = async () => {
    if (!answer.trim() || !session) return;

    setIsSubmitting(true);
    try {
      const currentQuestion = session.questions[currentQuestionIndex];
      await interviewApi.submitAnswer(session._id, {
        questionId: currentQuestion.id,
        answer,
        timeTaken: 0,
      });

      // Update local state
      const updatedQuestions = [...session.questions];
      updatedQuestions[currentQuestionIndex] = {
        ...currentQuestion,
        userAnswer: answer,
      };
      setSession({ ...session, questions: updatedQuestions });

      // Move to next question or complete
      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setAnswer('');
      } else {
        await completeSession();
      }
    } catch (error: any) {
      toast.error('Failed to submit answer', error.response?.data?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSession = async () => {
    if (!session) return;
    try {
      const response : any = await interviewApi.completeSession(session._id);
      setSession(response.data);
      setSessionComplete(true);
      toast.success('Interview completed! Check your feedback.');
    } catch (error: any) {
      toast.error('Failed to complete session', error.response?.data?.message);
    }
  };

  const resetSession = () => {
    setSession(null);
    setCurrentQuestionIndex(0);
    setAnswer('');
    setSessionComplete(false);
    setJobRole('');
    setExperienceLevel('');
    setIndustry('');
    setSkills('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">AI Mock Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Practice with AI-generated questions and get detailed feedback
          </p>
        </div>

        {/* Setup Form */}
        {!session && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Start a New Interview Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobRole">Target Job Role *</Label>
                  <Input
                    id="jobRole"
                    placeholder="e.g., Software Engineer"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level *</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Your Skills (comma separated)</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., JavaScript, React, Node.js"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={createSession}
                isLoading={isCreating}
                className="w-full"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Interview
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Interview Session */}
        <AnimatePresence>
          {session && !sessionComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Interview in Progress</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {session.jobRole} • {experienceLevels.find(l => l.value === session.experienceLevel)?.label}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      Question {currentQuestionIndex + 1} of {session.questions.length}
                    </Badge>
                  </div>
                  <Progress 
                    value={((currentQuestionIndex) / session.questions.length) * 100} 
                    className="mt-4"
                  />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Question */}
                  <div className="bg-muted rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline">
                        {session.questions[currentQuestionIndex].category}
                      </Badge>
                      <Badge variant={
                        session.questions[currentQuestionIndex].difficulty === 'easy' ? 'success' :
                        session.questions[currentQuestionIndex].difficulty === 'medium' ? 'warning' : 'destructive'
                      }>
                        {session.questions[currentQuestionIndex].difficulty}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-medium">
                      {session.questions[currentQuestionIndex].question}
                    </h3>
                  </div>

                  {/* Answer Input */}
                  <div className="space-y-2">
                    <Label>Your Answer</Label>
                    <textarea
                      className="w-full min-h-[150px] p-4 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Type your answer here..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button
                      onClick={submitAnswer}
                      isLoading={isSubmitting}
                      disabled={!answer.trim()}
                    >
                      {currentQuestionIndex < session.questions.length - 1 ? (
                        <>
                          Next Question
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          Complete Interview
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Complete */}
        <AnimatePresence>
          {sessionComplete && session && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      Interview Complete!
                    </CardTitle>
                    <Button variant="outline" onClick={resetSession}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Start New Session
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-6xl font-bold text-primary mb-2">
                      {session.overallScore}%
                    </div>
                    <p className="text-muted-foreground">Overall Score</p>
                  </div>

                  {session.feedback && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">Summary</h4>
                        <p className="text-muted-foreground">{session.feedback.summary}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {session.feedback.strengths.map((strength, i) => (
                              <li key={i} className="text-sm text-muted-foreground">• {strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            Areas to Improve
                          </h4>
                          <ul className="space-y-1">
                            {session.feedback.areasForImprovement.map((area, i) => (
                              <li key={i} className="text-sm text-muted-foreground">• {area}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
