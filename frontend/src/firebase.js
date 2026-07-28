/**
 * Fallback Auth Helper for Browser & Offline Demo Execution
 */

export async function signInWithGoogle() {
  return {
    uid: 'demo_candidate_123',
    name: 'Karthick Naveen S',
    email: 'karthick@careerforge.ai',
    photoURL: null
  };
}

export async function signOutUser() {
  return true;
}
