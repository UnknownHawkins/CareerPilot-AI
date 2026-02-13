import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from './logger';

export const parsePDF = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    logger.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
};

export const parseDOCX = async (buffer: Buffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
};

export const parseResume = async (
  buffer: Buffer,
  fileType: string
): Promise<string> => {
  try {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return await parsePDF(buffer);
      case 'docx':
      case 'doc':
        return await parseDOCX(buffer);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    logger.error('Resume parsing error:', error);
    throw error;
  }
};

export const cleanExtractedText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .trim();
};

export const extractContactInfo = (text: string): {
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
} => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/;
  const websiteRegex = /(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?/;
  
  return {
    email: text.match(emailRegex)?.[0],
    phone: text.match(phoneRegex)?.[0],
    linkedin: text.match(linkedinRegex)?.[0],
    website: text.match(websiteRegex)?.[0],
  };
};

export const extractSkills = (text: string): string[] => {
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
    'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js',
    'node.js', 'express', 'nestjs', 'django', 'flask', 'spring',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'git', 'jenkins', 'github actions', 'gitlab ci',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch',
    'data analysis', 'sql', 'pandas', 'numpy', 'tableau', 'power bi',
    'agile', 'scrum', 'kanban', 'jira', 'confluence',
    'leadership', 'communication', 'problem solving', 'teamwork',
  ];
  
  const textLower = text.toLowerCase();
  const foundSkills: string[] = [];
  
  commonSkills.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });
  
  return foundSkills;
};
