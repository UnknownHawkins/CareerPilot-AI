'use client';

import { Card, CardContent, CardHeader, CardTitle, Progress } from '@/components/ui';
import { getScoreColor, getScoreBgColor } from '@/lib/utils';
import { TrendingUp, Target, Award, Zap } from 'lucide-react';

interface ProgressOverviewProps {
  stats: any;
  isLoading: boolean;
}

export function ProgressOverview({ stats, isLoading }: ProgressOverviewProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-2 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const resumeScore = stats?.resume?.averageScore || 0;
  const interviewScore = stats?.interview?.averageScore || 0;
  const roadmapProgress = stats?.roadmap?.overallProgress || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Progress Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resume Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Resume ATS Score</span>
            </div>
            <span className={getScoreColor(resumeScore)}>{resumeScore}%</span>
          </div>
          <Progress value={resumeScore} variant={resumeScore >= 70 ? 'success' : resumeScore >= 50 ? 'warning' : 'danger'} />
          <p className="text-xs text-muted-foreground">
            {resumeScore >= 70 
              ? 'Great job! Your resume is ATS-friendly.' 
              : resumeScore >= 50 
              ? 'Good progress. Keep optimizing your resume.' 
              : 'Your resume needs improvement. Try our analyzer.'}
          </p>
        </div>

        {/* Interview Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Interview Performance</span>
            </div>
            <span className={getScoreColor(interviewScore)}>{interviewScore}%</span>
          </div>
          <Progress value={interviewScore} variant={interviewScore >= 70 ? 'success' : interviewScore >= 50 ? 'warning' : 'danger'} />
          <p className="text-xs text-muted-foreground">
            {interviewScore >= 70 
              ? 'Excellent interview skills!' 
              : interviewScore >= 50 
              ? 'Keep practicing to improve.' 
              : 'Start practicing with mock interviews.'}
          </p>
        </div>

        {/* Roadmap Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Career Roadmap</span>
            </div>
            <span className={getScoreColor(roadmapProgress)}>{roadmapProgress}%</span>
          </div>
          <Progress value={roadmapProgress} variant={roadmapProgress >= 70 ? 'success' : roadmapProgress >= 50 ? 'warning' : 'danger'} />
          <p className="text-xs text-muted-foreground">
            {roadmapProgress >= 70 
              ? 'You\'re almost there! Keep pushing.' 
              : roadmapProgress >= 50 
              ? 'Good progress on your roadmap.' 
              : 'Create a roadmap to track your goals.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
