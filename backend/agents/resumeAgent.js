/**
 * Agent 5: Resume Analyzer Agent
 * Uses Groq API with fallback models, robust JSON repair, and error logging.
 */

const Groq = require('groq-sdk');

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3.6-27b'
];

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Invalid Grok/Groq API Key: GROQ_API_KEY is missing in backend .env file.');
  }
  return new Groq({ apiKey });
}

function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('JSON parse failed: Empty response received from AI model.');
  }

  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    console.warn('[resumeAgent] Direct JSON parse failed, attempting JSON repair...');
    // Attempt basic JSON repairs: trailing commas, unquoted keys
    try {
      let repaired = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*\]/g, ']')
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(repaired);
    } catch (repairErr) {
      console.error('[resumeAgent] JSON repair failed. Raw output preview:', cleaned.slice(0, 300));
      throw new Error(`JSON parse failed: Response could not be parsed as JSON. (${firstErr.message})`);
    }
  }
}

async function callGroqWithFallback(systemPrompt, userContent, maxTokens = 3000, temperature = 0.2) {
  const groq = getGroq();
  let lastError = null;

  for (const model of MODELS) {
    console.log(`[resumeAgent] Attempting AI request with model: ${model}...`);
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const rawText = completion.choices[0]?.message?.content || '';
      console.log(`[resumeAgent] Successfully received AI response from ${model} (length: ${rawText.length} chars).`);
      return extractJson(rawText);
    } catch (err) {
      console.warn(`[resumeAgent] Model ${model} failed: ${err.message}`);
      lastError = err;
      if (err.status === 401) {
        throw new Error('Invalid Grok API key. Please check GROQ_API_KEY in backend .env file.');
      }
      // Continue to next model on 429 rate limit or timeout
    }
  }

  throw new Error(`Grok API call failed across all models. (${lastError?.message || 'Unknown error'})`);
}

const PARSER_SYSTEM_PROMPT = `You are an expert AI Resume Parser & Recruiter Data Extractor.
Parse the provided resume plain text and extract ALL available details into strict JSON.
If a field is missing, return an empty array [], empty object {}, or empty string "".
Do NOT invent or hallucinate information not present in the text.

Respond ONLY in strict JSON:
{
  "personalInfo": {
    "fullName": "Name",
    "email": "Email",
    "phone": "Phone",
    "address": "Address",
    "dob": "Date of birth if present"
  },
  "professionalLinks": {
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "leetcode": "LeetCode URL or username",
    "hackerrank": "HackerRank URL",
    "codechef": "CodeChef URL",
    "codeforces": "Codeforces URL",
    "portfolio": "Portfolio Website URL",
    "website": "Personal Website URL"
  },
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "department": "Computer Science & Engineering",
      "college": "College Name",
      "university": "University Name",
      "cgpa": "8.5 / 10",
      "gradYear": "2025"
    }
  ],
  "skills": {
    "programmingLanguages": ["Python", "JavaScript", "C++"],
    "frameworks": ["React", "Express", "Node.js"],
    "libraries": ["Recharts", "Redux", "Pandas"],
    "databases": ["PostgreSQL", "SQLite", "MongoDB"],
    "cloud": ["AWS", "Firebase"],
    "devops": ["Docker", "Git", "GitHub Actions"],
    "embedded": ["C", "Arduino", "ARM"],
    "aiMl": ["PyTorch", "TensorFlow", "Scikit-Learn"],
    "softSkills": ["Problem Solving", "Team Leadership", "Communication"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "Project summary and key technical implementations",
      "techUsed": ["React", "Node.js"],
      "duration": "3 Months"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "role": "Software Developer Intern",
      "duration": "Jun 2024 - Aug 2024",
      "responsibilities": ["Task 1", "Task 2"]
    }
  ],
  "internships": [
    {
      "company": "Company Name",
      "role": "Role",
      "duration": "Duration",
      "details": "Summary of work"
    }
  ],
  "certifications": [
    {
      "title": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "date": "2024"
    }
  ],
  "achievements": ["Achievement 1", "Achievement 2"],
  "publications": ["Publication title & conference/journal"],
  "languagesKnown": ["English", "Spanish"],
  "extracurricularActivities": ["Activity 1"],
  "volunteerExperience": ["Volunteer role 1"]
}`;

const ATS_FEEDBACK_PROMPT = `You are a Senior Technical Recruiter & Applicant Tracking System (ATS) Expert.
Analyze the parsed resume JSON data and produce:
1. ATS Sub-Scores (integer 0-100 for each category):
   - overallScore
   - formatScore
   - keywordScore
   - skillsScore
   - projectScore
   - experienceScore
   - educationScore
   - grammarScore
   - readabilityScore
   - recruiterFriendliness
2. Detailed AI Resume Feedback:
   - strengths: list of strong points
   - weaknesses: list of weak points or missing elements
   - missingKeywords: high-impact placement/tech keywords missing
   - missingSkills: recommended industry skills missing
   - formattingSuggestions: layout & structural improvement tips
   - grammarSuggestions: tone, action verbs, and grammar fixes
   - projectSuggestions: ways to elevate project descriptions (metrics, impact)
   - rewriteSuggestions: example rewritten bullet points
   - actionableImprovements: top prioritized step-by-step actions

Respond ONLY in strict JSON:
{
  "atsScores": {
    "overallScore": 82,
    "formatScore": 85,
    "keywordScore": 78,
    "skillsScore": 88,
    "projectScore": 80,
    "experienceScore": 75,
    "educationScore": 90,
    "grammarScore": 92,
    "readabilityScore": 88,
    "recruiterFriendliness": 84
  },
  "feedback": {
    "strengths": ["Clear technical stack listed", "Relevant projects"],
    "weaknesses": ["Lack of quantifiable impact metrics (e.g. % improvement)"],
    "missingKeywords": ["REST APIs", "CI/CD", "Unit Testing", "System Design"],
    "missingSkills": ["Docker", "TypeScript"],
    "formattingSuggestions": ["Use standard bullet points with strong action verbs"],
    "grammarSuggestions": ["Start bullet points with past-tense action verbs (e.g., 'Implemented', 'Architected')"],
    "projectSuggestions": ["Add live links or GitHub repository URLs for top projects"],
    "rewriteSuggestions": ["Instead of 'Worked on backend', write 'Designed and deployed Express.js microservices handling 10k+ requests'"],
    "actionableImprovements": ["Add measurable metrics to project bullets", "Include LinkedIn and GitHub profile links"]
  }
}`;

/**
 * Parse raw text of a resume into structured JSON.
 */
async function parseResumeWithAI(rawText) {
  console.log(`[parseResumeWithAI] Starting parsing for resume text (length: ${rawText.length} chars)...`);
  return await callGroqWithFallback(PARSER_SYSTEM_PROMPT, `Resume Text:\n\n${rawText.slice(0, 12000)}`, 4096, 0.2);
}

/**
 * Generate ATS scores and feedback from parsed resume data.
 */
async function analyzeATSWithAI(parsedResume) {
  console.log('[analyzeATSWithAI] Starting ATS analysis...');
  return await callGroqWithFallback(ATS_FEEDBACK_PROMPT, `Parsed Resume Data:\n\n${JSON.stringify(parsedResume, null, 2)}`, 3000, 0.4);
}

/**
 * Match a resume against a given Job Description.
 */
async function matchJobDescription(parsedResume, jobDescription) {
  const prompt = `Candidate Resume Data:\n${JSON.stringify(parsedResume, null, 2)}\n\nJob Description:\n${jobDescription}\n\nCompare the resume against the job description and evaluate candidate fit.\nRespond ONLY in strict JSON with fields: matchPercentage, matchingSkills, missingSkills, missingKeywords, recommendedImprovements, tailoredSummary.`;
  return await callGroqWithFallback('You are an AI Job Matching & ATS Alignment Specialist.', prompt, 2000, 0.3);
}

/**
 * Interactive Q&A chat about the student's resume.
 */
async function chatAboutResume(parsedResume, feedback, messageHistory, userPrompt) {
  const groq = getGroq();
  const systemMessage = `You are a supportive, expert AI Resume & Career Coach.\nStudent Resume:\n${JSON.stringify(parsedResume, null, 2)}\n\nATS Feedback:\n${JSON.stringify(feedback, null, 2)}`;
  const messages = [
    { role: 'system', content: systemMessage },
    ...(messageHistory || []).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: userPrompt }
  ];

  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({ model, messages, temperature: 0.7, max_tokens: 1024 });
      return completion.choices[0]?.message?.content || 'I could not process your request at this moment.';
    } catch (_) {}
  }
  return 'I could not process your request at this moment. Please check network connection.';
}

module.exports = {
  parseResumeWithAI,
  analyzeATSWithAI,
  matchJobDescription,
  chatAboutResume,
};
