import { generateContent, generateStructuredContent } from '../config/gemini';
import { logger } from '../utils/logger';

// Resume Analysis Types
export interface ResumeAnalysisResult {
  atsScore: number;
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  sections: {
    contactInfo: SectionAnalysis;
    summary: SectionAnalysis;
    experience: SectionAnalysis;
    education: SectionAnalysis;
    skills: SkillsAnalysis;
  };
  keywordOptimization: KeywordAnalysis;
  formatting: FormattingAnalysis;
  skillGapAnalysis: {
    currentSkills: string[];
    recommendedSkills: string[];
    prioritySkills: string[];
  };
  improvementSuggestions: string[];
}

interface SectionAnalysis {
  score: number;
  feedback: string;
  suggestions: string[];
}

interface SkillsAnalysis extends SectionAnalysis {
  detectedSkills: string[];
  missingSkills: string[];
}

interface KeywordAnalysis {
  score: number;
  industryKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

interface FormattingAnalysis {
  score: number;
  feedback: string;
  suggestions: string[];
}

// Interview Types
export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'culture_fit' | 'leadership';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswerPoints: string[];
}

export interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

// LinkedIn Types
export interface LinkedInAnalysis {
  headline: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  summary: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  experience: {
    score: number;
    feedback: string;
    suggestions: string[];
  };
  skills: {
    score: number;
    feedback: string;
    suggestions: string[];
    topSkills: string[];
    missingSkills: string[];
  };
  overallScore: number;
  optimizationTips: string[];
  keywordDensity: {
    keywords: string[];
    score: number;
  };
}

// Roadmap Types
export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'certification' | 'experience' | 'project' | 'networking';
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  resources: {
    title: string;
    type: 'course' | 'book' | 'article' | 'video' | 'project';
    url?: string;
    provider?: string;
  }[];
  dependencies: string[];
}

export interface CareerRoadmap {
  targetSkills: string[];
  skillGaps: {
    skill: string;
    importance: 'critical' | 'important' | 'nice_to_have';
    currentProficiency: number;
    targetProficiency: number;
    learningResources: string[];
  }[];
  milestones: RoadmapMilestone[];
  timeline: {
    shortTerm: string[];
    midTerm: string[];
    longTerm: string[];
  };
  estimatedTimeToGoal: string;
}

// Job Match Types
export interface JobMatchAnalysis {
  matchScore: number;
  skillMatch: {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    additionalSkills: string[];
  };
  experienceMatch: {
    score: number;
    userYears: number;
    requiredYears: number;
    feedback: string;
  };
  educationMatch: {
    score: number;
    matched: boolean;
    feedback: string;
  };
  overallFit: {
    score: number;
    feedback: string;
    strengths: string[];
    gaps: string[];
  };
  recommendations: {
    shouldApply: boolean;
    confidence: number;
    reasoning: string;
    suggestedActions: string[];
  };
}

export class GeminiService {
  // Resume Analysis
  static async analyzeResume(
    resumeText: string,
    targetRole?: string,
    industry?: string
  ): Promise<ResumeAnalysisResult> {
    try {
      const prompt = `
        Analyze the following resume and provide a detailed ATS (Applicant Tracking System) analysis.
        
        ${targetRole ? `Target Role: ${targetRole}` : ''}
        ${industry ? `Industry: ${industry}` : ''}
        
        Resume Text:
        ${resumeText}
        
        Provide a comprehensive analysis in the following JSON format:
        {
          "atsScore": number (0-100),
          "overallFeedback": string,
          "strengths": string[],
          "weaknesses": string[],
          "sections": {
            "contactInfo": { "score": number, "feedback": string, "suggestions": string[] },
            "summary": { "score": number, "feedback": string, "suggestions": string[] },
            "experience": { "score": number, "feedback": string, "suggestions": string[] },
            "education": { "score": number, "feedback": string, "suggestions": string[] },
            "skills": { "score": number, "feedback": string, "suggestions": string[], "detectedSkills": string[], "missingSkills": string[] }
          },
          "keywordOptimization": { "score": number, "industryKeywords": string[], "missingKeywords": string[], "suggestions": string[] },
          "formatting": { "score": number, "feedback": string, "suggestions": string[] },
          "skillGapAnalysis": { "currentSkills": string[], "recommendedSkills": string[], "prioritySkills": string[] },
          "improvementSuggestions": string[]
        }
        
        Be thorough and specific in your analysis. Consider ATS compatibility, keyword optimization, and industry best practices.
      `;

      const result = await generateStructuredContent<ResumeAnalysisResult>(prompt, {}, {
        temperature: 0.3,
        maxOutputTokens: 4096,
      });

      return result;
    } catch (error) {
      logger.error('Resume analysis error:', error);
      throw new Error('Failed to analyze resume');
    }
  }

  // Generate Interview Questions
  static async generateInterviewQuestions(
    jobRole: string,
    experienceLevel: string,
    industry: string,
    skills: string[],
    questionCount: number = 5
  ): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${questionCount} interview questions for a ${experienceLevel} level ${jobRole} position in the ${industry} industry.
        
        Candidate Skills: ${skills.join(', ')}
        
        Include a mix of:
        - Technical questions
        - Behavioral questions
        - Situational questions
        - Culture fit questions
        
        Provide questions in the following JSON format:
        [
          {
            "id": string (unique identifier),
            "question": string,
            "category": "technical" | "behavioral" | "situational" | "culture_fit" | "leadership",
            "difficulty": "easy" | "medium" | "hard",
            "expectedAnswerPoints": string[] (key points the answer should cover)
          }
        ]
        
        Make questions relevant to the role and experience level. Include challenging but fair questions.
      `;

      const result = await generateStructuredContent<InterviewQuestion[]>(prompt, {}, {
        temperature: 0.7,
        maxOutputTokens: 4096,
      });

      return result;
    } catch (error) {
      logger.error('Interview questions generation error:', error);
      throw new Error('Failed to generate interview questions');
    }
  }

  // Analyze Interview Answer
  static async analyzeInterviewAnswer(
    question: string,
    answer: string,
    expectedPoints: string[],
    category: string
  ): Promise<InterviewFeedback> {
    try {
      const prompt = `
        Analyze the following interview answer and provide detailed feedback.
        
        Question: ${question}
        
        Candidate Answer: ${answer}
        
        Expected Answer Points: ${expectedPoints.join(', ')}
        
        Question Category: ${category}
        
        Provide feedback in the following JSON format:
        {
          "score": number (0-100),
          "strengths": string[],
          "improvements": string[],
          "modelAnswer": string (an example of a strong answer)
        }
        
        Be constructive and specific in your feedback. Consider communication skills, technical accuracy, and relevance to the question.
      `;

      const result = await generateStructuredContent<InterviewFeedback>(prompt, {}, {
        temperature: 0.4,
        maxOutputTokens: 2048,
      });

      return result;
    } catch (error) {
      logger.error('Interview answer analysis error:', error);
      throw new Error('Failed to analyze interview answer');
    }
  }

  // LinkedIn Profile Analysis
  static async analyzeLinkedInProfile(
    headline: string,
    summary: string,
    experience: any[],
    skills: string[],
    targetRole?: string
  ): Promise<LinkedInAnalysis> {
    try {
      const prompt = `
        Analyze the following LinkedIn profile and provide optimization suggestions.
        
        Headline: ${headline}
        
        Summary: ${summary}
        
        Experience: ${JSON.stringify(experience)}
        
        Skills: ${skills.join(', ')}
        
        ${targetRole ? `Target Role: ${targetRole}` : ''}
        
        Provide analysis in the following JSON format:
        {
          "headline": { "score": number, "feedback": string, "suggestions": string[] },
          "summary": { "score": number, "feedback": string, "suggestions": string[] },
          "experience": { "score": number, "feedback": string, "suggestions": string[] },
          "skills": { "score": number, "feedback": string, "suggestions": string[], "topSkills": string[], "missingSkills": string[] },
          "overallScore": number,
          "optimizationTips": string[],
          "keywordDensity": { "keywords": string[], "score": number }
        }
        
        Focus on LinkedIn best practices, keyword optimization, and professional branding.
      `;

      const result = await generateStructuredContent<LinkedInAnalysis>(prompt, {}, {
        temperature: 0.4,
        maxOutputTokens: 4096,
      });

      return result;
    } catch (error) {
      logger.error('LinkedIn analysis error:', error);
      throw new Error('Failed to analyze LinkedIn profile');
    }
  }

  // Generate Career Roadmap
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
        Generate a personalized career roadmap for someone transitioning from ${currentRole} (${currentLevel}) to ${targetRole} (${targetLevel}) in the ${industry} industry.
        
        Current Skills: ${currentSkills.join(', ')}
        Years of Experience: ${yearsOfExperience}
        
        Provide the roadmap in the following JSON format:
        {
          "targetSkills": string[],
          "skillGaps": [
            {
              "skill": string,
              "importance": "critical" | "important" | "nice_to_have",
              "currentProficiency": number (0-100),
              "targetProficiency": number (0-100),
              "learningResources": string[]
            }
          ],
          "milestones": [
            {
              "id": string,
              "title": string,
              "description": string,
              "category": "skill" | "certification" | "experience" | "project" | "networking",
              "priority": "high" | "medium" | "low",
              "estimatedDuration": string,
              "resources": [{ "title": string, "type": "course" | "book" | "article" | "video" | "project", "url": string, "provider": string }],
              "dependencies": string[]
            }
          ],
          "timeline": {
            "shortTerm": string[], (0-3 months)
            "midTerm": string[], (3-6 months)
            "longTerm": string[] (6-12 months)
          },
          "estimatedTimeToGoal": string
        }
        
        Create a realistic, actionable roadmap with specific milestones and resources.
      `;

      const result = await generateStructuredContent<CareerRoadmap>(prompt, {}, {
        temperature: 0.5,
        maxOutputTokens: 8192,
      });

      return result;
    } catch (error) {
      logger.error('Career roadmap generation error:', error);
      throw new Error('Failed to generate career roadmap');
    }
  }

  // Analyze Job Match
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
        Analyze how well a candidate matches a job position.
        
        Candidate Profile:
        - Skills: ${userSkills.join(', ')}
        - Experience: ${userExperience} years
        - Education: ${userEducation.join(', ')}
        
        Job Requirements:
        - Description: ${jobDescription}
        - Required Skills: ${requiredSkills.join(', ')}
        - Preferred Skills: ${preferredSkills.join(', ')}
        - Experience Required: ${experienceRequired.min}-${experienceRequired.max} years
        - Education Required: ${educationRequired.join(', ')}
        
        Provide analysis in the following JSON format:
        {
          "matchScore": number (0-100),
          "skillMatch": { "score": number, "matchedSkills": string[], "missingSkills": string[], "additionalSkills": string[] },
          "experienceMatch": { "score": number, "userYears": number, "requiredYears": number, "feedback": string },
          "educationMatch": { "score": number, "matched": boolean, "feedback": string },
          "overallFit": { "score": number, "feedback": string, "strengths": string[], "gaps": string[] },
          "recommendations": { "shouldApply": boolean, "confidence": number, "reasoning": string, "suggestedActions": string[] }
        }
        
        Be objective and thorough in your analysis. Consider both hard requirements and nice-to-have qualifications.
      `;

      const result = await generateStructuredContent<JobMatchAnalysis>(prompt, {}, {
        temperature: 0.3,
        maxOutputTokens: 4096,
      });

      return result;
    } catch (error) {
      logger.error('Job match analysis error:', error);
      throw new Error('Failed to analyze job match');
    }
  }

  // Generate Overall Interview Feedback
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
        Generate overall feedback for a completed mock interview based on individual question responses.
        
        Question Responses:
        ${JSON.stringify(questions)}
        
        Provide overall feedback in the following JSON format:
        {
          "summary": string (overall assessment),
          "strengths": string[],
          "areasForImprovement": string[],
          "communicationSkills": number (0-100),
          "technicalKnowledge": number (0-100),
          "problemSolving": number (0-100),
          "culturalFit": number (0-100),
          "recommendations": string[]
        }
        
        Provide constructive, actionable feedback that will help the candidate improve.
      `;

      const result = await generateStructuredContent(prompt, {}, {
        temperature: 0.4,
        maxOutputTokens: 4096,
      });

      return result;
    } catch (error) {
      logger.error('Overall interview feedback error:', error);
      throw new Error('Failed to generate overall interview feedback');
    }
  }
}
