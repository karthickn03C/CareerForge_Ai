import 'package:flutter/material.dart';

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
        primarySwatch: Colors.indigo,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.dark,
        ),
      ),
      home: const AuthScreen(),
    );
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  String _selectedRole = 'student'; // 'student' | 'staff'
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  void _handleLogin() {
    final email = _emailController.text.trim();
    if (email.isEmpty) return;

    if (_selectedRole == 'staff') {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => StaffPortalScreen(userEmail: email)),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => StudentPortalScreen(userEmail: email)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _selectedRole == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: (_selectedRole == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5)).withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      )
                    ],
                  ),
                  child: Icon(
                    _selectedRole == 'staff' ? Icons.admin_panel_settings : Icons.bolt,
                    size: 40,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'CareerForge AI',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  'AI Placement Intelligence Mobile',
                  style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                ),
                const SizedBox(height: 32),

                // Role Toggle Pills
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedRole = 'student'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _selectedRole == 'student' ? const Color(0xFF4F46E5) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Center(
                              child: Text('🎓 Student', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedRole = 'staff'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _selectedRole == 'staff' ? const Color(0xFF10B981) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
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
                const SizedBox(height: 24),

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
                const SizedBox(height: 16),
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
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _handleLogin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _selectedRole == 'staff' ? const Color(0xFF10B981) : const Color(0xFF4F46E5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(
                      _selectedRole == 'staff' ? 'Access Faculty Portal' : 'Access Student Dashboard',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
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

class StudentPortalScreen extends StatelessWidget {
  final String userEmail;
  const StudentPortalScreen({super.key, required this.userEmail});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student AI Mobile Portal'),
        backgroundColor: const Color(0xFF4F46E5),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Welcome, $userEmail', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text('AI Placement Readiness Index: 88%', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            tileColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.psychology, color: Color(0xFF818CF8)),
            title: const Text('ForgeMind AI Orchestrator'),
            subtitle: const Text('Multi-agent query routing'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const SizedBox(height: 10),
          ListTile(
            tileColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.code, color: Color(0xFF34D399)),
            title: const Text('Coding Practice & Runner'),
            subtitle: const Text('LeetCode synced & ListNode support'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const SizedBox(height: 10),
          ListTile(
            tileColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.description, color: Color(0xFFFBBF24)),
            title: const Text('Resume ATS Analyzer'),
            subtitle: const Text('AI Score breakdown & feedback'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
        ],
      ),
    );
  }
}

class StaffPortalScreen extends StatelessWidget {
  final String userEmail;
  const StaffPortalScreen({super.key, required this.userEmail});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Faculty & Admin Analytics'),
        backgroundColor: const Color(0xFF10B981),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Faculty Member: $userEmail', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  const Text('Active Placement Drives: 3 Open', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            tileColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.analytics, color: Color(0xFF10B981)),
            title: const Text('Batch Analytics & Risk Roster'),
            subtitle: const Text('Track candidates needing assistance'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
          const SizedBox(height: 10),
          ListTile(
            tileColor: const Color(0xFF1E293B),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.business_center, color: Color(0xFF60A5FA)),
            title: const Text('Placement Drive Requirements'),
            subtitle: const Text('Google, AWS, Microsoft cutoffs'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          ),
        ],
      ),
    );
  }
}
