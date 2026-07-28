/**
 * Agent 6: Opportunity Discovery Agent
 * Groq AI integration with model fallbacks to recommend 10 personalized, real tech opportunities.
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
    throw new Error('GROQ_API_KEY is missing in backend .env file.');
  }
  return new Groq({ apiKey });
}

function extractJson(text) {
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
  }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return JSON.parse(cleaned);
}

const OPPORTUNITY_SYSTEM_PROMPT = `You are a Senior AI Career Advisor for software engineering placement candidates.
Generate 10 real, prestigious, and highly personalized opportunities tailored to the candidate's career goal, role, skill level, and domain.

REAL OPPORTUNITIES TO FEATURE (pick relevant ones):
- Hackathons: MLH Hackathons, Devfolio Hackathons, Smart India Hackathon, Hack2Skill, ETHIndia, Hackmit
- Internships: Microsoft Learn Student Ambassador, Google Software Engineering Internship, Amazon SDE Intern, Meta University, Uber Career Prep
- Open Source: Google Summer of Code (GSoC), LFX Mentorship, Outreachy, GitHub Externship, GirlScript Summer of Code, Red Hat Open Source
- Research & Fellowships: MIT-IBM Watson AI Lab Fellowship, OpenAI Residency, AWS AI Research Grant
- Bootcamps & Certifications: AWS Certified Solutions Architect, Google Cloud Professional AI Engineer, Meta Front-End Certificate, NPTEL Advanced DSA

STRICT CATEGORY NAMES (Each opportunity MUST use ONE of these exact string values for category):
- Hackathons
- Internships
- Coding Contests
- Scholarships
- Research Programs
- Open Source Programs
- Certifications
- Bootcamps
- Campus Events

MATCH SCORE CALCULATION:
Calculate a realistic matchScore (e.g. 78, 85, 92, 96) based on alignment with candidate skills, difficulty, and career goal.

Respond ONLY in strict JSON with no markdown fences or preamble:
{
  "aiSummary": "Based on your career goal as [Role] and [Domain] skills, we recommend high-impact opportunities focusing on...",
  "opportunities": [
    {
      "id": "opp_1",
      "title": "Google Summer of Code 2026",
      "company": "Google / Open Source",
      "category": "Open Source Programs",
      "deadline": "Apr 15, 2026",
      "location": "Remote",
      "duration": "12 Weeks",
      "paid": true,
      "remote": true,
      "skills": ["Python", "C++", "Git", "Open Source"],
      "eligibility": "Open to all enrolled students and beginner open source contributors",
      "description": "Global program focused on bringing student developers into open source software development.",
      "matchScore": 94,
      "reason": "Matches your Python/Git skills and open-source development goals.",
      "applyUrl": "https://summerofcode.withgoogle.com/"
    }
  ]
}`;

async function discoverOpportunities(profile = {}) {
  const groq = getGroq();

  const userContext = `Candidate Profile:
- Career Goal: ${profile.careerGoal || 'Software Engineer'}
- Role Preference: ${profile.role || 'Full Stack / AI Engineer'}
- Domain: ${profile.domain || 'Web Development & AI'}
- Skill Level: ${profile.skillLevel || 'Intermediate'}
- Remote Preference: ${profile.remote ? 'Remote Only' : 'Flexible'}
- Paid Preference: ${profile.paid ? 'Paid Only' : 'Flexible'}
- Known Skills: ${(profile.skills || ['Python', 'JavaScript', 'React', 'DSA', 'SQL']).join(', ')}`;

  const prompt = `${userContext}\n\nGenerate 10 real, personalized opportunities matching this profile across different categories.`;

  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: OPPORTUNITY_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2560,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      const parsed = extractJson(text);
      if (parsed.opportunities && Array.isArray(parsed.opportunities)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[opportunityAgent] Model ${model} note: ${err.message}`);
    }
  }

  throw new Error('Opportunity Agent: Failed to generate opportunities across all AI fallback models.');
}

module.exports = { discoverOpportunities };
