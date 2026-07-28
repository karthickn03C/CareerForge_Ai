/**
 * Agent 2: Question Agent
 * Uses Groq to generate a single MCQ with official active model fallback.
 */

const Groq = require('groq-sdk');

const SYSTEM_PROMPT = `You are a DSA/aptitude question generator for placement preparation.
Given a topic and difficulty level, generate ONE multiple-choice question.
Respond ONLY in strict JSON with no markdown fences, no extra text:
{
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "explanation": "Step-by-step explanation of why Option A is correct"
}
Make sure correctAnswer is the EXACT string from options array.`;

/**
 * Generate a practice MCQ for the given topic and difficulty.
 *
 * @param {string} topic - e.g., "Dynamic Programming"
 * @param {string} difficulty - "easy" | "medium" | "hard"
 * @returns {Promise<{question, options, correctAnswer, explanation}>}
 */
async function generateQuestion(topic, difficulty = 'medium') {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const userPrompt = `Topic: ${topic}
Difficulty: ${difficulty}
Generate one multiple-choice DSA/aptitude question suitable for placement interviews.`;

  const models = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'qwen/qwen3.6-27b',
    'groq/compound-mini',
  ];
  let text = '';
  let lastError = null;

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      text = completion.choices[0]?.message?.content || '';
      if (text) break;
    } catch (err) {
      console.warn(`Groq MCQ model ${model} note:`, err.message);
      lastError = err;
    }
  }

  if (!text) {
    throw new Error(`Question Agent: Failed to generate question. ${lastError?.message || ''}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Question Agent: Failed to parse Groq response as JSON.\nRaw: ${text}`);
  }

  if (
    !parsed.question ||
    !Array.isArray(parsed.options) ||
    parsed.options.length !== 4 ||
    !parsed.correctAnswer ||
    !parsed.explanation
  ) {
    throw new Error('Question Agent: Incomplete JSON structure from Groq.');
  }

  return parsed;
}

module.exports = { generateQuestion };
