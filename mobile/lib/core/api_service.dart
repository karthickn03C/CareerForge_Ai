import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Use Production URL on Render by default, fallback to localhost for development
  static String baseUrl = 'https://careerforge-ai-2bbv.onrender.com/api';

  static String? token;
  static Map<String, dynamic>? currentUser;

  static Map<String, String> get _headers {
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // ── Authentication ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['token'] != null) {
      token = data['token'];
      currentUser = data['user'];
    }
    return {'status': response.statusCode, 'body': data};
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password, String confirmPassword) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
        'role': 'student',
      }),
    );
    return {'status': response.statusCode, 'body': jsonDecode(response.body)};
  }

  // ── Student Dashboard & Profile ─────────────────────────────────────────
  static Future<Map<String, dynamic>> getStudentProfile(int studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/students/$studentId'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getFullStudentProfile(int studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/students/$studentId/full-profile'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  // ── Progress & LeetCode ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getProgress(int studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/students/$studentId/progress'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> addProgress(int studentId, String topic, String platform, int problemsSolved) async {
    final response = await http.post(
      Uri.parse('$baseUrl/progress/$studentId'),
      headers: _headers,
      body: jsonEncode({'topic': topic, 'platform': platform, 'problemsSolved': problemsSolved}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> importLeetCode(int studentId, String username) async {
    final response = await http.post(
      Uri.parse('$baseUrl/progress/$studentId/import-leetcode'),
      headers: _headers,
      body: jsonEncode({'username': username}),
    );
    return jsonDecode(response.body);
  }

  // ── ForgeMind AI Orchestrator ───────────────────────────────────────────
  static Future<Map<String, dynamic>> sendForgeMindChat(int studentId, String userQuery, {String? attachedText}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/forgemind/$studentId/chat'),
      headers: _headers,
      body: jsonEncode({
        'userQuery': userQuery,
        'studentName': currentUser?['name'] ?? 'Student',
        'attachedText': attachedText ?? '',
      }),
    );
    return jsonDecode(response.body);
  }

  // ── Resume Analyzer ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> uploadResumeText(int studentId, String rawText, String fileName) async {
    final response = await http.post(
      Uri.parse('$baseUrl/resume/$studentId/upload'),
      headers: _headers,
      body: jsonEncode({
        'rawText': rawText,
        'fileName': fileName,
        'fileType': 'text/plain',
      }),
    );
    return jsonDecode(response.body);
  }

  // ── MCQ Practice ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateMCQ(int studentId, String topic, String difficulty) async {
    final response = await http.post(
      Uri.parse('$baseUrl/questions/$studentId/generate'),
      headers: _headers,
      body: jsonEncode({'topic': topic, 'difficulty': difficulty}),
    );
    return jsonDecode(response.body);
  }

  // ── Coding Practice ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateCodingProblem(int studentId, String topic, String difficulty, String language) async {
    final response = await http.post(
      Uri.parse('$baseUrl/questions/$studentId/generate-coding'),
      headers: _headers,
      body: jsonEncode({'topic': topic, 'difficulty': difficulty, 'language': language}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> executeCodingSolution(String code, String language, List testCases) async {
    final response = await http.post(
      Uri.parse('$baseUrl/questions/execute'),
      headers: _headers,
      body: jsonEncode({'code': code, 'language': language, 'testCases': testCases}),
    );
    return jsonDecode(response.body);
  }

  static Future<void> logCodingSolved(int studentId, String title, String topic, String difficulty, String language) async {
    await http.post(
      Uri.parse('$baseUrl/students/$studentId/preppilot-history'),
      headers: _headers,
      body: jsonEncode({'title': title, 'topic': topic, 'difficulty': difficulty, 'language': language}),
    );
  }

  // ── Mock Interview ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> startInterview(int studentId, String topic, String mode, String difficulty) async {
    final response = await http.post(
      Uri.parse('$baseUrl/interview/$studentId/start'),
      headers: _headers,
      body: jsonEncode({'topic': topic, 'mode': mode, 'difficulty': difficulty}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> submitInterviewAnswer(int sessionId, String studentAnswer) async {
    final response = await http.post(
      Uri.parse('$baseUrl/interview/session/$sessionId/answer'),
      headers: _headers,
      body: jsonEncode({'studentAnswer': studentAnswer}),
    );
    return jsonDecode(response.body);
  }

  // ── Study Planner ───────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateStudyPlan(int studentId, String targetCompany, String targetDate) async {
    final response = await http.post(
      Uri.parse('$baseUrl/planner/$studentId/generate'),
      headers: _headers,
      body: jsonEncode({'targetCompany': targetCompany, 'target_date': targetDate}),
    );
    return jsonDecode(response.body);
  }

  // ── Opportunity Discovery ───────────────────────────────────────────────
  static Future<Map<String, dynamic>> getSavedOpportunities(int studentId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/opportunities/$studentId/saved'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  // ── PDF Generation ──────────────────────────────────────────────────────
  static String getPdfUrl(String reportType, int studentId, {String? customTitle, String? customContent}) {
    final queryParams = [
      'reportType=$reportType',
      'studentId=$studentId',
      if (customTitle != null) 'customTitle=${Uri.encodeComponent(customTitle)}',
      if (customContent != null) 'customContent=${Uri.encodeComponent(customContent)}',
    ].join('&');
    return '$baseUrl/reports/generate-pdf?$queryParams';
  }

  // ── Staff Portal Analytics ──────────────────────────────────────────────
  static Future<Map<String, dynamic>> getStaffAnalytics() async {
    final response = await http.get(
      Uri.parse('$baseUrl/students/staff/analytics'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getStaffActivityFeed() async {
    final response = await http.get(
      Uri.parse('$baseUrl/students/staff/activity-feed'),
      headers: _headers,
    );
    return jsonDecode(response.body);
  }
}
