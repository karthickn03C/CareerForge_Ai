import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Use Production URL on Render by default
  static String baseUrl = 'https://careerforge-ai-2bbv.onrender.com/api';

  static String? token;
  static Map<String, dynamic>? currentUser;

  static Map<String, String> get _headers {
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Health check endpoint verification
  static Future<bool> checkHealth() async {
    final endpoint = '$baseUrl/health';
    try {
      print('[HTTP GET] Health Check: $endpoint');
      final res = await http.get(Uri.parse(endpoint), headers: _headers).timeout(const Duration(seconds: 15));
      print('[HTTP HEALTH] Endpoint: $endpoint | Status: ${res.statusCode} | Body: ${res.body}');
      return res.statusCode == 200;
    } catch (e) {
      print('[HTTP HEALTH ERROR] Endpoint: $endpoint | Error: $e');
      return false;
    }
  }

  // Silent background server warmup to wake up Render on app launch
  static void warmupServer() {
    checkHealth();
  }

  // Robust HTTP GET helper with exact logging
  static Future<http.Response> _get(String url, {int retries = 2}) async {
    print('[HTTP GET Request] $url');
    for (int i = 0; i <= retries; i++) {
      try {
        final response = await http.get(Uri.parse(url), headers: _headers).timeout(const Duration(seconds: 45));
        print('[HTTP GET Response] Endpoint: $url | Status: ${response.statusCode}');
        return response;
      } catch (e) {
        print('[HTTP GET Error] Attempt ${i + 1}/${retries + 1} for $url | Error: $e');
        if (i == retries) rethrow;
        await Future.delayed(const Duration(seconds: 2));
      }
    }
    throw Exception('Failed to reach $url after $retries retries.');
  }

  // Robust HTTP POST helper with exact logging
  static Future<http.Response> _post(String url, Object? body, {int retries = 2}) async {
    print('[HTTP POST Request] Endpoint: $url');
    for (int i = 0; i <= retries; i++) {
      try {
        final response = await http
            .post(Uri.parse(url), headers: _headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 45));
        print('[HTTP POST Response] Endpoint: $url | Status: ${response.statusCode} | Body: ${response.body.length > 250 ? "${response.body.substring(0, 250)}..." : response.body}');
        return response;
      } catch (e) {
        print('[HTTP POST Error] Attempt ${i + 1}/${retries + 1} for $url | Error: $e');
        if (i == retries) rethrow;
        await Future.delayed(const Duration(seconds: 2));
      }
    }
    throw Exception('Failed to reach $url after $retries retries.');
  }

  // ── Authentication ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final endpoint = '$baseUrl/auth/login';
    try {
      final response = await _post(endpoint, {'email': email, 'password': password});
      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = {'error': 'Invalid response from server (Status ${response.statusCode}): ${response.body}'};
      }
      if (response.statusCode == 200 && data['token'] != null) {
        token = data['token'];
        currentUser = data['user'];
      }
      return {'status': response.statusCode, 'body': data};
    } catch (e) {
      print('[LOGIN ERROR] Endpoint: $endpoint | Error: $e');
      return {
        'status': 500,
        'body': {'error': 'Connection failed to $endpoint (Status: 500). Details: ${e.toString()}'}
      };
    }
  }

  static Future<Map<String, dynamic>> register(String name, String email, String password, String confirmPassword) async {
    final endpoint = '$baseUrl/auth/register';
    try {
      final response = await _post(endpoint, {
        'name': name,
        'email': email,
        'password': password,
        'confirmPassword': confirmPassword,
        'role': 'student',
      });
      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = {'error': 'Invalid response from server (Status ${response.statusCode}): ${response.body}'};
      }
      return {'status': response.statusCode, 'body': data};
    } catch (e) {
      print('[REGISTER ERROR] Endpoint: $endpoint | Error: $e');
      return {
        'status': 500,
        'body': {'error': 'Connection failed to $endpoint (Status: 500). Details: ${e.toString()}'}
      };
    }
  }

  // ── Student Dashboard & Profile ─────────────────────────────────────────
  static Future<Map<String, dynamic>> getStudentProfile(int studentId) async {
    final response = await _get('$baseUrl/students/$studentId');
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getFullStudentProfile(int studentId) async {
    final response = await _get('$baseUrl/students/$studentId/full-profile');
    return jsonDecode(response.body);
  }

  // ── Progress & LeetCode ──────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getProgress(int studentId) async {
    final response = await _get('$baseUrl/students/$studentId/progress');
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> addProgress(int studentId, String topic, String platform, int problemsSolved) async {
    final response = await _post('$baseUrl/progress/$studentId', {
      'topic': topic,
      'platform': platform,
      'problemsSolved': problemsSolved,
    });
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> importLeetCode(int studentId, String username) async {
    final response = await _post('$baseUrl/progress/$studentId/import-leetcode', {'username': username});
    return jsonDecode(response.body);
  }

  // ── ForgeMind AI Orchestrator ───────────────────────────────────────────
  static Future<Map<String, dynamic>> sendForgeMindChat(int studentId, String userQuery, {String? attachedText}) async {
    final response = await _post('$baseUrl/forgemind/$studentId/chat', {
      'userQuery': userQuery,
      'studentName': currentUser?['name'] ?? 'Student',
      'attachedText': attachedText ?? '',
    });
    return jsonDecode(response.body);
  }

  // ── Resume Analyzer ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> uploadResumeText(int studentId, String rawText, String fileName) async {
    final response = await _post('$baseUrl/resume/$studentId/upload', {
      'rawText': rawText,
      'fileName': fileName,
      'fileType': 'text/plain',
    });
    return jsonDecode(response.body);
  }

  // ── MCQ Practice ────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateMCQ(int studentId, String topic, String difficulty) async {
    final response = await _post('$baseUrl/questions/$studentId/generate', {'topic': topic, 'difficulty': difficulty});
    return jsonDecode(response.body);
  }

  // ── Coding Practice ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateCodingProblem(int studentId, String topic, String difficulty, String language) async {
    final response = await _post('$baseUrl/questions/$studentId/generate-coding', {'topic': topic, 'difficulty': difficulty, 'language': language});
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> executeCodingSolution(String code, String language, List testCases) async {
    final response = await _post('$baseUrl/questions/execute', {'code': code, 'language': language, 'testCases': testCases});
    return jsonDecode(response.body);
  }

  static Future<void> logCodingSolved(int studentId, String title, String topic, String difficulty, String language) async {
    await _post('$baseUrl/students/$studentId/preppilot-history', {'title': title, 'topic': topic, 'difficulty': difficulty, 'language': language});
  }

  // ── Mock Interview ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> startInterview(int studentId, String topic, String mode, String difficulty) async {
    final response = await _post('$baseUrl/interview/$studentId/start', {'topic': topic, 'mode': mode, 'difficulty': difficulty});
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> submitInterviewAnswer(int sessionId, String studentAnswer) async {
    final response = await _post('$baseUrl/interview/session/$sessionId/answer', {'studentAnswer': studentAnswer});
    return jsonDecode(response.body);
  }

  // ── Study Planner ───────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> generateStudyPlan(int studentId, String targetCompany, String targetDate) async {
    final response = await _post('$baseUrl/planner/$studentId/generate', {'targetCompany': targetCompany, 'target_date': targetDate});
    return jsonDecode(response.body);
  }

  // ── Opportunity Discovery ───────────────────────────────────────────────
  static Future<Map<String, dynamic>> getSavedOpportunities(int studentId) async {
    final response = await _get('$baseUrl/opportunities/$studentId/saved');
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
    final response = await _get('$baseUrl/students/staff/analytics');
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getStaffActivityFeed() async {
    final response = await _get('$baseUrl/students/staff/activity-feed');
    return jsonDecode(response.body);
  }
}
