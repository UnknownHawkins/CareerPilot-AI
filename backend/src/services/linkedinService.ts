import { GroqService, LinkedInAnalysis } from './groqService';
import { db } from '../config/database';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';
import { hasProAccess } from '../middleware/auth';
import { SubscriptionService } from './subscriptionService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiResponse';

interface ExperienceEntry {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export class LinkedInService {
  static async analyzeProfile(
    userId: string,
    headline: string,
    summary: string,
    experience: ExperienceEntry[],
    skills: string[],
    targetRole?: string,
    profileUrl?: string
  ): Promise<LinkedInAnalysis> {
    try {
      const [user] = await db.select().from(users).where(eq(users._id, userId)).limit(1);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      const hasAccess = await SubscriptionService.checkFeatureAccess(userId, 'linkedInReview');
      if (!hasAccess) {
        throw ApiError.forbidden('LinkedIn analysis limit reached. Upgrade to Pro for unlimited reviews.');
      }

      // If only URL is provided, we'd ideally scrape it. 
      // For now, we'll inform the AI to provide a general analysis or tips if text is sparse.
      
      const analysis = await GroqService.analyzeLinkedInProfile(
        headline || '',
        summary || '',
        experience || [],
        skills || [],
        targetRole,
        profileUrl
      );

      // Increment usage for free users
      if (!hasProAccess(user)) {
        await SubscriptionService.incrementUsage(userId, 'linkedinReview');
      }

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
        Analyze this LinkedIn headline: "${headline}"
        Return a JSON object:
        { "score": number, "feedback": "string", "suggestions": ["string"], "keywords": ["string"] }
      `;

      const result = await GroqService.analyzeLinkedInProfile(headline, '', [], [], ''); 
      return {
        score: result.headline.score,
        feedback: result.headline.feedback,
        suggestions: result.headline.suggestions,
        keywords: result.keywordDensity?.keywords || []
      };
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
      const result = await GroqService.analyzeLinkedInProfile('', summary, [], [], '');
      return {
        score: result.summary.score,
        feedback: result.summary.feedback,
        suggestions: result.summary.suggestions,
        wordCount: summary.split(' ').length,
        readability: 'Standard',
      };
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
        Generate 5 optimized LinkedIn headlines for: ${currentTitle}, Skills: ${(skills || []).join(', ')}, Industry: ${industry}
        Return a JSON object with a "headlines" key.
      `;

      const result = await GroqService.analyzeLinkedInProfile(currentTitle, '', [], skills, ''); 
      return (result as any).headlines || [
        currentTitle, // Fallback
        `Senior ${currentTitle} | ${(skills || []).slice(0, 2).join(' | ')}`,
        `${currentTitle} Expert | Specialized in ${industry}`,
        `Leading ${currentTitle} Professional`,
        `${currentTitle} | Problem Solver | ${industry} Specialist`
      ]; 
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
      const result = await GroqService.analyzeLinkedInProfile('', 'Generate a summary', experience, skills, targetRole);
      return {
        summary: result.summary.feedback, // Groq will provide the summary text here based on prompt
        tips: result.optimizationTips,
      };
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
      const result = await GroqService.analyzeLinkedInProfile('', '', [], currentSkills, targetRole);
      return {
        topSkillsToAdd: result.skills.missingSkills,
        skillsToReorder: result.skills.topSkills,
        skillsToRemove: [],
        reasoning: result.skills.feedback,
      };
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

