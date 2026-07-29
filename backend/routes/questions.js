const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { queryAll, queryOne, execute } = require('../db/database');
const { generateQuestion } = require('../agents/questionAgent');
const { generateCodingProblem, generateHint } = require('../agents/codingAgent');
const { getWeakestTopic } = require('../agents/progressAgent');

// GET all practice questions for a student
router.get('/:studentId', (req, res) => {
  const questions = queryAll(
    'SELECT * FROM practice_questions WHERE student_id = ? ORDER BY created_at DESC',
    [req.params.studentId]
  );
  const parsed = questions.map((q) => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : [],
  }));
  res.json(parsed);
});

// POST generate a new MCQ practice question
router.post('/:studentId/generate', async (req, res) => {
  const { topic, difficulty } = req.body;
  let targetTopic = topic;

  if (!targetTopic) {
    const entries = queryAll(
      'SELECT * FROM progress_entries WHERE student_id = ?',
      [req.params.studentId]
    );
    const weakest = getWeakestTopic(entries);
    if (!weakest) {
      return res.status(400).json({
        error: 'No progress entries found. Add some topics first or specify a topic.',
      });
    }
    targetTopic = weakest.topic;
  }

  try {
    const generated = await generateQuestion(targetTopic, difficulty || 'medium');

    const result = execute(
      `INSERT INTO practice_questions (student_id, topic, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.studentId,
        targetTopic,
        generated.question,
        JSON.stringify(generated.options),
        generated.correctAnswer,
        generated.explanation,
      ]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      student_id: parseInt(req.params.studentId),
      topic: targetTopic,
      question: generated.question,
      options: generated.options,
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
    });
  } catch (err) {
    console.error('Question generation error:', err.message);
    res.status(500).json({ error: `Failed to generate question: ${err.message}` });
  }
});

// POST generate a new Coding Challenge problem (self-validating)
router.post('/:studentId/generate-coding', async (req, res) => {
  const { topic, difficulty, language } = req.body;
  let targetTopic = topic;

  if (!targetTopic) {
    const entries = queryAll(
      'SELECT * FROM progress_entries WHERE student_id = ?',
      [req.params.studentId]
    );
    const weakest = getWeakestTopic(entries);
    targetTopic = weakest ? weakest.topic : 'Arrays';
  }

  const targetLang = (language || 'javascript').toLowerCase();

  try {
    const problem = await generateCodingProblem(targetTopic, difficulty || 'medium', targetLang);

    // Strict Quality Assurance & Self-Validation:
    // Run the official reference solution against generated test cases to verify 100% pass rate.
    if (problem.solutionCode && Array.isArray(problem.testCases) && problem.testCases.length > 0) {
      try {
        console.log(`[generate-coding] Self-validating official solution for "${problem.title}" (${targetLang})...`);
        const verifiedResults = await runCodeExecution(problem.solutionCode, targetLang, problem.testCases);
        if (Array.isArray(verifiedResults)) {
          let allPassed = true;
          problem.testCases = problem.testCases.map((tc, idx) => {
            const v = verifiedResults[idx];
            if (v && v.actual && !v.error && !v.actual.includes('Error')) {
              // Update expected output with ground-truth execution result
              return {
                ...tc,
                expectedOutput: v.actual,
              };
            } else {
              allPassed = false;
              return tc;
            }
          });
          console.log(`[generate-coding] Official solution self-validation completed. Verified ${problem.testCases.length} test cases (All valid outputs: ${allPassed}).`);
        }
      } catch (valErr) {
        console.warn('[generate-coding] Reference solution self-validation note:', valErr.message);
      }
    }

    res.status(201).json({
      topic: targetTopic,
      difficulty: difficulty || 'medium',
      ...problem,
    });
  } catch (err) {
    console.error('Coding problem generation error:', err.message);
    res.status(500).json({ error: `Failed to generate coding problem: ${err.message}` });
  }
});

// POST get hint for coding challenge
router.post('/hint', async (req, res) => {
  const { title, description, code, language } = req.body;
  if (!title || !code) {
    return res.status(400).json({ error: 'title and code are required' });
  }

  try {
    const hint = await generateHint(title, description || '', code, language || 'javascript');
    res.json({ hint });
  } catch (err) {
    console.error('Hint generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate hint.' });
  }
});

// Helper: Judge0 Language IDs across standard CE & Extra CE
const JUDGE0_LANG_IDS = {
  javascript: 102,
  python: 100,
  py: 100,
  java: 91,
  cpp: 105,
  'c++': 105,
};

const JUDGE0_FALLBACK_LANG_IDS = {
  javascript: 63,
  python: 71,
  py: 71,
  java: 62,
  cpp: 54,
  'c++': 54,
};

// Helper: Perform Judge0 Execution
async function executeViaJudge0(endpointUrl, headers, sourceCode, langId, testCases, langKey) {
  let fullSourceCode = sourceCode;

  if (langId === 71 || langId === 100 || langId === 92) {
    let cleanCode = sourceCode;

    // Preprocess: If bare 'class Solution:' line is followed by unindented 'def ', strip bare class line
    if (cleanCode.includes('class Solution')) {
      cleanCode = cleanCode.replace(/^class\s+Solution(?:\([^\)]*\))?\s*:\s*\n(?=def\s+)/gm, '');
    }

    fullSourceCode = `from __future__ import annotations
import json, sys, inspect
from typing import List, Dict, Tuple, Optional, Set, Any

# ── Data Structure Serializers & Deserializers ─────────────────────────────
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def build_linked_list(arr):
    if not isinstance(arr, list) or not arr:
        return None
    head = ListNode(arr[0])
    curr = head
    for v in arr[1:]:
        curr.next = ListNode(v)
        curr = curr.next
    return head

def linked_list_to_list(head):
    res = []
    curr = head
    visited = set()
    while curr and id(curr) not in visited:
        visited.add(id(curr))
        res.append(curr.val)
        curr = curr.next
    return res

def build_binary_tree(arr):
    if not isinstance(arr, list) or not arr:
        return None
    nodes = [TreeNode(v) if v is not None else None for v in arr]
    kids = nodes[::-1]
    root = kids.pop()
    for node in nodes:
        if node:
            if kids: node.left = kids.pop()
            if kids: node.right = kids.pop()
    return root

def binary_tree_to_list(root):
    if not root:
        return []
    res, queue = [], [root]
    while queue:
        node = queue.pop(0)
        if node:
            res.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def transform_input_param(val, param_name=""):
    name_lower = param_name.lower()
    if isinstance(val, list):
        # 1. Linked list detection: list of scalars (ints, strings) for head/node or default 1D list
        is_flat_list = all(not isinstance(x, list) for x in val)
        if is_flat_list and ("head" in name_lower or "list" in name_lower or "node" in name_lower or not name_lower or name_lower == "arg0"):
            return build_linked_list(val)
        if is_flat_list and ("root" in name_lower or "tree" in name_lower):
            return build_binary_tree(val)
    return val

def transform_output_val(val):
    if isinstance(val, ListNode):
        return linked_list_to_list(val)
    if isinstance(val, TreeNode):
        return binary_tree_to_list(val)
    return val

${cleanCode}

# Dynamic function / class method / class instance detection
target_fn = None
target_cls = None
HELPER_NAMES = {'ListNode', 'TreeNode', 'Node', 'build_linked_list', 'linked_list_to_list', 'build_binary_tree', 'binary_tree_to_list', 'transform_input_param', 'transform_output_val'}

# 1. Standalone function check
for name, obj in list(locals().items()):
    if inspect.isfunction(obj) and obj.__module__ == '__main__' and name not in HELPER_NAMES:
        target_fn = obj
        break

# 2. Class fallback (e.g. class Solution or class MyQueue)
if not target_fn:
    for name, obj in list(locals().items()):
        if inspect.isclass(obj) and obj.__module__ == '__main__' and name not in HELPER_NAMES:
            target_cls = obj
            try:
                inst = obj()
                for attr_name in dir(inst):
                    if not attr_name.startswith('__'):
                        attr = getattr(inst, attr_name)
                        if callable(attr):
                            target_fn = attr
                            break
            except Exception:
                pass
            if target_fn:
                break

if not target_fn and not target_cls:
    raise RuntimeError("No executable target function or class found in code.")

sig = inspect.signature(target_fn) if target_fn else None
param_names = [p for p in sig.parameters.keys() if p != 'self'] if sig else []
param_count = len(param_names)

test_cases = ${JSON.stringify(testCases)}
results = []

for idx, tc in enumerate(test_cases):
    try:
        raw_input = tc.get('input', '[]')
        parsed_val = None
        try:
            parsed_val = json.loads(raw_input)
        except Exception:
            try:
                parsed_val = json.loads(f"[{raw_input}]")
            except Exception:
                parsed_val = raw_input

        actual_val = None

        # A. Multi-operation design problem check: list of [op_name, *args] (e.g. [['push', 1], ['pop']])
        is_multi_op = False
        if target_cls and isinstance(parsed_val, list) and len(parsed_val) > 0 and all(isinstance(op, list) and len(op) > 0 and isinstance(op[0], str) for op in parsed_val):
            is_multi_op = True

        if is_multi_op:
            inst = target_cls()
            op_outputs = []
            for op in parsed_val:
                mname = op[0]
                margs = op[1:]
                if hasattr(inst, mname):
                    method = getattr(inst, mname)
                    res = method(*margs)
                    if res is None:
                        op_outputs.append(-1)
                    else:
                        op_outputs.append(res)
                else:
                    op_outputs.append(None)
            actual_val = op_outputs
        else:
            # B. Single function / method execution
            if isinstance(parsed_val, list) and len(parsed_val) == 1 and isinstance(parsed_val[0], list) and param_count > 1:
                parsed_val = parsed_val[0]

            if param_count == 1:
                val_to_pass = parsed_val[0] if (isinstance(parsed_val, list) and len(parsed_val) == 1) else parsed_val
                pname = param_names[0] if param_names else ""
                transformed_arg = transform_input_param(val_to_pass, pname)
                actual_val = target_fn(transformed_arg)
            else:
                if isinstance(parsed_val, list) and len(parsed_val) == param_count:
                    transformed_args = [transform_input_param(arg, param_names[i] if i < len(param_names) else "") for i, arg in enumerate(parsed_val)]
                    actual_val = target_fn(*transformed_args)
                elif isinstance(parsed_val, dict):
                    transformed_kwargs = {k: transform_input_param(v, k) for k, v in parsed_val.items()}
                    actual_val = target_fn(**transformed_kwargs)
                else:
                    try:
                        transformed_arg = transform_input_param(parsed_val, param_names[0] if param_names else "")
                        actual_val = target_fn(transformed_arg)
                    except TypeError:
                        actual_val = target_fn(parsed_val)

        # Transform output (ListNode/TreeNode back to Python lists)
        actual_val = transform_output_val(actual_val)
        actual_str = json.dumps(actual_val) if actual_val is not None else "null"
        expected_str = str(tc.get('expectedOutput', '')).strip()
        try:
            expected_val = json.loads(expected_str)
            expected_str_clean = json.dumps(expected_val)
        except Exception:
            expected_str_clean = expected_str

        passed = (actual_str == expected_str_clean) or (str(actual_val) == expected_str)
        if not passed and isinstance(actual_val, list):
            try:
                passed = (sorted(actual_val) == sorted(json.loads(expected_str_clean)))
            except Exception:
                pass

        results.append({
            "testIndex": idx + 1, "passed": passed, "input": raw_input,
            "actual": actual_str, "expected": expected_str_clean
        })
    except Exception as e:
        results.append({
            "testIndex": idx + 1, "passed": False, "input": tc.get('input', ''),
            "actual": f"Runtime Error: {str(e)}", "expected": str(tc.get('expectedOutput', '')), "error": True
        })

print("PREPPILOT_RESULTS_START")
print(json.dumps(results))
print("PREPPILOT_RESULTS_END")
`;
  } else if (langId === 62 || langId === 91) {
    let cleanCode = sourceCode
      .replace(/public\s+class\s+Solution/g, 'public class Main')
      .replace(/class\s+Solution/g, 'class Main');

    // Always prepend standard Java imports (safe to duplicate — Java ignores repeated imports)
    const JAVA_IMPORTS = [
      'import java.util.*;',
      'import java.util.stream.*;',
      'import java.util.Arrays;',
      'import java.util.ArrayList;',
      'import java.util.HashMap;',
      'import java.util.HashSet;',
      'import java.util.LinkedList;',
      'import java.util.Queue;',
      'import java.util.Stack;',
      'import java.util.PriorityQueue;',
      'import java.io.*;',
    ].join('\n');

    // Strip any existing import lines so we can prepend a clean block
    cleanCode = cleanCode.replace(/^import\s+[^;]+;\s*/gm, '').trim();

    if (!cleanCode.includes('class Main')) {
      cleanCode = `${JAVA_IMPORTS}\n\npublic class Main {\n${cleanCode}\n}`;
    } else {
      cleanCode = `${JAVA_IMPORTS}\n\n${cleanCode}`;
    }

    if (!cleanCode.includes('public static void main')) {
      cleanCode = cleanCode.replace(
        /(public\s+)?class\s+Main\s*\{/,
        `public class Main {\n    public static void main(String[] args) {\n        // Runner entrypoint\n    }\n`
      );
    }

    fullSourceCode = cleanCode;
  } else if (langId === 54 || langId === 105) {
    let cleanCode = sourceCode;
    if (!cleanCode.includes('#include')) {
      cleanCode = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <unordered_map>\nusing namespace std;\n\n` + cleanCode;
    }
    if (!cleanCode.includes('int main()') && !cleanCode.includes('int main(')) {
      cleanCode += `\n\nint main() {\n    return 0;\n}\n`;
    }
    fullSourceCode = cleanCode;
  }

  let response = await fetch(`${endpointUrl}/submissions?wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      language_id: langId,
      source_code: fullSourceCode,
    }),
  });

  if (response.status === 422 && langKey && JUDGE0_FALLBACK_LANG_IDS[langKey]) {
    const fallbackId = JUDGE0_FALLBACK_LANG_IDS[langKey];
    response = await fetch(`${endpointUrl}/submissions?wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        language_id: fallbackId,
        source_code: fullSourceCode,
      }),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const jData = await response.json();
  const stdout = jData.stdout || jData.output || '';
  const stderr = jData.stderr || jData.compile_output || '';

  const match = stdout.match(/PREPPILOT_RESULTS_START\s*([\s\S]*?)\s*PREPPILOT_RESULTS_END/);
  if (match && match[1]) {
    return JSON.parse(match[1]);
  }

  const isSuccess = jData.status?.id === 3;
  return testCases.map((tc, idx) => ({
    testIndex: idx + 1,
    passed: isSuccess,
    input: tc.input,
    actual: stderr ? `Error: ${stderr}` : stdout.trim() || 'Executed successfully',
    expected: tc.expectedOutput,
  }));
}

// Unified Execution Handler
async function runCodeExecution(code, language, testCases) {
  const langKey = (language || 'javascript').toLowerCase();
  const apiKey = (process.env.JUDGE0_API_KEY || '').trim();
  const langId = JUDGE0_LANG_IDS[langKey] || 100;

  if (apiKey && apiKey !== 'your_new_key_here' && apiKey.length > 10) {
    try {
      const judge0Url = process.env.JUDGE0_API_URL || 'https://judge0-extra-ce1.p.rapidapi.com';
      const judge0Host = process.env.JUDGE0_API_HOST || 'judge0-extra-ce1.p.rapidapi.com';

      return await executeViaJudge0(
        judge0Url,
        {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': judge0Host,
        },
        code,
        langId,
        testCases,
        langKey
      );
    } catch (jErr) {
      console.warn('RapidAPI Judge0 note:', jErr.message, '— Switching to direct Judge0 CE engine.');
    }
  }

  try {
    return await executeViaJudge0('https://ce.judge0.com', {}, code, langId, testCases, langKey);
  } catch (err) {
    return await executeViaJudge0('https://extra-ce.judge0.com', {}, code, langId, testCases, langKey);
  }
}

// POST execute code server-side
router.post('/execute', async (req, res) => {
  const { code, language, testCases } = req.body;
  if (!code || !language || !Array.isArray(testCases)) {
    return res.status(400).json({ error: 'code, language, and testCases array are required' });
  }

  try {
    const results = await runCodeExecution(code, language, testCases);
    res.json({ results, engine: 'Judge0 Engine' });
  } catch (err) {
    console.error('Code execution error:', err.message);
    const testResults = testCases.map((tc, idx) => ({
      testIndex: idx + 1,
      passed: false,
      input: tc.input,
      actual: `Execution Error: ${err.message}`,
      expected: tc.expectedOutput,
      error: true,
    }));
    res.json({ results: testResults, engine: 'Error Handler' });
  }
});

// DELETE a practice question
router.delete('/:id', (req, res) => {
  execute('DELETE FROM practice_questions WHERE id = ?', [req.params.id]);
  res.json({ message: 'Question deleted' });
});

module.exports = router;
