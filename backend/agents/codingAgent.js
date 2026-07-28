/**
 * Agent: Multi-Language Coding Agent (LeetCode / HackerRank Enterprise Standards)
 * Generates 100% logically consistent, self-validating coding challenges with
 * language-idiomatic templates, 15+ verified test cases, constraints,
 * optimal reference solutions, and complexity analysis.
 * Uses official active Groq models.
 */

const Groq = require('groq-sdk');

const PROBLEM_SYSTEM_PROMPT = `You are an enterprise-grade LeetCode/HackerRank coding problem author and compiler for software engineering placement prep.
Given a topic, difficulty level, and TARGET PROGRAMMING LANGUAGE, generate ONE 100% logically consistent, executable coding challenge.

=========================================================
SYSTEM MANDATES & RULES:
=========================================================
1. PROBLEM STRUCTURE: Must contain Title, Difficulty, Category, Problem Statement, Function Name, Parameter Names, Parameter Types, Return Type, Constraints, Input Description, Output Description, Examples (at least 3), Optimal Reference Solution, Time Complexity, Space Complexity, and Hidden Test Cases (8 to 10 verified test cases).
2. FUNCTION SIGNATURE MATCHING: The function signature (functionName, parameter count, parameter names, return type) MUST be 100% IDENTICAL across starterCode, solutionCode, examples, and testCases.
3. PARAMETERS & TYPES:
   - parameterNames: array of string parameter names in order, e.g. ["nums", "target"]
   - parameterTypes: array of string types in order, e.g. ["list[int]", "int"] or ["int[]", "int"]
   - returnType: string return type, e.g. "int" or "int[]" or "boolean"
4. TEST CASES INPUT FORMAT:
   - Each testCase.input MUST be a valid JSON array string representing the positional arguments in exact parameter order!
   - Example 1 (2 params: nums: list[int], target: int): "[[2, 7, 11, 15], 9]"
   - Example 2 (1 param: nums: list[int]): "[[1, 2, 3, 4]]"
   - Example 3 (2 params: s: str, t: str): "[\"ABC\", \"BCD\"]"
   - NEVER wrap arguments in an extra single item array if there are multiple parameters, and NEVER omit array wrapping for single list parameters!
5. LANGUAGE TEMPLATES:
   - Python: Standalone function or class Solution method with Pythonic typing (e.g. "def twoSum(nums: list[int], target: int) -> list[int]:").
   - Java: Class Solution with method + imports at top (e.g. "import java.util.*;\nimport java.io.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}").
   - C++: Class Solution with method + includes at top (e.g. "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};").
6. STARTER CODE: MUST BE A BOILERPLATE STUB ONLY (signature + comment + dummy return value, ZERO SOLUTION CODE).
7. REFERENCE SOLUTION: Complete, 100% working, optimal algorithm implementation matching the exact function signature.
8. HIDDEN TEST CASES: Provide 8 to 10 concise, 100% correct test cases where expectedOutput matches solutionCode execution.

Respond ONLY in strict JSON:
{
  "title": "Problem Title",
  "difficulty": "easy|medium|hard",
  "category": "Arrays|Strings|Linked List|Trees|Graphs|Dynamic Programming|Greedy|Sorting",
  "description": "Clear and detailed problem statement.",
  "functionName": "twoSum",
  "parameterNames": ["nums", "target"],
  "parameterTypes": ["list[int]", "int"],
  "returnType": "list[int]",
  "constraints": "Numerical & structural constraints string",
  "inputDescription": "Description of input parameters and types.",
  "outputDescription": "Description of return value type and meaning.",
  "examples": [
    { "input": "nums=[2,7,11,15], target=9", "output": "[0, 1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]." }
  ],
  "starterCode": "language-native starter code stub string (STUB ONLY, NO SOLUTION)",
  "solutionCode": "complete, optimal reference solution code string in the requested language",
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "language": "python|java|cpp",
  "testCases": [
    { "input": "[[2, 7, 11, 15], 9]", "expectedOutput": "[0, 1]" }
  ],
  "explanation": "Step-by-step problem breakdown: Intuition, Algorithm Steps, Time Complexity, and Space Complexity."
}`;

const HINT_SYSTEM_PROMPT = `You are a supportive, warm AI DSA tutor helping a student solve a coding challenge during placement prep.
Give ONE concise, encouraging hint tailored to the problem and their code in the specified programming language.
Do NOT give away the complete solution directly — guide their thinking!

Respond ONLY in strict JSON:
{
  "hint": "Your encouraging hint text here."
}`;

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function extractJson(text) {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/"""([\s\S]*?)"""/g, (match, inner) => {
    return JSON.stringify(inner.trim());
  });

  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/gi, '').replace(/\n?```$/gi, '').trim();
  }
  const start = cleaned.indexOf('{');
  let end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  } else if (start !== -1 && end === -1) {
    // Attempt string/bracket auto-closure if truncated
    cleaned = cleaned.substring(start);
    if (!cleaned.endsWith('}')) cleaned += '}';
  }
  return JSON.parse(cleaned);
}

/**
 * Generate a coding challenge in the specified language with model fallback.
 */
async function generateCodingProblem(topic, difficulty = 'medium', language = 'javascript') {
  const groq = getGroq();
  const normalizedLang = (language || 'javascript').toLowerCase();

  const prompt = `Topic: ${topic}
Difficulty: ${difficulty}
Language: ${normalizedLang}

Generate an enterprise-grade LeetCode/HackerRank quality coding challenge for ${normalizedLang}.
Ensure:
1. starterCode is a STUB ONLY matching ${normalizedLang} rules (class Solution for Java/C++, standalone function for Python).
2. solutionCode is the complete optimal reference solution.
3. examples contains at least 3 examples with parameter names.
4. testCases contains 8 to 10 concise, accurate test cases.
5. Include constraints, input/output descriptions, time complexity, and space complexity.${normalizedLang === 'java' ? `
6. JAVA CRITICAL: Both starterCode AND solutionCode MUST start with all required import statements BEFORE the class declaration. You MUST include at minimum: import java.util.*; import java.io.*; Also add any other specific imports the solution uses (e.g., import java.util.HashMap; import java.util.List; import java.util.Arrays; etc.). Never omit imports — missing imports cause compilation failures.` : normalizedLang === 'cpp' ? `
6. C++ CRITICAL: Both starterCode AND solutionCode MUST include all necessary #include directives at the top and "using namespace std;". Common headers: #include <vector>, #include <string>, #include <algorithm>, #include <unordered_map>, #include <unordered_set>, etc.` : ''}`;

  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ];
  let text = '';
  let lastError = null;

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: PROBLEM_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      text = completion.choices[0]?.message?.content || '';
      if (text) break;
    } catch (err) {
      console.warn(`Groq model ${model} note:`, err.message, '— Trying next fallback model.');
      lastError = err;
    }
  }

  if (!text) {
    throw new Error(`Coding Agent: Failed to generate problem from AI models. ${lastError?.message || ''}`);
  }

  let parsed;
  try {
    parsed = extractJson(text);
  } catch (err) {
    throw new Error(`Coding Agent: Failed to parse Groq response as JSON.\nRaw: ${text}`);
  }

  if (!parsed.title || !parsed.description || !parsed.starterCode) {
    throw new Error('Coding Agent: Incomplete JSON structure from Groq.');
  }

  if (!Array.isArray(parsed.testCases) || parsed.testCases.length === 0) {
    parsed.testCases = (parsed.examples || []).map(ex => ({
      input: `[${ex.input ? ex.input.split('=').pop() : '[]'}]`,
      expectedOutput: ex.output || ''
    }));
  }

  parsed.language = normalizedLang;
  return parsed;
}

/**
 * Generate a hint for a student's code attempt in the specified language.
 */
async function generateHint(problemTitle, problemDescription, currentCode, language = 'javascript') {
  const groq = getGroq();

  const prompt = `Problem Title: ${problemTitle}
Problem Description: ${problemDescription}
Language: ${language}

Student's Current Code (${language}):
\`\`\`${language}
${currentCode}
\`\`\`

Give ONE helpful, encouraging hint tailored to ${language} syntax and DSA concepts to nudge them forward.`;

  const models = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'qwen/qwen3.6-27b',
    'groq/compound-mini',
  ];
  let text = '';

  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: HINT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      });

      text = completion.choices[0]?.message?.content || '';
      if (text) break;
    } catch (err) {}
  }

  let parsed;
  try {
    parsed = extractJson(text);
  } catch {
    throw new Error('Coding Agent: Failed to generate hint.');
  }

  return parsed?.hint || 'Check your loop boundaries and edge cases!';
}

module.exports = { generateCodingProblem, generateHint };
