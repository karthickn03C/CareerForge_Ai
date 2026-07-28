class ApiConfig {
  // Production Render Backend Endpoint
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://careerforge-ai-2bbv.onrender.com/api',
  );

  static const String healthEndpoint = '$baseUrl/health';
  static const String forgemindChat = '$baseUrl/forgemind';
  static const String resumeUpload = '$baseUrl/resume';
  static const String progressSync = '$baseUrl/progress';
  static const String practiceQuestions = '$baseUrl/questions';
  static const String mockInterview = '$baseUrl/interview';
  static const String studyPlan = '$baseUrl/planner';
  static const String opportunities = '$baseUrl/opportunities';
}
