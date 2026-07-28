import 'package:flutter/material.dart';

void main() {
  runApp(const CareerForgeApp());
}

class CareerForgeApp extends StatelessWidget {
  const CareerForgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CareerForge AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    ForgeMindScreen(),
    ProgressScreen(),
    PracticeScreen(),
    InterviewScreen(),
    PlanScreen(),
    ResumeScreen(),
    OpportunitiesScreen(),
  ];

  final List<String> _titles = const [
    'ForgeMind AI',
    'My Progress',
    'Practice',
    'Mock Interview',
    'My Plan',
    'Resume Analyzer',
    'Opportunity Discovery',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[_currentIndex], style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Connected to Live Render REST API (Guest Mode)')),
              );
            },
          ),
        ],
      ),
      drawer: NavigationDrawer(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) {
          setState(() => _currentIndex = idx);
          Navigator.pop(context);
        },
        children: const [
          Padding(
            padding: EdgeInsets.fromLTRB(28, 16, 16, 10),
            child: Text('CareerForge AI', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5))),
          ),
          NavigationDrawerDestination(icon: Icon(Icons.psychology), label: Text('ForgeMind AI')),
          NavigationDrawerDestination(icon: Icon(Icons.bar_chart), label: Text('My Progress')),
          NavigationDrawerDestination(icon: Icon(Icons.code), label: Text('Practice')),
          NavigationDrawerDestination(icon: Icon(Icons.record_voice_over), label: Text('Mock Interview')),
          NavigationDrawerDestination(icon: Icon(Icons.calendar_today), label: Text('My Plan')),
          NavigationDrawerDestination(icon: Icon(Icons.description), label: Text('Resume Analyzer')),
          NavigationDrawerDestination(icon: Icon(Icons.explore), label: Text('Opportunity Discovery')),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: MediaQuery.of(context).size.width < 600
          ? NavigationBar(
              selectedIndex: _currentIndex > 3 ? 0 : _currentIndex,
              onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
              destinations: const [
                NavigationDestination(icon: Icon(Icons.psychology), label: 'ForgeMind'),
                NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Progress'),
                NavigationDestination(icon: Icon(Icons.code), label: 'Practice'),
                NavigationDestination(icon: Icon(Icons.record_voice_over), label: 'Interview'),
              ],
            )
          : null,
    );
  }
}

class ForgeMindScreen extends StatelessWidget {
  const ForgeMindScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('ForgeMind AI Multi-Agent Orchestrator'));
  }
}

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('My Progress & Dashboard'));
  }
}

class PracticeScreen extends StatelessWidget {
  const PracticeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Coding Practice Engine'));
  }
}

class InterviewScreen extends StatelessWidget {
  const InterviewScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('AI Interview Simulator'));
  }
}

class PlanScreen extends StatelessWidget {
  const PlanScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Study Roadmap & Plan'));
  }
}

class ResumeScreen extends StatelessWidget {
  const ResumeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Resume Analyzer'));
  }
}

class OpportunitiesScreen extends StatelessWidget {
  const OpportunitiesScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('Opportunity Discovery'));
  }
}
