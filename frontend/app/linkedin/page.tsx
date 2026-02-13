'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks';
import { linkedinApi } from '@/lib/api';
import { cn, getScoreColor } from '@/lib/utils';
import {
  Linkedin,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LinkedInAnalysis {
  headline: { score: number; feedback: string; suggestions: string[] };
  summary: { score: number; feedback: string; suggestions: string[] };
  experience: { score: number; feedback: string; suggestions: string[] };
  skills: { score: number; feedback: string; suggestions: string[]; topSkills: string[]; missingSkills: string[] };
  overallScore: number;
  optimizationTips: string[];
  keywordDensity: { keywords: string[]; score: number };
}

export default function LinkedInPage() {
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Form state
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const analyzeProfile = async () => {
    if (!headline && !summary && !skills) {
      toast.error('Please fill in at least one field');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = (await linkedinApi.analyzeProfile({
        headline,
        summary,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        targetRole,
      })) as any;
      setAnalysis(response.data);
      toast.success('Profile analyzed successfully!');
    } catch (error: any) {
      toast.error('Analysis failed', error.response?.data?.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">LinkedIn Profile Review</h1>
          <p className="text-muted-foreground mt-1">
            Optimize your LinkedIn profile to attract recruiters and opportunities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Analysis</TabsTrigger>
            <TabsTrigger value="checklist">Optimization Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Input Form */}
            {!analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5" />
                    Enter Your Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input
                      id="headline"
                      placeholder="e.g., Senior Software Engineer at TechCorp | Full-Stack Developer"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {headline.length}/220 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="summary">About / Summary</Label>
                    <textarea
                      id="summary"
                      className="w-full min-h-[150px] p-4 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Write a compelling summary about yourself..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {summary.length}/2600 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      placeholder="e.g., JavaScript, React, Node.js, Python"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetRole">Target Role (Optional)</Label>
                    <Input
                      id="targetRole"
                      placeholder="e.g., Engineering Manager"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={analyzeProfile}
                    isLoading={isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Analysis Results */}
            <AnimatePresence>
              {analysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Overall Score */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Profile Optimization Score</CardTitle>
                        <Button variant="outline" onClick={() => setAnalysis(null)}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Analyze Again
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-8">
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="12"
                              className="text-muted"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="56"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="12"
                              strokeLinecap="round"
                              strokeDasharray={`${analysis.overallScore * 3.52} 352`}
                              className={getScoreColor(analysis.overallScore)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold">{analysis.overallScore}%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">Optimization Tips</h3>
                          <ul className="space-y-2">
                            {analysis.optimizationTips.slice(0, 3).map((tip, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Scores */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Headline</h4>
                          <Badge variant={analysis.headline.score >= 70 ? 'success' : analysis.headline.score >= 50 ? 'warning' : 'destructive'}>
                            {analysis.headline.score}%
                          </Badge>
                        </div>
                        <Progress value={analysis.headline.score} variant={analysis.headline.score >= 70 ? 'success' : analysis.headline.score >= 50 ? 'warning' : 'danger'} />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.headline.feedback}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Summary</h4>
                          <Badge variant={analysis.summary.score >= 70 ? 'success' : analysis.summary.score >= 50 ? 'warning' : 'destructive'}>
                            {analysis.summary.score}%
                          </Badge>
                        </div>
                        <Progress value={analysis.summary.score} variant={analysis.summary.score >= 70 ? 'success' : analysis.summary.score >= 50 ? 'warning' : 'danger'} />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.summary.feedback}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Experience</h4>
                          <Badge variant={analysis.experience.score >= 70 ? 'success' : analysis.experience.score >= 50 ? 'warning' : 'destructive'}>
                            {analysis.experience.score}%
                          </Badge>
                        </div>
                        <Progress value={analysis.experience.score} variant={analysis.experience.score >= 70 ? 'success' : analysis.experience.score >= 50 ? 'warning' : 'danger'} />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.experience.feedback}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Skills</h4>
                          <Badge variant={analysis.skills.score >= 70 ? 'success' : analysis.skills.score >= 50 ? 'warning' : 'destructive'}>
                            {analysis.skills.score}%
                          </Badge>
                        </div>
                        <Progress value={analysis.skills.score} variant={analysis.skills.score >= 70 ? 'success' : analysis.skills.score >= 50 ? 'warning' : 'danger'} />
                        <p className="text-sm text-muted-foreground mt-2">{analysis.skills.feedback}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Improvement Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-2">Headline Suggestions</h4>
                          <ul className="space-y-2">
                            {analysis.headline.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Summary Suggestions</h4>
                          <ul className="space-y-2">
                            {analysis.summary.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Missing Skills to Add</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.skills.missingSkills.map((skill) => (
                              <Badge key={skill} variant="destructive">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>LinkedIn Optimization Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Profile Essentials</h4>
                    <ul className="space-y-2">
                      {[
                        'Professional headshot photo',
                        'Custom background banner',
                        'Compelling headline with keywords',
                        'Detailed About section (40+ words)',
                        'Complete Experience section',
                        'Education details filled out',
                        '50+ skills listed',
                        '3+ recommendations',
                        'Custom LinkedIn URL',
                      ].map((item, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Activity & Engagement</h4>
                    <ul className="space-y-2">
                      {[
                        'Post regularly (2-3x per week)',
                        'Engage with others content',
                        'Join relevant industry groups',
                        'Share industry insights',
                        'Request recommendations',
                      ].map((item, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
