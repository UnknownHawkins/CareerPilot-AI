'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks';
import { jobMatchApi } from '@/lib/api';
import { cn, getMatchCategory } from '@/lib/utils';
import {
  Briefcase,
  Plus,
  MapPin,
  DollarSign,
  Building2,
  TrendingUp,
  CheckCircle,
  X,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const jobTypes = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

const applicationStatuses = [
  { value: 'saved', label: 'Saved', color: 'bg-gray-500' },
  { value: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { value: 'interviewing', label: 'Interviewing', color: 'bg-yellow-500' },
  { value: 'offered', label: 'Offered', color: 'bg-green-500' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { value: 'hired', label: 'Hired', color: 'bg-purple-500' },
];

interface JobMatch {
  _id: string;
  jobTitle: string;
  company: string;
  location: { city?: string; country?: string; remote: boolean; hybrid: boolean };
  salary?: { min: number; max: number; currency: string };
  matchScore: number;
  matchAnalysis: {
    skillMatch: { score: number; matchedSkills: string[]; missingSkills: string[] };
    overallFit: { score: number; feedback: string; strengths: string[]; gaps: string[] };
  };
  applicationStatus: string;
  aiRecommendations: { shouldApply: boolean; confidence: number; reasoning: string };
}

export default function JobsPage() {
  const toast = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [jobs, setJobs] = useState<JobMatch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    jobDescription: '',
    requiredSkills: '',
    jobType: 'full_time',
    industry: '',
    location: '',
  });

  const handleSubmit = async () => {
    if (!formData.jobTitle || !formData.company || !formData.jobDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = (await jobMatchApi.create({
        ...formData,
        requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        location: { city: formData.location, remote: false, hybrid: false },
        source: 'manual',
      })) as any;
      setJobs([response.data, ...jobs]);
      setShowAddForm(false);
      setFormData({
        jobTitle: '',
        company: '',
        jobDescription: '',
        requiredSkills: '',
        jobType: 'full_time',
        industry: '',
        location: '',
      });
      toast.success('Job added and analyzed!');
    } catch (error: any) {
      toast.error('Failed to add job', error.response?.data?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (jobId: string, status: string) => {
    try {
      await jobMatchApi.updateStatus(jobId, status);
      setJobs(jobs.map(job => 
        job._id === jobId ? { ...job, applicationStatus: status } : job
      ));
      toast.success('Status updated!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Job Matches</h1>
            <p className="text-muted-foreground mt-1">
              Track and analyze job opportunities
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? 'Cancel' : 'Add Job'}
          </Button>
        </div>

        {/* Add Job Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Add New Job</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input
                        placeholder="e.g., Senior Software Engineer"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input
                        placeholder="e.g., TechCorp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input
                        placeholder="e.g., Technology"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g., San Francisco, CA"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Required Skills (comma separated)</Label>
                    <Input
                      placeholder="e.g., JavaScript, React, Node.js"
                      value={formData.requiredSkills}
                      onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Job Description *</Label>
                    <textarea
                      className="w-full min-h-[150px] p-4 rounded-lg border bg-background resize-none"
                      placeholder="Paste the job description here..."
                      value={formData.jobDescription}
                      onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={isSubmitting}>
                      Analyze & Add Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No jobs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first job to get AI-powered match analysis
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => {
              const matchCategory = getMatchCategory(job.matchScore);
              return (
                <Card key={job._id} className="card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{job.jobTitle}</h3>
                          <Badge className={matchCategory.bgColor + ' ' + matchCategory.color}>
                            {matchCategory.label} Match ({job.matchScore}%)
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {job.company}
                          </span>
                          {job.location.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {job.location.city}
                            </span>
                          )}
                        </div>

                        {/* Match Analysis */}
                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">Skill Match</span>
                              <span className="text-sm font-medium">{job.matchAnalysis.skillMatch.score}%</span>
                            </div>
                            <Progress value={job.matchAnalysis.skillMatch.score} className="h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">Overall Fit</span>
                              <span className="text-sm font-medium">{job.matchAnalysis.overallFit.score}%</span>
                            </div>
                            <Progress value={job.matchAnalysis.overallFit.score} className="h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">AI Confidence</span>
                              <span className="text-sm font-medium">{job.aiRecommendations.confidence}%</span>
                            </div>
                            <Progress value={job.aiRecommendations.confidence} className="h-2" />
                          </div>
                        </div>

                        {/* AI Recommendation */}
                        <div className="bg-muted rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium text-sm">AI Recommendation</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{job.aiRecommendations.reasoning}</p>
                        </div>

                        {/* Matched Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.matchAnalysis.skillMatch.matchedSkills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="success" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                          {job.matchAnalysis.skillMatch.missingSkills.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              +{job.matchAnalysis.skillMatch.missingSkills.length} missing
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="ml-4">
                        <Select
                          value={job.applicationStatus}
                          onValueChange={(value) => updateStatus(job._id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {applicationStatuses.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
