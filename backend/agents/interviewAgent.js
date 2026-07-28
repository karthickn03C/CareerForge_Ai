/**
 * Agent 3: Interview Agent
 * Multi-phase Groq AI interaction with model fallback:
 *   Phase 1: Generate an interview question matching topic, mode, and difficulty.
 *   Phase 2: Evaluate the candidate's answer and return structured feedback & sub-scores.
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

const QUESTION_SYSTEM_PROMPT = `You are a professional technical/HR interviewer for software placement drives at top tech companies.
Your task is to ask ONE realistic, specific interview question tailored to the topic, mode, and difficulty level (beginner, intermediate, advanced, expert).
Respond ONLY in strict JSON with no markdown fences:
{
  "question": "The interview question text"
}`;

const EVALUATION_SYSTEM_PROMPT = `You are a professional technical/HR interviewer evaluating a candidate's response.
Provide an overall score (1-10) and sub-scores (0-100 each) along with strengths, weaknesses, and a model answer.
Respond ONLY in strict JSON with no markdown fences:
{
  "score": 8,
  "communicationScore": 85,
  "technicalAccuracy": 80,
  "confidenceScore": 88,
  "grammarScore": 90,
  "fluencyScore": 85,
  "problemSolvingScore": 82,
  "behavioralScore": 88,
  "strengths": ["Clear communication", "Structured response"],
  "gaps": ["Could include more specific metrics"],
  "betterAnswer": "Model response if score < 8, else concise optimization tip"
}`;

/**
 * Phase 1: Ask the interviewer to generate a question.
 */
async function askQuestion(topic, mode = 'technical', difficulty = 'intermediate') {
  const groq = getGroq();
  const modeDesc = mode === 'hr'
    ? `HR behavioral interview at ${difficulty} level (e.g. ${difficulty === 'beginner' ? 'introduction, strengths' : difficulty === 'intermediate' ? 'teamwork, conflict resolution' : difficulty === 'advanced' ? 'STAR method, project ownership' : 'senior leadership, crisis handling'})`
    : `technical interview on topic '${topic}' at ${difficulty} level (e.g. ${difficulty === 'beginner' ? 'basic concepts, loops' : difficulty === 'intermediate' ? 'trees, DP, SQL, OS' : difficulty === 'advanced' ? 'system design, concurrency' : 'FAANG-level architecture & optimization'})`;

  const prompt = `Generate ONE placement interview question for a candidate in a ${modeDesc}.`;

  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: QUESTION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      const parsed = extractJson(text);
      if (parsed.question) return parsed;
    } catch (err) {
      console.warn(`[interviewAgent] Model ${model} note: ${err.message}`);
    }
  }

  throw new Error('Interview Agent: Failed to generate question across all models.');
}

/**
 * Phase 2: Evaluate the candidate's answer.
 */
async function evaluateAnswer(question, studentAnswer, topic, mode = 'technical', difficulty = 'intermediate') {
  const groq = getGroq();
  const modeDesc = mode === 'hr' ? `HR behavioral (${difficulty})` : `technical (${topic}, ${difficulty})`;

  const prompt = `Interview context: ${modeDesc}

Question asked: "${question}"

Candidate's answer: "${studentAnswer}"

Evaluate this answer and provide structured feedback.`;

  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      const parsed = extractJson(text);
      parsed.strengths = parsed.strengths || [];
      parsed.gaps = parsed.gaps || [];
      parsed.betterAnswer = parsed.betterAnswer || '';
      return parsed;
    } catch (err) {
      console.warn(`[interviewAgent] Model ${model} note: ${err.message}`);
    }
  }

  throw new Error('Interview Agent: Failed to evaluate answer across all models.');
}

module.exports = { askQuestion, evaluateAnswer };

