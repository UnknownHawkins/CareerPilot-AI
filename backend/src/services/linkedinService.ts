import { GeminiService, LinkedInAnalysis } from './geminiService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export class LinkedInService {
  // Analyze LinkedIn profile
  static async analyzeProfile(
    userId: string,
    headline: string,
    summary: string,
    experience: ExperienceEntry[],
    skills: string[],
    targetRole?: string
  ): Promise<LinkedInAnalysis> {
    try {
      // Validate input
      if (!headline && !summary && experience.length === 0 && skills.length === 0) {
        throw ApiError.badRequest('Please provide at least some profile information to analyze');
      }

      // Analyze with Gemini
      const analysis = await GeminiService.analyzeLinkedInProfile(
        headline,
        summary,
        experience,
        skills,
        targetRole
      );

      logger.info(`LinkedIn profile analyzed for user ${userId}`);

      return analysis;
    } catch (error) {
      logger.error('LinkedIn profile analysis error:', error);
      throw error;
    }
  }

  // Quick headline analysis
  static async analyzeHeadline(headline: string): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
    keywords: string[];
  }> {
    try {
      const prompt = `
        Analyze this LinkedIn headline and provide feedback:
        "${headline}"
        
        Provide analysis in JSON format:
        {
          "score": number (0-100),
          "feedback": string,
          "suggestions": string[],
          "keywords": string[]
        }
        
        Consider: clarity, keywords, value proposition, and professionalism.
      `;

      const result = await GeminiService['generateStructuredContent']<{
        score: number;
        feedback: string;
        suggestions: string[];
        keywords: string[];
      }>(prompt, {}, { temperature: 0.4 });

      return result;
    } catch (error) {
      logger.error('Headline analysis error:', error);
      throw new Error('Failed to analyze headline');
    }
  }

  // Quick summary analysis
  static async analyzeSummary(summary: string): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
    wordCount: number;
    readability: string;
  }> {
    try {
      const prompt = `
        Analyze this LinkedIn summary and provide feedback:
        "${summary}"
        
        Provide analysis in JSON format:
        {
          "score": number (0-100),
          "feedback": string,
          "suggestions": string[],
          "wordCount": number,
          "readability": string
        }
        
        Consider: length, storytelling, keywords, achievements, and call-to-action.
      `;

      const result = await GeminiService['generateStructuredContent']<{
        score: number;
        feedback: string;
        suggestions: string[];
        wordCount: number;
        readability: string;
      }>(prompt, {}, { temperature: 0.4 });

      return result;
    } catch (error) {
      logger.error('Summary analysis error:', error);
      throw new Error('Failed to analyze summary');
    }
  }

  // Generate optimized headline suggestions
  static async generateHeadlineSuggestions(
    currentTitle: string,
    skills: string[],
    industry: string
  ): Promise<string[]> {
    try {
      const prompt = `
        Generate 5 optimized LinkedIn headline suggestions for someone with:
        - Current Title: ${currentTitle}
        - Skills: ${skills.join(', ')}
        - Industry: ${industry}
        
        Return as a JSON array of strings.
        
        Make headlines compelling, keyword-rich, and under 220 characters.
      `;

      const result = await GeminiService['generateStructuredContent']<string[]>(
        prompt,
        {},
        { temperature: 0.7 }
      );

      return result;
    } catch (error) {
      logger.error('Headline suggestions error:', error);
      throw new Error('Failed to generate headline suggestions');
    }
  }

  // Generate optimized summary
  static async generateSummary(
    experience: ExperienceEntry[],
    skills: string[],
    achievements: string[],
    targetRole?: string
  ): Promise<{
    summary: string;
    tips: string[];
  }> {
    try {
      const prompt = `
        Generate an optimized LinkedIn summary for someone with:
        - Experience: ${JSON.stringify(experience)}
        - Skills: ${skills.join(', ')}
        - Key Achievements: ${achievements.join(', ')}
        ${targetRole ? `- Target Role: ${targetRole}` : ''}
        
        Provide in JSON format:
        {
          "summary": string (compelling, keyword-rich summary under 2600 characters),
          "tips": string[] (tips for further optimization)
        }
        
        Include: hook, value proposition, key achievements, and call-to-action.
      `;

      const result = await GeminiService['generateStructuredContent']<{
        summary: string;
        tips: string[];
      }>(prompt, {}, { temperature: 0.6 });

      return result;
    } catch (error) {
      logger.error('Summary generation error:', error);
      throw new Error('Failed to generate summary');
    }
  }

  // Skill optimization suggestions
  static async optimizeSkills(
    currentSkills: string[],
    targetRole: string,
    industry: string
  ): Promise<{
    topSkillsToAdd: string[];
    skillsToReorder: string[];
    skillsToRemove: string[];
    reasoning: string;
  }> {
    try {
      const prompt = `
        Optimize LinkedIn skills for someone targeting ${targetRole} in ${industry}.
        
        Current Skills: ${currentSkills.join(', ')}
        
        Provide optimization in JSON format:
        {
          "topSkillsToAdd": string[],
          "skillsToReorder": string[] (in priority order),
          "skillsToRemove": string[],
          "reasoning": string
        }
        
        Focus on skills that are in-demand and relevant to the target role.
      `;

      const result = await GeminiService['generateStructuredContent']<{
        topSkillsToAdd: string[];
        skillsToReorder: string[];
        skillsToRemove: string[];
        reasoning: string;
      }>(prompt, {}, { temperature: 0.5 });

      return result;
    } catch (error) {
      logger.error('Skill optimization error:', error);
      throw new Error('Failed to optimize skills');
    }
  }

  // Calculate profile completion score
  static calculateProfileCompletion(profile: {
    headline?: string;
    summary?: string;
    experience?: ExperienceEntry[];
    education?: any[];
    skills?: string[];
    recommendations?: number;
    connections?: number;
  }): {
    score: number;
    completed: string[];
    missing: string[];
    suggestions: string[];
  } {
    const completed: string[] = [];
    const missing: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Headline (15 points)
    if (profile.headline && profile.headline.length > 10) {
      score += 15;
      completed.push('Headline');
    } else {
      missing.push('Headline');
      suggestions.push('Add a compelling headline with your value proposition');
    }

    // Summary (20 points)
    if (profile.summary && profile.summary.length > 100) {
      score += 20;
      completed.push('Summary');
    } else {
      missing.push('Summary');
      suggestions.push('Write a detailed summary highlighting your expertise');
    }

    // Experience (20 points)
    if (profile.experience && profile.experience.length > 0) {
      score += 20;
      completed.push('Experience');
      
      // Check for detailed descriptions
      const hasDetailedDescriptions = profile.experience.some(
        exp => exp.description && exp.description.length > 50
      );
      if (!hasDetailedDescriptions) {
        suggestions.push('Add detailed descriptions to your experience entries');
      }
    } else {
      missing.push('Experience');
      suggestions.push('Add your work experience with detailed descriptions');
    }

    // Education (10 points)
    if (profile.education && profile.education.length > 0) {
      score += 10;
      completed.push('Education');
    } else {
      missing.push('Education');
      suggestions.push('Add your educational background');
    }

    // Skills (15 points)
    if (profile.skills && profile.skills.length >= 5) {
      score += 15;
      completed.push('Skills');
    } else {
      missing.push('Skills');
      suggestions.push('Add at least 5 relevant skills');
    }

    // Recommendations (10 points)
    if (profile.recommendations && profile.recommendations >= 2) {
      score += 10;
      completed.push('Recommendations');
    } else {
      missing.push('Recommendations');
      suggestions.push('Request recommendations from colleagues');
    }

    // Connections (10 points)
    if (profile.connections && profile.connections >= 500) {
      score += 10;
      completed.push('Connections');
    } else {
      suggestions.push('Grow your network to 500+ connections');
    }

    return {
      score,
      completed,
      missing,
      suggestions,
    };
  }
}
