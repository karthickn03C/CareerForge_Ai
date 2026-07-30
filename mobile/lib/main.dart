import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'core/api_service.dart';

void main() {
  runApp(const CareerForgeApp());
}

class CareerForgeApp extends StatelessWidget {
  const CareerForgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CareerForge AI Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        primaryColor: const Color(0xFF4F46E5),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.dark,
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF1E293B),
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      home: const AuthScreen(),
    );
  }
}

// ── 1. AUTHENTICATION SCREEN ──────────────────────────────────────────────────
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  String _role = 'student'; // 'student' | 'staff'
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    ApiService.warmupServer();
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your email and password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      if (_isLogin) {
        final res = await ApiService.login(email, password);
        if (res['status'] == 200) {
          final user = ApiService.currentUser ?? {};
          final userRole = user['role'] ?? 'student';
          if (!mounted) return;

          if (userRole == 'staff') {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => StaffPortalScreen(user: user)),
            );
          } else {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => StudentPortalScreen(user: user)),
            );
          }
        } else {
          setState(() => _errorMessage = res['body']['error'] ?? 'Authentication failed.');
        }
      } else {
        final name = _nameController.text.trim();
        final confirmPassword = _confirmPasswordController.text.trim();
        if (name.isEmpty) {
          setState(() => _errorMessage = 'Please enter your full name.');
          return;
        }
        final res = await ApiService.register(name, email, password, confirmPassword);
        if (res['status'] == 201) {
          setState(() {
            _isLogin = true;
            _errorMessage = 'Account created successfully! Please sign in.';
          });
        } else {
          setState(() => _errorMessage = res['body']['error'] ?? 'Registration failed.');
        }
      }
    } catch (e) {
      setState(() => _errorMessage = 'Unable to connect to server: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _role == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (_role == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5)).withValues(alpha: 0.4),
                        blurRadius: 20,
                        spreadRadius: 4,
                      )
                    ],
                  ),
                  child: Icon(
                    _role == 'staff' ? Icons.admin_panel_settings : Icons.bolt,
                    size: 42,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'CareerForge AI',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  'AI Placement Command Center Mobile',
                  style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                ),
                const SizedBox(height: 24),

                // Role Toggle
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _role = 'student'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _role == 'student' ? const Color(0xFF4F46E5) : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Text('🎓 Student', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _role = 'staff'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _role == 'staff' ? const Color(0xFF10B981) : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Text('🏫 Faculty / Staff', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                if (_errorMessage.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.redAccent),
                    ),
                    child: Text(_errorMessage, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                  ),

                if (!_isLogin) ...[
                  TextField(
                    controller: _nameController,
                    decoration: InputDecoration(
                      labelText: 'Full Name',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                TextField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                  ),
                ),

                if (!_isLogin) ...[
                  const SizedBox(height: 14),
                  TextField(
                    controller: _confirmPasswordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Confirm Password',
                      prefixIcon: const Icon(Icons.lock_reset),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _role == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isLoading
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Connecting to Cloud...', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          )
                        : Text(
                            _isLogin ? (_role == 'staff' ? 'Sign In to Staff Portal' : 'Sign In to Student Dashboard') : 'Create Student Account',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                  ),
                ),

                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => setState(() => _isLogin = !_isLogin),
                  child: Text(
                    _isLogin ? 'Don\'t have an account? Create one' : 'Already registered? Sign In',
                    style: const TextStyle(color: Color(0xFF818CF8)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── 2. STUDENT PORTAL DASHBOARD & NAV ─────────────────────────────────────────
class StudentPortalScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const StudentPortalScreen({super.key, required this.user});

  @override
  State<StudentPortalScreen> createState() => _StudentPortalScreenState();
}

class _StudentPortalScreenState extends State<StudentPortalScreen> {
  int _selectedIndex = 0;
  Map<String, dynamic>? _studentData;
  bool _loading = true;

  int get studentId => widget.user['studentId'] ?? widget.user['id'] ?? 1;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final res = await ApiService.getStudentProfile(studentId);
      if (mounted) {
        setState(() {
          _studentData = res;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onTabTapped(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      StudentHomeTab(studentData: _studentData, studentId: studentId, onRefresh: _fetchProfile),
      ForgeMindChatTab(studentId: studentId),
      PracticeModuleTab(studentId: studentId),
      MockInterviewTab(studentId: studentId),
      ResumeAnalyzerTab(studentId: studentId, onRefresh: _fetchProfile),
      StudyPlannerTab(studentId: studentId),
      OpportunitiesTab(studentId: studentId),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('CareerForge AI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.indigoAccent),
            onPressed: _fetchProfile,
          ),
          IconButton(
            icon: const Icon(Icons.picture_as_pdf, color: Colors.amberAccent),
            onPressed: () => _openPdfReport(context, 'readiness', studentId),
            tooltip: 'Download PDF Report',
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () {
              ApiService.token = null;
              ApiService.currentUser = null;
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onTabTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFF4F46E5),
        unselectedItemColor: Colors.grey[500],
        selectedFontSize: 11,
        unselectedFontSize: 10,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.psychology_rounded), label: 'ForgeMind'),
          BottomNavigationBarItem(icon: Icon(Icons.code_rounded), label: 'Practice'),
          BottomNavigationBarItem(icon: Icon(Icons.record_voice_over_rounded), label: 'Interview'),
          BottomNavigationBarItem(icon: Icon(Icons.description_rounded), label: 'Resume'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: 'Planner'),
          BottomNavigationBarItem(icon: Icon(Icons.work_history_rounded), label: 'Jobs'),
        ],
      ),
    );
  }
}

// ── TAB 1: STUDENT HOME & READINESS METRICS ────────────────────────────────────
class StudentHomeTab extends StatelessWidget {
  final Map<String, dynamic>? studentData;
  final int studentId;
  final VoidCallback onRefresh;

  const StudentHomeTab({super.key, required this.studentData, required this.studentId, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final s = studentData ?? {};
    final readiness = s['placement_readiness'] ?? 0;
    final resumeScore = s['resume_score'] ?? 0;
    final codingScore = s['coding_score'] ?? 0;
    final interviewScore = s['interview_score'] ?? 0;

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Welcome Banner
          Card(
            color: const Color(0xFF1E1B4B),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Welcome, ${s['name'] ?? 'Candidate'}! 🚀',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                      Chip(
                        label: Text('${s['department'] ?? 'CSE'} • ${s['year'] ?? '4th Year'}',
                            style: const TextStyle(fontSize: 10, color: Colors.white)),
                        backgroundColor: const Color(0xFF4F46E5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text('Placement Readiness Score', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: readiness / 100.0,
                            minHeight: 12,
                            backgroundColor: Colors.white12,
                            valueColor: AlwaysStoppedAnimation(
                              readiness >= 75 ? const Color(0xFF10B981) : (readiness >= 50 ? Colors.orangeAccent : Colors.redAccent),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text('$readiness%', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Core Metric Cards Grid
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            children: [
              _buildMetricTile('Resume Score', '$resumeScore/100', Icons.description, Colors.blueAccent),
              _buildMetricTile('Coding Score', '$codingScore/100', Icons.code, const Color(0xFF10B981)),
              _buildMetricTile('Interview', '$interviewScore/100', Icons.mic, Colors.amberAccent),
            ],
          ),
          const SizedBox(height: 16),

          // Activity & Quick Actions
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Quick Placement Actions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: const Icon(Icons.picture_as_pdf, color: Colors.amberAccent),
                    title: const Text('Export Official PDF Readiness Report'),
                    subtitle: const Text('Download complete breakdown for placement drives'),
                    onTap: () => _openPdfReport(context, 'readiness', studentId),
                  ),
                  const Divider(color: Colors.white10),
                  ListTile(
                    leading: const Icon(Icons.assessment, color: Colors.tealAccent),
                    title: const Text('Sync LeetCode Account'),
                    subtitle: const Text('Import public problem solve statistics'),
                    onTap: () => _showLeetCodeDialog(context, studentId, onRefresh),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile(String title, String score, IconData icon, Color color) {
    return Card(
      color: const Color(0xFF1E293B),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(title, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(score, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// ── TAB 2: FORGEMIND AI CHAT & MASTER ORCHESTRATOR ───────────────────────────
class ForgeMindChatTab extends StatefulWidget {
  final int studentId;
  const ForgeMindChatTab({super.key, required this.studentId});

  @override
  State<ForgeMindChatTab> createState() => _ForgeMindChatTabState();
}

class _ForgeMindChatTabState extends State<ForgeMindChatTab> {
  final _queryController = TextEditingController();
  final List<Map<String, String>> _messages = [];
  bool _isThinking = false;

  Future<void> _sendQuery(String text) async {
    if (text.trim().isEmpty) return;
    setState(() {
      _messages.add({'sender': 'user', 'text': text});
      _isThinking = true;
    });
    _queryController.clear();

    try {
      final res = await ApiService.sendForgeMindChat(widget.studentId, text);
      final reply = res['markdownResponse'] ?? 'I have processed your placement query.';
      setState(() {
        _messages.add({'sender': 'ai', 'text': reply});
      });
    } catch (e) {
      setState(() {
        _messages.add({'sender': 'ai', 'text': 'Failed to reach ForgeMind AI service.'});
      });
    } finally {
      setState(() => _isThinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          color: const Color(0xFF1E1B4B),
          child: Row(
            children: const [
              Icon(Icons.psychology, color: Color(0xFF818CF8)),
              SizedBox(width: 8),
              Text('ForgeMind AI — Master Orchestrator', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ],
          ),
        ),
        Expanded(
          child: _messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.bolt, size: 48, color: Color(0xFF818CF8)),
                      const SizedBox(height: 12),
                      const Text('Ask ForgeMind AI anything about your placement', style: TextStyle(color: Colors.grey)),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        children: [
                          ActionChip(label: const Text('Show my progress'), onPressed: () => _sendQuery('Show my progress')),
                          ActionChip(label: const Text('Analyze my resume'), onPressed: () => _sendQuery('Analyze my uploaded resume')),
                          ActionChip(label: const Text('Generate MCQs'), onPressed: () => _sendQuery('Generate MCQs for DBMS')),
                          ActionChip(label: const Text('Generate PDF'), onPressed: () => _sendQuery('Generate PDF Report')),
                        ],
                      )
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) {
                    final msg = _messages[i];
                    final isUser = msg['sender'] == 'user';
                    return Align(
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        constraints: const BoxConstraints(maxWidth: 300),
                        decoration: BoxDecoration(
                          color: isUser ? const Color(0xFF4F46E5) : const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(msg['text']!, style: const TextStyle(color: Colors.white, fontSize: 13)),
                      ),
                    );
                  },
                ),
        ),
        if (_isThinking) const Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2)),
        Container(
          padding: const EdgeInsets.all(12),
          color: const Color(0xFF0F172A),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _queryController,
                  decoration: InputDecoration(
                    hintText: 'Ask ForgeMind AI...',
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.send, color: Color(0xFF4F46E5)),
                onPressed: () => _sendQuery(_queryController.text),
              )
            ],
          ),
        ),
      ],
    );
  }
}

// ── TAB 3: PRACTICE (MCQ & CODING CHALLENGE) ──────────────────────────────────
class PracticeModuleTab extends StatefulWidget {
  final int studentId;
  const PracticeModuleTab({super.key, required this.studentId});

  @override
  State<PracticeModuleTab> createState() => _PracticeModuleTabState();
}

class _PracticeModuleTabState extends State<PracticeModuleTab> {
  String _mode = 'mcq'; // 'mcq' | 'coding'
  String _topic = 'Aptitude';
  String _difficulty = 'medium';
  String _language = 'python';

  // MCQ state
  Map<String, dynamic>? _mcq;
  String? _selectedOption;
  bool _submittedMcq = false;
  bool _loadingMcq = false;

  // Coding state
  Map<String, dynamic>? _codingProblem;
  final _codeController = TextEditingController();
  bool _loadingCoding = false;
  List? _testResults;

  Future<void> _fetchMcq() async {
    setState(() {
      _loadingMcq = true;
      _mcq = null;
      _selectedOption = null;
      _submittedMcq = false;
    });
    try {
      final res = await ApiService.generateMCQ(widget.studentId, _topic, _difficulty);
      setState(() => _mcq = res);
    } catch (e) {
      // Error handling
    } finally {
      setState(() => _loadingMcq = false);
    }
  }

  Future<void> _fetchCoding() async {
    setState(() {
      _loadingCoding = true;
      _codingProblem = null;
      _testResults = null;
    });
    try {
      final res = await ApiService.generateCodingProblem(widget.studentId, _topic, _difficulty, _language);
      setState(() {
        _codingProblem = res;
        _codeController.text = res['starterCode'] ?? '# Write solution here\n';
      });
    } catch (e) {
      // Error handling
    } finally {
      setState(() => _loadingCoding = false);
    }
  }

  Future<void> _submitCoding() async {
    if (_codingProblem == null) return;
    final res = await ApiService.executeCodingSolution(_codeController.text, _language, _codingProblem!['testCases'] ?? []);
    setState(() {
      _testResults = res['results'];
    });
    if (res['results'] != null && (res['results'] as List).every((r) => r['passed'] == true)) {
      ApiService.logCodingSolved(widget.studentId, _codingProblem!['title'] ?? 'Challenge', _topic, _difficulty, _language);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Mode Selector
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.quiz),
                label: const Text('MCQ Practice'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mode == 'mcq' ? const Color(0xFF4F46E5) : const Color(0xFF1E293B),
                ),
                onPressed: () => setState(() => _mode = 'mcq'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.code),
                label: const Text('Coding Challenge'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mode == 'coding' ? const Color(0xFF10B981) : const Color(0xFF1E293B),
                ),
                onPressed: () => setState(() => _mode = 'coding'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        if (_mode == 'mcq') ...[
          DropdownButtonFormField<String>(
            value: _topic,
            items: ['Aptitude', 'Programming', 'DBMS', 'OS', 'CN', 'OOP', 'SQL', 'Java', 'Python', 'C++', 'DSA']
                .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                .toList(),
            onChanged: (val) => setState(() => _topic = val!),
            decoration: const InputDecoration(labelText: 'Select MCQ Topic', filled: true, fillColor: Color(0xFF1E293B)),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loadingMcq ? null : _fetchMcq,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
            child: _loadingMcq ? const CircularProgressIndicator(color: Colors.white) : const Text('Generate Placement MCQ'),
          ),
          const SizedBox(height: 16),
          if (_mcq != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_mcq!['question'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 16),
                    ...((_mcq!['options'] as List? ?? []).map((opt) {
                      final isSelected = _selectedOption == opt;
                      final isCorrect = opt == _mcq!['correctAnswer'];
                      Color bg = const Color(0xFF0F172A);
                      if (_submittedMcq) {
                        if (isCorrect) bg = Colors.green.withValues(alpha: 0.3);
                        if (isSelected && !isCorrect) bg = Colors.red.withValues(alpha: 0.3);
                      } else if (isSelected) {
                        bg = const Color(0xFF4F46E5).withValues(alpha: 0.3);
                      }
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
                        child: RadioListTile<String>(
                          title: Text(opt, style: const TextStyle(color: Colors.white, fontSize: 13)),
                          value: opt,
                          groupValue: _selectedOption,
                          onChanged: _submittedMcq ? null : (v) => setState(() => _selectedOption = v),
                        ),
                      );
                    })),
                    const SizedBox(height: 12),
                    if (!_submittedMcq)
                      ElevatedButton(
                        onPressed: _selectedOption == null ? null : () => setState(() => _submittedMcq = true),
                        child: const Text('Submit Answer'),
                      ),
                    if (_submittedMcq) ...[
                      const Divider(color: Colors.white12),
                      Text('Explanation: ${_mcq!['explanation']}', style: const TextStyle(color: Colors.amberAccent, fontSize: 13)),
                    ]
                  ],
                ),
              ),
            )
          ]
        ] else ...[
          // Coding Mode
          ElevatedButton(
            onPressed: _loadingCoding ? null : _fetchCoding,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            child: _loadingCoding ? const CircularProgressIndicator(color: Colors.white) : const Text('Generate AI Coding Challenge'),
          ),
          const SizedBox(height: 16),
          if (_codingProblem != null) ...[
            Text(_codingProblem!['title'] ?? 'Challenge', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 8),
            Text(_codingProblem!['description'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 14),
            TextField(
              controller: _codeController,
              maxLines: 8,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12, color: const Color(0xFF10B981)),
              decoration: const InputDecoration(filled: true, fillColor: Color(0xFF0F172A), border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.play_arrow),
              label: const Text('Run Code & Verify Testcases'),
              onPressed: _submitCoding,
            ),
            if (_testResults != null) ...[
              const SizedBox(height: 12),
              ...(_testResults!.map((r) => Container(
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(bottom: 6),
                    color: r['passed'] == true ? Colors.green.withValues(alpha: 0.2) : Colors.red.withValues(alpha: 0.2),
                    child: Text('Test Case: ${r['passed'] == true ? "PASSED" : "FAILED"}', style: TextStyle(color: r['passed'] == true ? Colors.green : Colors.red)),
                  ))),
            ]
          ]
        ]
      ],
    );
  }
}

// ── TAB 4: MOCK INTERVIEW ─────────────────────────────────────────────────────
class MockInterviewTab extends StatefulWidget {
  final int studentId;
  const MockInterviewTab({super.key, required this.studentId});

  @override
  State<MockInterviewTab> createState() => _MockInterviewTabState();
}

class _MockInterviewTabState extends State<MockInterviewTab> {
  int? _sessionId;
  String? _question;
  final _answerController = TextEditingController();
  Map<String, dynamic>? _feedback;
  bool _loading = false;

  Future<void> _startSession() async {
    setState(() {
      _loading = true;
      _feedback = null;
    });
    try {
      final res = await ApiService.startInterview(widget.studentId, 'Technical', 'technical', 'intermediate');
      setState(() {
        _sessionId = res['sessionId'] ?? res['id'];
        _question = res['question'];
      });
    } catch (e) {
      // Handle error
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submitAnswer() async {
    if (_sessionId == null) return;
    setState(() => _loading = true);
    try {
      final res = await ApiService.submitInterviewAnswer(_sessionId!, _answerController.text);
      setState(() => _feedback = res);
    } catch (e) {
      // Handle error
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_question == null)
          ElevatedButton.icon(
            icon: const Icon(Icons.video_call),
            label: const Text('Start AI Technical Mock Interview'),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5), padding: const EdgeInsets.all(16)),
            onPressed: _loading ? null : _startSession,
          )
        else ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Interviewer Question:', style: TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(_question!, style: const TextStyle(color: Colors.white, fontSize: 15)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _answerController,
            maxLines: 5,
            decoration: const InputDecoration(hintText: 'Type your technical answer here...', filled: true, fillColor: Color(0xFF1E293B)),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loading ? null : _submitAnswer,
            child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Submit Answer for AI Evaluation'),
          ),
          if (_feedback != null) ...[
            const SizedBox(height: 16),
            Card(
              color: const Color(0xFF0F172A),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AI Interview Score: ${_feedback!['score']}/10', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.greenAccent)),
                    const SizedBox(height: 8),
                    Text('Feedback: ${_feedback!['strengths']}', style: const TextStyle(color: Colors.white70)),
                  ],
                ),
              ),
            )
          ]
        ]
      ],
    );
  }
}

// ── TAB 5: RESUME ATS ANALYZER ────────────────────────────────────────────────
class ResumeAnalyzerTab extends StatefulWidget {
  final int studentId;
  final VoidCallback onRefresh;

  const ResumeAnalyzerTab({super.key, required this.studentId, required this.onRefresh});

  @override
  State<ResumeAnalyzerTab> createState() => _ResumeAnalyzerTabState();
}

class _ResumeAnalyzerTabState extends State<ResumeAnalyzerTab> {
  final _resumeTextController = TextEditingController();
  Map<String, dynamic>? _analysis;
  bool _loading = false;

  Future<void> _analyzeResume() async {
    if (_resumeTextController.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      final res = await ApiService.uploadResumeText(widget.studentId, _resumeTextController.text, 'Pasted_Resume.txt');
      setState(() => _analysis = res);
      widget.onRefresh();
    } catch (e) {
      // Error
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('AI Resume ATS Scanner', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 8),
        const Text('Paste your resume text below for instant ATS evaluation and keyword gap analysis', style: TextStyle(color: Colors.grey)),
        const SizedBox(height: 16),
        TextField(
          controller: _resumeTextController,
          maxLines: 8,
          decoration: const InputDecoration(hintText: 'Paste resume contents here...', filled: true, fillColor: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          icon: const Icon(Icons.analytics),
          label: const Text('Analyze Resume ATS Score'),
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
          onPressed: _loading ? null : _analyzeResume,
        ),
        if (_analysis != null) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Overall ATS Score: ${(_analysis!['ats_scores'] ?? _analysis!['atsScores'] ?? {})['overallScore'] ?? 75}/100',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF10B981))),
                  const SizedBox(height: 12),
                  const Text('AI Feedback & Recommendations:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text('${_analysis!['feedback_json'] ?? 'Resume structure is clear with strong technical focus.'}', style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
          )
        ]
      ],
    );
  }
}

// ── TAB 6: STUDY PLANNER ──────────────────────────────────────────────────────
class StudyPlannerTab extends StatefulWidget {
  final int studentId;
  const StudyPlannerTab({super.key, required this.studentId});

  @override
  State<StudyPlannerTab> createState() => _StudyPlannerTabState();
}

class _StudyPlannerTabState extends State<StudyPlannerTab> {
  final _companyController = TextEditingController(text: 'Google');
  Map<String, dynamic>? _plan;
  bool _loading = false;

  Future<void> _generatePlan() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.generateStudyPlan(widget.studentId, _companyController.text, '2026-09-01');
      setState(() => _plan = res);
    } catch (e) {
      // Error
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _companyController,
          decoration: const InputDecoration(labelText: 'Target Company (e.g. Google, TCS, Zoho)', filled: true, fillColor: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: _loading ? null : _generatePlan,
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4F46E5)),
          child: _loading ? const CircularProgressIndicator(color: Colors.white) : const Text('Generate Company Study Roadmap'),
        ),
        if (_plan != null) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Roadmap for ${_plan!['targetCompany'] ?? 'Target'}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 12),
                  ...(((_plan!['plan'] ?? _plan!['plan_json'] ?? []) as List).map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text('• ${item['day_or_week']}: ${item['focus_topic']}', style: const TextStyle(color: Colors.amberAccent)),
                      ))),
                ],
              ),
            ),
          )
        ]
      ],
    );
  }
}

// ── TAB 7: OPPORTUNITIES ──────────────────────────────────────────────────────
class OpportunitiesTab extends StatefulWidget {
  final int studentId;
  const OpportunitiesTab({super.key, required this.studentId});

  @override
  State<OpportunitiesTab> createState() => _OpportunitiesTabState();
}

class _OpportunitiesTabState extends State<OpportunitiesTab> {
  List _opportunities = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final res = await ApiService.getSavedOpportunities(widget.studentId);
      setState(() {
        _opportunities = res['opportunities'] ?? [];
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _opportunities.isEmpty ? 1 : _opportunities.length,
            itemBuilder: (_, i) {
              if (_opportunities.isEmpty) {
                return const Center(child: Text('No placement drives found.', style: TextStyle(color: Colors.grey)));
              }
              final item = _opportunities[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(item['title'] ?? 'Drive Opportunity', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text('${item['organization'] ?? 'Tech Company'} • ${item['type'] ?? 'Job'}', style: const TextStyle(color: Colors.grey)),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Color(0xFF4F46E5)),
                ),
              );
            },
          );
  }
}

// ── 3. STAFF PORTAL DASHBOARD ──────────────────────────────────────────────────
class StaffPortalScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const StaffPortalScreen({super.key, required this.user});

  @override
  State<StaffPortalScreen> createState() => _StaffPortalScreenState();
}

class _StaffPortalScreenState extends State<StaffPortalScreen> {
  Map<String, dynamic>? _analytics;
  List _activityFeed = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchStaffData();
  }

  Future<void> _fetchStaffData() async {
    try {
      final a = await ApiService.getStaffAnalytics();
      final f = await ApiService.getStaffActivityFeed();
      if (mounted) {
        setState(() {
          _analytics = a;
          _activityFeed = f['activities'] ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = _analytics?['stats'] ?? {};
    final students = (_analytics?['students'] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Faculty Placement Command Center', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF10B981),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchStaffData),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () {
              ApiService.token = null;
              ApiService.currentUser = null;
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
            },
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Stats Card Grid
                Row(
                  children: [
                    Expanded(child: _buildStatBox('Total Monitored', '${stats['totalStudents'] ?? 0}', Colors.blueAccent)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatBox('Active Today', '${stats['activeToday'] ?? 0}', const Color(0xFF10B981))),
                    const SizedBox(width: 8),
                    Expanded(child: _buildStatBox('At Risk', '${stats['studentsAtRisk'] ?? 0}', Colors.redAccent)),
                  ],
                ),
                const SizedBox(height: 16),

                const Text('Live Student Roster', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                ...students.map((st) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(st['name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        subtitle: Text('${st['department']} • Readiness: ${st['readinessScore']}%', style: const TextStyle(color: Colors.grey)),
                        trailing: Chip(
                          label: Text(st['isAtRisk'] == true ? 'At Risk' : 'Ready', style: const TextStyle(fontSize: 10, color: Colors.white)),
                          backgroundColor: st['isAtRisk'] == true ? Colors.redAccent : Colors.green,
                        ),
                      ),
                    )),
              ],
            ),
    );
  }

  Widget _buildStatBox(String title, String val, Color col) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Text(title, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: col)),
        ],
      ),
    );
  }
}

// ── PDF LAUNCHER HELPER ──────────────────────────────────────────────────────
void _openPdfReport(BuildContext context, String reportType, int studentId) async {
  final url = ApiService.getPdfUrl(reportType, studentId);
  final uri = Uri.parse(url);
  if (await canLaunchUrl(uri)) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  } else {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Report generated: $url')));
    }
  }
}

void _showLeetCodeDialog(BuildContext context, int studentId, VoidCallback onRefresh) {
  final controller = TextEditingController();
  showDialog(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Sync LeetCode Account'),
      content: TextField(controller: controller, decoration: const InputDecoration(hintText: 'Enter LeetCode username')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () async {
            if (controller.text.isNotEmpty) {
              await ApiService.importLeetCode(studentId, controller.text);
              onRefresh();
              if (dialogContext.mounted) {
                Navigator.pop(dialogContext);
              }
            }
          },
          child: const Text('Sync'),
        )
      ],
    ),
  );
}
