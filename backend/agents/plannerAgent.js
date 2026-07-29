/**
 * Agent 4: Planner Agent
 * Uses Groq (llama-3.3-70b-versatile) to generate a day-by-day or week-by-week prep plan
 * based on weak/moderate topics and days remaining until placement.
 */

const Groq = require('groq-sdk');

const SYSTEM_PROMPT = `You are an expert placement preparation coach creating realistic, company-weighted study plans.
Given a list of weak and moderate topics with their problem counts, the number of days until placement, and a TARGET COMPANY,
create a detailed day-by-day (if ≤14 days) or week-by-week (if >14 days) study plan.

Company Weighting & Targeting Rules:
1. SERVICE-BASED COMPANIES (e.g. TCS, Infosys, Wipro, Cognizant, Accenture, Capgemini, HCL, TechMahindra):
   - Emphasize quantitative aptitude, logical reasoning, verbal ability, basic-to-medium DSA (Arrays, Strings, Searching/Sorting), and HR round/behavioral interview prep.
2. PRODUCT-BASED COMPANIES (e.g. Google, Amazon, Microsoft):
   - Emphasize strong Data Structures & Algorithms (Medium to Hard: Trees, Graphs, DP, Heap, System Design basics), and STAR-method behavioral interview prep.
3. ZOHO:
   - Emphasize core C/C++ problem-solving, matrix & string manipulation, and heavy DSA coding rounds over general aptitude.
4. CUSTOM / OTHER OR UNRECOGNIZED COMPANIES:
   - Provide a balanced general plan covering DSA, aptitude, and interview prep.
   - If the company is unrecognized or custom ("Other"), include a "companyNote": "General preparation plan (company-specific pattern not available)".

Plan Generation Rules:
- Prioritize weakest topics first (fewest problems solved).
- Each day/week should have a clear focus topic and 3-5 specific concrete tasks.
- Keep tasks actionable ("Solve 5 LeetCode Medium Array problems", "Practice 20 Aptitude Probability questions", etc.).

Respond ONLY in strict JSON with no markdown fences:
{
  "planType": "daily or weekly",
  "totalDays": <number>,
  "targetCompany": "<Company Name>",
  "companyNote": "<Optional note if fallback or custom>",
  "plan": [
    {
      "day_or_week": "Day 1 or Week 1",
      "focus_topic": "Topic Name",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}`;

/**
 * Generate a personalized study plan.
 *
 * @param {Array<{topic, problems_solved, status}>} weakTopics - from Progress Agent
 * @param {number} daysRemaining - days until placement drive
 * @param {string} targetCompany - target company name (e.g. "TCS", "Google", "Zoho")
 * @returns {Promise<{planType, totalDays, targetCompany, companyNote, plan: Array}>}
 */
async function generatePlan(weakTopics, daysRemaining, targetCompany = '') {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const topicList = weakTopics
    .map(
      (t, i) =>
        `${i + 1}. ${t.topic || t.topic} — ${t.problems_solved || 0} problems solved (${t.status || 'weak'})`
    )
    .join('\n');

  const prompt = `Target Company: ${targetCompany || 'General / Unspecified'}
Student's weak and moderate topics (sorted weakest first):
${topicList}

Days remaining until placement drive: ${daysRemaining}

Create a personalized study plan specifically weighted for target company: "${targetCompany || 'General Placement'}".`;

  // Multi-model fallback chain
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
  
  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const text = completion.choices[0]?.message?.content || '';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.warn(`[plannerAgent] Model ${model} returned invalid JSON, trying next.`);
        continue;
      }

      if (!Array.isArray(parsed.plan) || parsed.plan.length === 0) {
        console.warn(`[plannerAgent] Model ${model} returned empty plan, trying next.`);
        continue;
      }

      parsed.targetCompany = targetCompany || parsed.targetCompany || '';
      console.log(`[plannerAgent] Plan generated with model: ${model}`);
      return parsed;
    } catch (err) {
      console.warn(`[plannerAgent] Model ${model} failed: ${err.message?.substring(0, 80)}`);
    }
  }

  // Static fallback plan when all AI models fail (e.g., rate limit exceeded)
  console.warn('[plannerAgent] All models failed. Returning static fallback plan.');
  const isWeekly = daysRemaining > 14;
  const planItems = weakTopics.slice(0, 4).map((t, i) => ({
    day_or_week: isWeekly ? `Week ${i + 1}` : `Day ${i + 1}`,
    focus_topic: t.topic || 'Core DSA',
    tasks: [
      `Review fundamentals of ${t.topic || 'core topic'}`,
      'Solve 5 practice problems on LeetCode',
      'Watch 1 video tutorial on the topic',
      'Review solutions and note patterns'
    ]
  }));

  return {
    planType: isWeekly ? 'weekly' : 'daily',
    totalDays: daysRemaining,
    targetCompany: targetCompany || 'General',
    companyNote: 'AI-generated plan temporarily unavailable. Using default preparation framework.',
    plan: planItems.length > 0 ? planItems : [{
      day_or_week: 'Week 1',
      focus_topic: 'Arrays & Strings',
      tasks: ['Solve 10 Easy Array problems', 'Practice String manipulation', 'Review Big-O notation']
    }]
  };
}

module.exports = { generatePlan };
