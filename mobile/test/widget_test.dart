import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('CareerForgeApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CareerForgeApp());
    expect(find.text('CareerForge AI'), findsOneWidget);
  });
}
