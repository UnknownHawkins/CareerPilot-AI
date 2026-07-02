import { generateGroqContent } from '../config/groq';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  ResumeAnalysisResult, 
  InterviewQuestion, 
  InterviewFeedback, 
  JobMatchAnalysis, 
  CareerRoadmap, 
  LinkedInAnalysis 
} from '../types/ai';

export { 
  ResumeAnalysisResult, 
  InterviewQuestion, 
  InterviewFeedback, 
  JobMatchAnalysis, 
  CareerRoadmap, 
  LinkedInAnalysis 
};

export class GroqService {
  /**
   * Resume Analysis using Groq (Llama 3.3 / Llama 3.2 Vision)
   */
  static async analyzeResume(
    resumeText: string,
    targetRole?: string,
    industry?: string,
    imageData?: { buffer: Buffer; mimeType: string }
  ): Promise<ResumeAnalysisResult> {
    try {
      const prompt = `
        Analyze the following resume and provide a professional ATS (Applicant Tracking System) evaluation.
        ${targetRole ? `Target Role: ${targetRole}` : ''}
        ${industry ? `Industry: ${industry}` : ''}
        
        Resume Content:
        ${resumeText}
        
        Return a comprehensive JSON object:
        {
          "atsScore": number (0-100),
          "overallFeedback": "Executive summary of the resume's effectiveness",
          "strengths": ["List of key professional strengths"],
          "weaknesses": ["Detailed list of errors or missing elements"],
          "sections": {
            "contactInfo": { "score": number, "feedback": "Evaluation of contact details", "suggestions": ["How to fix/improve"] },
            "summary": { "score": number, "feedback": "Evaluation of professional summary", "suggestions": ["How to fix/improve"] },
            "experience": { "score": number, "feedback": "Evaluation of work history", "suggestions": ["How to fix/improve"] },
            "education": { "score": number, "feedback": "Evaluation of educational background", "suggestions": ["How to fix/improve"] },
            "skills": { 
               "score": number, 
               "feedback": "Evaluation of skills section", 
               "suggestions": ["How to fix/improve"],
               "detectedSkills": ["List of found skills"],
               "missingSkills": ["List of critical missing skills for the target role"]
            }
          },
          "keywordOptimization": { 
             "score": number, 
             "industryKeywords": ["Relevant keywords found"], 
             "missingKeywords": ["Keywords to add for ATS optimization"], 
             "suggestions": ["Specific instructions for keywords"] 
          },
          "formatting": { "score": number, "feedback": "Visual/Structure evaluation", "suggestions": ["Fixes for layout/parsing"] },
          "skillGapAnalysis": { 
             "currentSkills": ["skills the candidate has"], 
             "recommendedSkills": ["skills they should learn"], 
             "prioritySkills": ["top 3 skills to learn now"] 
          },
          "improvementSuggestions": ["List of actionable steps to fix errors and increase score"],
          "jobSuggestions": [
             { "title": "Job Title", "company": "Example Company", "reasoning": "Why this matches", "matchScore": number }
          ],
          "matchingRoles": ["Recommended career paths"]
        }
      `;

      const result = await generateGroqContent<ResumeAnalysisResult>(
        [{ role: 'user', content: prompt }],
        { 
          jsonMode: true,
          imageData,
          temperature: 0.1 
        }
      );

      // Ensure all required fields exist to satisfy Mongoose and prevent runtime errors
      return {
        atsScore: result.atsScore ?? 0,
        overallFeedback: result.overallFeedback || 'No feedback provided',
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        improvementSuggestions: result.improvementSuggestions || [],
        jobSuggestions: result.jobSuggestions || [],
        matchingRoles: result.matchingRoles || [],
        skillGapAnalysis: {
          currentSkills: result.skillGapAnalysis?.currentSkills || [],
          recommendedSkills: result.skillGapAnalysis?.recommendedSkills || [],
          prioritySkills: result.skillGapAnalysis?.prioritySkills || [],
        },
        sections: {
          contactInfo: {
            score: result.sections?.contactInfo?.score ?? 0,
            feedback: result.sections?.contactInfo?.feedback ?? 'N/A',
            suggestions: result.sections?.contactInfo?.suggestions ?? [],
          },
          summary: {
            score: result.sections?.summary?.score ?? 0,
            feedback: result.sections?.summary?.feedback ?? 'N/A',
            suggestions: result.sections?.summary?.suggestions ?? [],
          },
          experience: {
            score: result.sections?.experience?.score ?? 0,
            feedback: result.sections?.experience?.feedback ?? 'N/A',
            suggestions: result.sections?.experience?.suggestions ?? [],
          },
          education: {
            score: result.sections?.education?.score ?? 0,
            feedback: result.sections?.education?.feedback ?? 'N/A',
            suggestions: result.sections?.education?.suggestions ?? [],
          },
          skills: {
            score: result.sections?.skills?.score ?? 0,
            feedback: result.sections?.skills?.feedback ?? 'N/A',
            suggestions: result.sections?.skills?.suggestions ?? [],
            detectedSkills: result.sections?.skills?.detectedSkills ?? [],
            missingSkills: result.sections?.skills?.missingSkills ?? [],
          },
        },
        keywordOptimization: {
          score: result.keywordOptimization?.score ?? 0,
          industryKeywords: result.keywordOptimization?.industryKeywords ?? [],
          missingKeywords: result.keywordOptimization?.missingKeywords ?? [],
          suggestions: result.keywordOptimization?.suggestions ?? [],
        },
        formatting: {
          score: result.formatting?.score ?? 0,
          feedback: result.formatting?.feedback ?? 'N/A',
          suggestions: result.formatting?.suggestions ?? [],
        },
      };
    } catch (error) {
      logger.error('Groq AI specialized task error:', error);
      throw error;
    }
  }

  /**
   * Transcribe Audio using Groq Whisper
   */
  static async transcribeAudio(audioBuffer: Buffer, originalName: string = 'audio.webm'): Promise<string> {
    try {
      const { getGroqClient } = await import('../config/groq');
      const client = getGroqClient();
      
      // Groq requires a file-like object or a stream
      const file = new File([audioBuffer], originalName, { type: 'audio/webm' });

      const transcription = await client.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3',
        response_format: 'text',
      });

      return transcription as unknown as string;
    } catch (error) {
      logger.error('Groq Transcription Error:', error);
      throw new Error('Failed to transcribe audio answer');
    }
  }

  /**
   * Generate Interview Questions
   */
  static async generateInterviewQuestions(
    jobRole: string,
    experienceLevel: string,
    industry: string,
    skills: string[],
    count: number = 5
  ): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${count} interview questions for a ${experienceLevel} level ${jobRole} position in the ${industry} industry.
        Candidate Skills: ${(skills || []).join(', ')}
        
        Return a JSON object with a "questions" key containing the array:
        {
          "questions": [
            {
              "id": "string",
              "question": "string",
              "category": "technical" | "behavioral" | "situational" | "culture_fit" | "leadership",
              "difficulty": "easy" | "medium" | "hard",
              "expectedAnswerPoints": ["string"]
            }
          ]
        }
      `;

      const response = await generateGroqContent<{ questions: InterviewQuestion[] }>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.7 }
      );

      return response.questions || [];
    } catch (error) {
      logger.error('Groq Interview Questions Generation Error:', error);
      throw error;
    }
  }

  /**
   * Analyze Interview Answer
   */
  static async analyzeInterviewAnswer(
    question: string,
    answer: string,
    expectedPoints: string[],
    category: string
  ): Promise<InterviewFeedback> {
    try {
      const prompt = `
        Analyze this interview answer.
        Question: ${question}
        Answer: ${answer}
        Expected Points: ${(expectedPoints || []).join(', ')}
        Category: ${category}
        
        Return a JSON object:
        {
          "score": number,
          "strengths": ["string"],
          "improvements": ["string"],
          "modelAnswer": "string"
        }
      `;

      return await generateGroqContent<InterviewFeedback>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.3 }
      );
    } catch (error) {
      logger.error('Groq Interview Answer Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Analyze LinkedIn Profile
   */
  static async analyzeLinkedInProfile(
    headline: string,
    summary: string,
    experience: any[],
    skills: string[],
    targetRole?: string,
    profileUrl?: string
  ): Promise<LinkedInAnalysis> {
    try {
      const prompt = `
        Analyze this LinkedIn profile and provide optimization suggestions.
        ${profileUrl ? `LinkedIn Profile URL: ${profileUrl}` : ''}
        Headline: ${headline}
        Summary: ${summary}
        Experience: ${JSON.stringify(experience)}
        Skills: ${(skills || []).join(', ')}
        ${targetRole ? `Target Role: ${targetRole}` : ''}

        IMPORTANT: If only a LinkedIn Profile URL is provided without other details, provide high-level optimization best practices and general advice tailored to the profile's presence if possible, otherwise provide general elite LinkedIn profile advice.
        
        Return a JSON object:
        {
          "headline": { "score": number, "feedback": "string", "suggestions": ["string"] },
          "summary": { "score": number, "feedback": "string", "suggestions": ["string"] },
          "experience": { "score": number, "feedback": "string", "suggestions": ["string"] },
          "skills": { 
            "score": number, 
            "feedback": "string", 
            "suggestions": ["string"], 
            "topSkills": ["string"], 
            "missingSkills": ["string"] 
          },
          "overallScore": number,
          "optimizationTips": ["string"],
          "keywordDensity": { "keywords": ["string"], "score": number }
        }
      `;

      const result = await generateGroqContent<LinkedInAnalysis>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.4 }
      );

      // Defensive mapping to ensure consistency
      return {
        headline: {
          score: result.headline?.score ?? 0,
          feedback: result.headline?.feedback ?? 'No feedback',
          suggestions: result.headline?.suggestions || [],
        },
        summary: {
          score: result.summary?.score ?? 0,
          feedback: result.summary?.feedback ?? 'No feedback',
          suggestions: result.summary?.suggestions || [],
        },
        experience: {
          score: result.experience?.score ?? 0,
          feedback: result.experience?.feedback ?? 'No feedback',
          suggestions: result.experience?.suggestions || [],
        },
        skills: {
          score: result.skills?.score ?? 0,
          feedback: result.skills?.feedback ?? 'No feedback',
          suggestions: result.skills?.suggestions || [],
          topSkills: result.skills?.topSkills || [],
          missingSkills: result.skills?.missingSkills || [],
        },
        overallScore: result.overallScore ?? 0,
        optimizationTips: result.optimizationTips || [],
        keywordDensity: {
          keywords: result.keywordDensity?.keywords || [],
          score: result.keywordDensity?.score ?? 0,
        },
      };
    } catch (error) {
      logger.error('Groq LinkedIn Analysis Error:', error);
      throw error;
    }
  }

  /**
   * Generate Career Roadmap
   */
  static async generateCareerRoadmap(
    currentRole: string,
    targetRole: string,
    currentLevel: string,
    targetLevel: string,
    industry: string,
    currentSkills: string[],
    yearsOfExperience: number
  ): Promise<CareerRoadmap> {
    try {
      const prompt = `
        Generate a personalized career roadmap from ${currentRole} (${currentLevel}) to ${targetRole} (${targetLevel}) in ${industry}.
        Current Skills: ${(currentSkills || []).join(', ')}
        Years of Experience: ${yearsOfExperience}
        
        Return a JSON object:
        {
          "targetSkills": ["string"],
          "skillGaps": [
            {
              "skill": "string",
              "importance": "critical" | "important" | "nice_to_have",
              "currentProficiency": number,
              "targetProficiency": number,
              "learningResources": ["string"]
            }
          ],
          "milestones": [
            {
              "id": "string",
              "title": "string",
              "description": "string",
              "category": "skill" | "certification" | "experience" | "project" | "networking",
              "priority": "high" | "medium" | "low",
              "estimatedDuration": "string",
              "resources": [{ "title": "string", "type": "course" | "book" | "article" | "video" | "project", "url": "string", "provider": "string" }],
              "dependencies": ["string"]
            }
          ],
          "timeline": {
            "shortTerm": ["string"],
            "midTerm": ["string"],
            "longTerm": ["string"]
          },
          "estimatedTimeToGoal": "string"
        }
      `;

      const result = await generateGroqContent<CareerRoadmap>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.5 }
      );

      const VALID_CATEGORIES = ['skill', 'certification', 'experience', 'project', 'networking'] as const;
      const VALID_PRIORITIES = ['high', 'medium', 'low'] as const;
      const VALID_RESOURCE_TYPES = ['course', 'book', 'article', 'video', 'project'] as const;
      const VALID_IMPORTANCE = ['critical', 'important', 'nice_to_have'] as const;

      const sanitizeCategory = (v: string) =>
        (VALID_CATEGORIES as readonly string[]).includes(v) ? v as typeof VALID_CATEGORIES[number] : 'skill';
      const sanitizePriority = (v: string) =>
        (VALID_PRIORITIES as readonly string[]).includes(v) ? v as typeof VALID_PRIORITIES[number] : 'medium';
      const sanitizeResourceType = (v: string) =>
        (VALID_RESOURCE_TYPES as readonly string[]).includes(v) ? v as typeof VALID_RESOURCE_TYPES[number] : 'article';
      const sanitizeImportance = (v: string) =>
        (VALID_IMPORTANCE as readonly string[]).includes(v) ? v as typeof VALID_IMPORTANCE[number] : 'important';

      // Defensive mapping to ensure roadmap consistency
      return {
        targetSkills: result.targetSkills || [],
        skillGaps: (result.skillGaps || []).map(gap => ({
          skill: gap.skill || 'Unknown Skill',
          importance: sanitizeImportance(gap.importance || ''),
          currentProficiency: gap.currentProficiency || 0,
          targetProficiency: gap.targetProficiency || 100,
          learningResources: gap.learningResources || [],
        })),
        milestones: (result.milestones || []).map(m => ({
          id: m.id || uuidv4(),
          title: m.title || 'Untitled Milestone',
          description: m.description || '',
          category: sanitizeCategory(m.category || ''),
          priority: sanitizePriority(m.priority || ''),
          estimatedDuration: m.estimatedDuration || 'TBD',
          resources: (m.resources || []).map(r => ({
            title: r.title || 'Resource',
            type: sanitizeResourceType(r.type || ''),
            url: r.url || '',
            provider: r.provider || '',
          })),
          dependencies: m.dependencies || [],
        })),
        timeline: {
          shortTerm: result.timeline?.shortTerm || [],
          midTerm: result.timeline?.midTerm || [],
          longTerm: result.timeline?.longTerm || [],
        },
        estimatedTimeToGoal: result.estimatedTimeToGoal || 'Unknown',
      };
    } catch (error) {
      logger.error('Groq Roadmap Error:', error);
      throw error;
    }
  }

  /**
   * Analyze Job Match
   */
  static async analyzeJobMatch(
    userSkills: string[],
    userExperience: number,
    userEducation: string[],
    jobDescription: string,
    requiredSkills: string[],
    preferredSkills: string[],
    experienceRequired: { min: number; max: number },
    educationRequired: string[]
  ): Promise<JobMatchAnalysis> {
    try {
      const prompt = `
        Analyze job match for the following candidate and job description.
        Candidate: Skills: ${(userSkills || []).join(', ')}, Exp: ${userExperience}y, Edu: ${(userEducation || []).join(', ')}
        Job: Desc: ${jobDescription}, Required Skills: ${(requiredSkills || []).join(', ')}, Preferred: ${(preferredSkills || []).join(', ')}
        
        Return a JSON object:
        {
          "matchScore": number,
          "skillMatch": { "score": number, "matchedSkills": ["string"], "missingSkills": ["string"], "additionalSkills": ["string"] },
          "experienceMatch": { "score": number, "userYears": number, "requiredYears": number, "feedback": "string" },
          "educationMatch": { "score": number, "matched": boolean, "feedback": "string" },
          "overallFit": { "score": number, "feedback": "string", "strengths": ["string"], "gaps": ["string"] },
          "recommendations": { "shouldApply": boolean, "confidence": number, "reasoning": "string", "suggestedActions": ["string"] }
        }
      `;

      const result = await generateGroqContent<JobMatchAnalysis>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.3 }
      );

      // Defensive mapping to ensure job match consistency
      return {
        matchScore: result.matchScore ?? 0,
        skillMatch: {
          score: result.skillMatch?.score ?? 0,
          matchedSkills: result.skillMatch?.matchedSkills || [],
          missingSkills: result.skillMatch?.missingSkills || [],
          additionalSkills: result.skillMatch?.additionalSkills || [],
        },
        experienceMatch: {
          score: result.experienceMatch?.score ?? 0,
          userYears: result.experienceMatch?.userYears ?? 0,
          requiredYears: result.experienceMatch?.requiredYears ?? 0,
          feedback: result.experienceMatch?.feedback || 'No feedback',
        },
        educationMatch: {
          score: result.educationMatch?.score ?? 0,
          matched: result.educationMatch?.matched ?? false,
          feedback: result.educationMatch?.feedback || 'No feedback',
        },
        overallFit: {
          score: result.overallFit?.score ?? 0,
          feedback: result.overallFit?.feedback || 'No feedback',
          strengths: result.overallFit?.strengths || [],
          gaps: result.overallFit?.gaps || [],
        },
        recommendations: {
          shouldApply: result.recommendations?.shouldApply ?? false,
          confidence: result.recommendations?.confidence ?? 0,
          reasoning: result.recommendations?.reasoning || 'No reasoning',
          suggestedActions: result.recommendations?.suggestedActions || [],
        },
      };
    } catch (error) {
      logger.error('Groq Job Match Error:', error);
      throw error;
    }
  }

  /**
   * Generate Overall Interview Feedback
   */
  static async generateOverallInterviewFeedback(
    questions: { question: string; answer: string; feedback: InterviewFeedback }[]
  ): Promise<{
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    communicationSkills: number;
    technicalKnowledge: number;
    problemSolving: number;
    culturalFit: number;
    recommendations: string[];
  }> {
    try {
      const prompt = `
        Provide overall feedback for this mock interview.
        Responses: ${JSON.stringify(questions)}
        
        Return a JSON object:
        {
          "summary": "string",
          "strengths": ["string"],
          "areasForImprovement": ["string"],
          "communicationSkills": number,
          "technicalKnowledge": number,
          "problemSolving": number,
          "culturalFit": number,
          "recommendations": ["string"]
        }
      `;

      return await generateGroqContent(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.4 }
      );
    } catch (error) {
      logger.error('Groq Overall Feedback Error:', error);
      throw error;
    }
  }

  /**
   * Find matching jobs based on criteria
   */
  static async findJobs(
    criteria: {
      role: string;
      location?: string;
      jobType?: string;
      salaryMin?: number;
      skills?: string[];
    }
  ): Promise<any[]> {
    try {
      const prompt = `
        Find and generate 5 realistic job opportunities matching the following criteria. 
        Role: ${criteria.role}
        Location: ${criteria.location || 'Anywhere'}
        Job Type: ${criteria.jobType || 'Full-time'}
        Salary Min: ${criteria.salaryMin || 'Competitive'}
        Focus Skills: ${criteria.skills?.join(', ') || 'General'}
        
        For each job, provide:
        1. Job Title
        2. Company Name
        3. Real-looking job description (2-3 sentences)
        4. Match score (between 60 and 95)
        5. Salary range
        6. Location
        7. Primary registration/apply link (Realistic fake or real career page link)

        Return a JSON object with a "jobs" array:
        {
          "jobs": [
            {
              "jobTitle": "string",
              "company": "string",
              "jobDescription": "string",
              "matchScore": number,
              "salary": "string",
              "location": "string",
              "applyLink": "string",
              "requiredSkills": ["string"],
              "industry": "string"
            }
          ]
        }
      `;

      const response = await generateGroqContent<{ jobs: any[] }>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.7 }
      );

      return response.jobs || [];
    } catch (error) {
      logger.error('Groq Find Jobs Error:', error);
      throw error;
    }
  }

  /**
   * Generate Cover Letter
   */
  static async generateCoverLetter(
    resumeText: string,
    jobTitle: string,
    companyName: string,
    jobDescription: string
  ): Promise<{ coverLetter: string }> {
    try {
      const prompt = `
        You are an expert career coach and executive recruiter. Write a highly tailored, professional cover letter for the following job application.
        
        Applicant Resume:
        ${resumeText || 'No resume provided. Write a generic but professional template.'}
        
        Job Title: ${jobTitle}
        Company Name: ${companyName}
        Job Description:
        ${jobDescription}
        
        Instructions:
        1. Write a compelling, ATS-friendly cover letter in Markdown format.
        2. Highlight how the applicant's experience from their resume perfectly matches the job description.
        3. Keep it between 300 to 450 words.
        4. Do NOT include placeholders like [Your Name], use information from the resume if available.
        
        Return a JSON object:
        {
          "coverLetter": "string (The markdown formatted cover letter)"
        }
      `;

      const result = await generateGroqContent<{ coverLetter: string }>(
        [{ role: 'user', content: prompt }],
        { jsonMode: true, temperature: 0.5 }
      );

      return {
        coverLetter: result.coverLetter || 'Failed to generate cover letter.',
      };
    } catch (error) {
      logger.error('Groq Cover Letter Generation Error:', error);
      throw error;
    }
  }
}
