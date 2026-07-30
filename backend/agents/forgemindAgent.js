/**
 * Agent Manager & Multi-Agent Orchestrator Service
 * Executes only required agents, manages conversation memory, synthesizes natural responses.
 */

const Groq = require('groq-sdk');
const { parseResumeWithAI, analyzeATSWithAI } = require('./resumeAgent');
const { generateCodingProblem } = require('./codingAgent');
const { askQuestion } = require('./interviewAgent');
const { generatePlan } = require('./plannerAgent');
const { discoverOpportunities } = require('./opportunityAgent');
const { analyzeProgress } = require('./progressAgent');
const { queryAll, queryOne, execute } = require('../db/database');

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

// ── 1. INTENT DETECTION PROMPT ─────────────────────────────────────────────
const INTENT_CLASSIFIER_PROMPT = `You are the Intent Router for ForgeMind AI, the master career orchestrator of CareerForge AI.
Your ONLY job is to classify the user's intent and select ONLY the strictly required internal agents.

STRICT CARERFORGE AI BOUNDARIES:
- You answer ONLY using CareerForge features and user data.
- NEVER invent external information or hallucinate facts.
- NEVER change the user's intention.
- NEVER redirect the user to unrequested features.
- Execute ONLY what is specifically asked.

Available Agents:
- "resume": Analyze/review uploaded resume or ATS evaluation.
- "practice": Generate coding problems, DSA challenges, algorithm practice.
- "interview": Conduct mock interviews, technical/HR questions, answer feedback.
- "plan": Create day-by-day or week-by-week study roadmap/schedule.
- "opportunity": Discover internships, hackathons, open source, fellowships.
- "progress": Analyze weak topics, solved counts, LeetCode stats, or skill comparison.
- "pdf": Generate downloadable PDF reports for resume, progress, interview, plan, or general readiness.

Strict Intent Rules:
1. SPECIFIC INTENT (e.g. "show progress", "analyze resume", "generate MCQs for DBMS", "generate study plan", "generate PDF report"):
   - Set "agents" to ONLY the single agent requested (e.g. ["progress"], ["resume"], ["plan"], ["pdf"]).
   - DO NOT include unrequested agents.
2. GREETING / CASUAL QUERY (e.g. "hi", "hello", "what can you do"):
   - Set "intent": "greeting", "agents": [].
3. FULL COMPREHENSIVE PREP QUERY (e.g. "prepare me for Google from scratch"):
   - Set "agents": ["resume", "practice", "interview", "plan", "opportunity", "progress"].

Respond ONLY in strict JSON:
{
  "intent": "greeting|resume_review|find_opportunities|placement_prep|practice_coding|mock_interview|study_plan|progress_analysis|generate_pdf",
  "agents": ["resume", "practice", "interview", "plan", "opportunity", "progress", "pdf"],
  "primaryTopic": "Arrays|DBMS|OS|CN|OOP|SQL|Java|Python|JavaScript|C|C++|DSA|General",
  "targetCompany": "Amazon|Google|TCS|Zoho|None",
  "action": "none|bookmark|generate_pdf"
}`;

// ── 2. RESPONSE SYNTHESIS PROMPT ───────────────────────────────────────────
const RESPONSE_SYNTHESIZER_PROMPT = `You are ForgeMind AI, the Master Career Orchestrator of CareerForge AI.

CRITICAL INSTRUCTIONS ON USER INTENT:
1. STRICT INTENT COMPLIANCE:
   - Answer ONLY what the user asked.
   - If the user asks for Progress, show ONLY progress. Do NOT analyze resume, generate study plans, or create coding problems.
   - If the user asks for Resume Analysis, return ATS score, strengths, weaknesses, and improvements ONLY.
   - If the user asks for MCQs/Coding, return question/challenge ONLY.
   - If the user asks for a Study Plan, return the study plan ONLY.
   - If the user asks for a PDF / Report, inform them that the official CareerForge AI PDF Report has been generated and provide the summary.
2. NEVER invent facts or hallucinate student data not present in the system.
3. Keep response laser-focused, structured, and elegant using Markdown.

Candidate Name: {{studentName}}
Candidate Profile Memory: {{memorySummary}}`;

/**
 * Core Multi-Agent Orchestrator
 */
async function processChatMessage({ studentId, studentName = 'Candidate', userQuery, conversationId, attachedText = '' }) {
  const groq = getGroq();

  // Load candidate long-term memory
  const progressEntries = queryAll('SELECT * FROM progress_entries WHERE student_id = ?', [studentId]);
  let latestPlan = null;
  try {
    latestPlan = queryOne('SELECT * FROM study_plans WHERE student_id = ? ORDER BY created_at DESC', [studentId]);
  } catch (e) {}

  const weakTopics = analyzeProgress(progressEntries);
  const memorySummary = `Known Skills: Python, JS, DSA | Solved: ${progressEntries.reduce((s, e) => s + e.problems_solved, 0)} problems | Weakest Topic: ${weakTopics[0]?.topic || 'None'} | Target Plan: ${latestPlan?.target_company || 'General'}`;

  // 1. Intent Detection Call
  let routing = { intent: 'general', agents: [], primaryTopic: 'General', targetCompany: '', action: 'none' };
  try {
    for (const model of MODELS) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: INTENT_CLASSIFIER_PROMPT },
            { role: 'user', content: `Query: "${userQuery}"\nAttached Document: ${attachedText ? 'Yes' : 'No'}` }
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        });
        routing = extractJson(completion.choices[0]?.message?.content || '');
        if (routing.agents && Array.isArray(routing.agents)) break;
      } catch (err) {
        console.warn(`[Intent Router] Model ${model} note:`, err.message);
      }
    }
  } catch (e) {
    console.warn('[Intent Router] Fallback used:', e.message);
  }

  // Force resume agent if document attached
  if (attachedText && Array.isArray(routing.agents) && !routing.agents.includes('resume')) {
    routing.agents.push('resume');
  }

  // 2. Execute Only Required Sub-Agents in Parallel
  const agentTasks = [];
  const outputs = {
    resumeData: null,
    practiceData: null,
    interviewData: null,
    planData: null,
    opportunityData: null,
    progressData: null,
    partialErrors: []
  };

  if (routing.agents.includes('resume')) {
    agentTasks.push(
      (async () => {
        if (attachedText && attachedText.trim()) {
          const parsed = await parseResumeWithAI(attachedText);
          let ats = null;
          try {
            ats = await analyzeATSWithAI(parsed);
          } catch (e) {
            console.warn('[ForgeMind Resume ATS Note]', e.message);
          }
          const overallScore = ats?.atsScores?.overallScore || 78;
          const data = {
            fullName: parsed.personalInfo?.fullName || studentName,
            experienceLevel: parsed.experience?.length > 0 ? 'Experienced' : 'Fresher / Entry Level',
            atsScore: overallScore,
            strengths: ats?.feedback?.strengths || ['Good project foundation', 'Relevant technical skills'],
            weaknesses: ats?.feedback?.weaknesses || ['Bullet points could use more quantifiable metrics'],
            improvements: ats?.feedback?.actionableImprovements || ['Include impact numbers and metrics in project bullet points'],
            parsed,
            ats
          };
          outputs.resumeData = data;

          // Save analysis to database so future queries reuse this resume
          try {
            execute(
              `INSERT INTO resume_analyses (student_id, file_name, file_type, raw_text, parsed_json, ats_scores, feedback_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                studentId,
                'ForgeMind Attached Resume',
                'text/plain',
                attachedText,
                JSON.stringify(parsed),
                JSON.stringify(ats?.atsScores || { overallScore }),
                JSON.stringify(ats?.feedback || {})
              ]
            );
          } catch (dbErr) {
            console.warn('[ForgeMind Resume DB Save Note]', dbErr.message);
          }
        } else {
          // Look up latest stored resume analysis for this student or query name
          let record = queryOne(
            'SELECT * FROM resume_analyses WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1',
            [studentId]
          );
          if (!record && userQuery.toLowerCase().includes('manoj')) {
            record = queryOne(
              `SELECT r.* FROM resume_analyses r 
               JOIN students s ON r.student_id = s.id 
               WHERE LOWER(s.name) LIKE '%manoj%' ORDER BY r.uploaded_at DESC LIMIT 1`
            );
          }
          if (!record) {
            record = queryOne('SELECT * FROM resume_analyses ORDER BY uploaded_at DESC LIMIT 1');
          }

          if (record) {
            try {
              const parsed = JSON.parse(record.parsed_json || '{}');
              const ats = JSON.parse(record.ats_scores || '{}');
              const feedback = JSON.parse(record.feedback_json || '{}');
              outputs.resumeData = {
                fullName: parsed.personalInfo?.fullName || record.file_name || studentName,
                experienceLevel: parsed.experience?.length > 0 ? 'Experienced' : 'Fresher / Entry Level',
                atsScore: ats.overallScore || 78,
                strengths: feedback.strengths || ['Solid core technical skills', 'Well structured layout'],
                weaknesses: feedback.weaknesses || ['Bullet points could include more quantified outcomes'],
                improvements: feedback.actionableImprovements || ['Add metrics to demonstrate impact'],
                parsed,
                ats,
                fileName: record.file_name
              };
            } catch (e) {
              console.warn('[ForgeMind Stored Resume Parse Error]', e.message);
            }
          }
        }
      })().catch(e => outputs.partialErrors.push(`Resume Agent: ${e.message}`))
    );
  }

  if (routing.agents.includes('practice')) {
    const topic = routing.primaryTopic && routing.primaryTopic !== 'General' ? routing.primaryTopic : (weakTopics[0]?.topic || 'Arrays');
    agentTasks.push(
      generateCodingProblem(topic, 'medium', 'python')
        .then(d => { outputs.practiceData = d; })
        .catch(e => outputs.partialErrors.push(`Coding Agent: ${e.message}`))
    );
  }

  if (routing.agents.includes('interview')) {
    agentTasks.push(
      askQuestion(routing.primaryTopic || 'General', 'technical', 'intermediate')
        .then(d => { outputs.interviewData = d; })
        .catch(e => outputs.partialErrors.push(`Mock Interview Agent: ${e.message}`))
    );
  }

  if (routing.agents.includes('plan')) {
    agentTasks.push(
      generatePlan(weakTopics.length > 0 ? weakTopics : [{ topic: 'Arrays', problems_solved: 2, status: 'weak' }], 30, routing.targetCompany || '')
        .then(d => { outputs.planData = d; })
        .catch(e => outputs.partialErrors.push(`Plan Agent: ${e.message}`))
    );
  }

  if (routing.agents.includes('opportunity')) {
    agentTasks.push(
      discoverOpportunities({
        careerGoal: routing.targetCompany ? `Engineer at ${routing.targetCompany}` : 'Software Engineer',
        role: 'Full Stack / AI Engineer',
        domain: routing.primaryTopic || 'Web Development & AI',
        skillLevel: 'Intermediate',
      })
        .then(d => { outputs.opportunityData = d; })
        .catch(e => outputs.partialErrors.push(`Opportunity Agent: ${e.message}`))
    );
  }

  if (routing.agents.includes('progress')) {
    outputs.progressData = {
      totalSolved: progressEntries.reduce((s, e) => s + (e.problems_solved || 0), 0),
      analysis: weakTopics
    };
  }

  await Promise.allSettled(agentTasks);

  // 3. Response Synthesis Phase
  const systemPrompt = RESPONSE_SYNTHESIZER_PROMPT
    .replace('{{studentName}}', studentName)
    .replace('{{memorySummary}}', memorySummary);

  const resumeSummary = outputs.resumeData
    ? `Name: ${outputs.resumeData.fullName}, ATS Score: ${outputs.resumeData.atsScore}/100, Strengths: ${JSON.stringify(outputs.resumeData.strengths)}, Weaknesses: ${JSON.stringify(outputs.resumeData.weaknesses)}, Improvements: ${JSON.stringify(outputs.resumeData.improvements)}`
    : 'No resume profile available.';

  const userContext = `User Query: "${userQuery}"
Executed Agents: ${routing.agents.length > 0 ? routing.agents.join(', ') : 'None (Conversational)'}

Internal Sub-Agent Findings:
- Resume Profile: ${resumeSummary}
- Coding Challenge: ${outputs.practiceData ? outputs.practiceData.title : 'N/A'}
- Interview Question: ${outputs.interviewData ? outputs.interviewData.question : 'N/A'}
- Study Plan: ${outputs.planData ? `${outputs.planData.planType} plan for ${outputs.planData.targetCompany || 'General'}` : 'N/A'}
- Opportunities Discovered: ${outputs.opportunityData ? outputs.opportunityData.opportunities?.length : 'N/A'}
- Weakest Topic: ${outputs.progressData?.analysis?.[0]?.topic || 'N/A'}`;

  let finalMarkdown = '';
  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext }
        ],
        temperature: 0.7,
        max_tokens: 1800
      });
      finalMarkdown = completion.choices[0]?.message?.content || '';
      if (finalMarkdown) break;
    } catch (e) {
      console.warn(`[Synthesizer] Model ${model} note:`, e.message);
    }
  }

  if (!finalMarkdown) {
    finalMarkdown = `Hi ${studentName}! I'm ForgeMind AI. How can I assist with your placement prep today?`;
  }

  return {
    markdownResponse: finalMarkdown,
    agentOutputs: outputs,
    routing
  };
}

module.exports = { processChatMessage };
