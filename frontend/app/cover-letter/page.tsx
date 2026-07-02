'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import { coverLetterApi, resumeApi } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Briefcase, Download, Trash } from 'lucide-react';

export default function CoverLetterPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
      fetchResumes();
    }
  }, [isAuthenticated]);

  const fetchHistory = async () => {
    try {
      const res = await coverLetterApi.getHistory() as any;
      setCoverLetters(res.data || []);
    } catch (err) {
      console.error('Failed to fetch cover letters', err);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await resumeApi.getAnalyses() as any;
      setResumes(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedResumeId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch resumes', err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !companyName || !jobDescription) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await coverLetterApi.generate({
        jobTitle,
        companyName,
        jobDescription,
        resumeId: selectedResumeId || undefined
      });
      setSuccess('Cover letter generated successfully!');
      setJobTitle('');
      setCompanyName('');
      setJobDescription('');
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate cover letter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await coverLetterApi.delete(id);
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete cover letter', err);
    }
  };

  const downloadTxt = (content: string, company: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Cover_Letter_${company.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container max-w-6xl py-8 space-y-8">
        <div>
        <h1 className="text-3xl font-bold mb-2">AI Cover Letter Generator</h1>
        <p className="text-muted-foreground">Generate tailored cover letters based on your resume and target job.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Enter the details of the job you are applying for.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                
                {error && <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>}
                {success && <div className="text-green-500 text-sm p-3 bg-green-50 dark:bg-green-900/20 rounded-md">{success}</div>}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Resume (Optional)</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                  >
                    <option value="">Do not use resume</option>
                    {resumes.map(r => (
                      <option key={r._id} value={r._id}>
                        {new Date(r.createdAt).toLocaleDateString()} - Resume
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title</label>
                  <Input 
                    placeholder="e.g. Software Engineer" 
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input 
                    placeholder="e.g. Google" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Description</label>
                  <Textarea 
                    placeholder="Paste the job description here..." 
                    className="h-32"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Cover Letter
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold">Your Cover Letters</h2>
          {coverLetters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">No cover letters yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Fill out the form to generate your first AI-powered cover letter.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {coverLetters.map((cl) => (
                <Card key={cl._id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">{cl.jobTitle} at {cl.companyName}</CardTitle>
                      <CardDescription>Generated on {new Date(cl.createdAt).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => downloadTxt(cl.generatedContent, cl.companyName)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(cl._id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap mt-4 h-64 overflow-y-auto">
                      {cl.generatedContent}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
