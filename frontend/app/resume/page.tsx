'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Progress, Badge, Skeleton } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks';
import { resumeApi } from '@/lib/api';
import { cn, getScoreColor, getScoreBgColor } from '../../lib/utils';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalysisResult {
  _id: string;
  atsScore: number;
  originalFileName: string;
  analysis: {
    overallFeedback: string;
    strengths: string[];
    weaknesses: string[];
    sections: {
      contactInfo: { score: number; feedback: string; suggestions: string[] };
      summary: { score: number; feedback: string; suggestions: string[] };
      experience: { score: number; feedback: string; suggestions: string[] };
      education: { score: number; feedback: string; suggestions: string[] };
      skills: { score: number; feedback: string; suggestions: string[]; detectedSkills: string[]; missingSkills: string[] };
    };
    keywordOptimization: { score: number; industryKeywords: string[]; missingKeywords: string[]; suggestions: string[] };
    formatting: { score: number; feedback: string; suggestions: string[] };
  };
  skillGapAnalysis: {
    currentSkills: string[];
    recommendedSkills: string[];
    prioritySkills: string[];
  };
  improvementSuggestions: string[];
  jobSuggestions: {
    title: string;
    company: string;
    reasoning: string;
    matchScore: number;
  }[];
  matchingRoles: string[];
}

export default function ResumePage() {
  const router = useRouter();
  const toast = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [uploadMode, setUploadMode] = useState('file');

  const handleAnalyzeText = async () => {
    if (!resumeText) {
      toast.error('Missing information', 'Please provide resume text or email content');
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('resumeText', resumeText);
      formData.append('targetRole', targetRole);
      formData.append('industry', industry);

      const response = await resumeApi.upload(formData) as any;
      
      setAnalysis(response.data);
      toast.success('Analysis complete', 'Your content has been analyzed successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to analyze content';
      toast.error('Limit Reached', message + '. Upgrade to Pro in the sidebar for more analyses!');
      if (error.response?.status === 403) {
        setTimeout(() => router.push('/pricing'), 3000);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type', 'Please upload a PDF, Word document, or Image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Maximum file size is 5MB');
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('targetRole', targetRole);
      formData.append('industry', industry);

      const response = await resumeApi.upload(formData) as any;
      setAnalysis(response.data);
      toast.success('Analysis complete', 'Your resume has been analyzed successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to analyze resume';
      toast.error('Limit Reached', message + '. Upgrade to Pro in the sidebar for more analyses!');
      if (error.response?.status === 403) {
        setTimeout(() => router.push('/pricing'), 3000);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [targetRole, industry, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isAnalyzing,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Resume Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Get personalized ATS feedback and job recommendations
          </p>
        </div>

        {/* Upload Section */}
        {!analysis && (
          <Card>
            <CardHeader>
              <CardTitle>Resume Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Senior Software Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
              </div>

              <Tabs defaultValue="file" value={uploadMode} onValueChange={setUploadMode}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="file">Upload File (PDF/DOC/Image)</TabsTrigger>
                  <TabsTrigger value="text">Paste Email or Text Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="file">
                  <div
                    {...getRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                      isAnalyzing && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <input {...getInputProps()} />
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <div>
                          <p className="font-medium">Analyzing your resume...</p>
                          <p className="text-sm text-muted-foreground">This may take a moment</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse (PDF, Word, or Image up to 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="text">
                  <div className="space-y-4">
                    <Label htmlFor="resumeText">Paste your resume or email content below</Label>
                    <textarea
                      id="resumeText"
                      className="w-full h-64 p-4 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Paste your content here..."
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                    <Button 
                      className="w-full" 
                      onClick={handleAnalyzeText}
                      disabled={isAnalyzing || !resumeText || !targetRole || !industry}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : 'Analyze Content'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
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
              {/* Score Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ATS Score Analysis</CardTitle>
                    <Button variant="outline" onClick={() => setAnalysis(null)}>
                      Analyze Another
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
                          strokeDasharray={`${analysis.atsScore * 3.52} 352`}
                          className={getScoreColor(analysis.atsScore)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{analysis.atsScore}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Overall Feedback</h3>
                      <p className="text-muted-foreground">{analysis.analysis.overallFeedback}</p>
                      
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm">{analysis.analysis.strengths.length} Strengths</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                          <span className="text-sm">{analysis.analysis.weaknesses.length} Areas to Improve</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section Scores */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analysis.analysis.sections).map(([key, section]: [string, any]) => (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <Badge variant={section.score >= 70 ? 'success' : section.score >= 50 ? 'warning' : 'destructive'}>
                          {section.score}%
                        </Badge>
                      </div>
                      <Progress value={section.score} variant={section.score >= 70 ? 'success' : section.score >= 50 ? 'warning' : 'danger'} />
                      <p className="text-sm text-muted-foreground mt-2">{section.feedback}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Suggestions */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Improvement Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(analysis?.improvementSuggestions || []).map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Matching Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(analysis?.matchingRoles || []).map((role) => (
                        <Badge key={role} variant="secondary">{role}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Job Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    AI-Powered Job Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(analysis?.jobSuggestions || []).map((job, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-muted/30 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-primary">{job.title}</h4>
                          <Badge variant="outline" className="bg-background">
                            {job.matchScore}% Match
                          </Badge>
                        </div>
                        <p className="text-xs font-medium mb-2">{job.company}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-4">
                          {job.reasoning}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs flex items-center justify-center gap-2"
                          onClick={() => window.open(`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.title + ' ' + job.company)}`, '_blank')}
                        >
                          Find & Apply <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skills Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Skills Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-sm mb-3">Detected Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {(analysis?.analysis?.sections?.skills?.detectedSkills || []).map((skill) => (
                          <Badge key={skill} variant="success">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-3">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {(analysis?.analysis?.keywordOptimization?.missingKeywords || []).map((skill) => (
                          <Badge key={skill} variant="destructive">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-3">Priority Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {(analysis?.skillGapAnalysis?.prioritySkills || []).map((skill) => (
                          <Badge key={skill} variant="warning">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

