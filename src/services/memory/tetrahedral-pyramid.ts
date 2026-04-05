/**
 * Tetrahedral Memory Pyramid
 *
 * 4-face pyramid (λ/μ/ν/ω) + center anchor (⊕)
 * Replaces MacCubeFACE's 6-face cube for anti-sycophancy focus.
 *
 * Structure:
 *   λ (Lambda - Local): Session-local state + current context
 *   μ (Mu - Guide): Historical patterns + cross-references
 *   ν (Nu - Mirror): Bias detection + contradictions surfaced
 *   ω (Omega - Compositor): Assembled response + friction preserved
 *   ⊕ (Center): Cross-session user bias patterns
 *
 * Usage:
 *   const pyramid = new TetrahedralPyramid();
 *   const muPatterns = await pyramid.getMuPatterns(userId, input);
 *   await pyramid.recordSession(userId, {...});
 */

import { MuVoiceSimilarity } from './mu-voice-similarity';

export interface LocalState {
  sessionId: string;
  userId: string;
  userInput: string;
  conversationContext: string[];
  frameIntroduced: string; // User's current framework/context
  timestamp: string;
}

export interface HistoricalPattern {
  sessionId: string;
  date: string;
  pattern: string;
  context: string;
  relatedFrameworks: string[];
  resolved: boolean;
}

export interface BiasDetection {
  sessionId: string;
  patternType:
    | 'framework_lock'
    | 'lossless_assumption'
    | 'asymmetric_boundary'
    | 'transference'
    | 'circular_evidence'
    | 'contradiction_loop'
    | 'other';
  description: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  surfaced: boolean;
}

export interface ComposedResponse {
  sessionId: string;
  userInput: string;
  lambdaVoice: string;
  muVoice: string;
  nuVoice: string;
  finalComposition: string;
  truthScore: number;
  frictionPreserved: boolean;
  timestamp: string;
}

export interface UserBiasProfile {
  userId: string;
  frameworks: string[];
  detectedBiases: Map<string, number>; // pattern -> frequency
  asymmetricBoundaries: string[];
  transferencePatterns: string[];
  lastUpdated: string;
  successfulInterventions: string[];
  failedInterventions: string[];
}

export class TetrahedralPyramid {
  // Faces (session-local)
  private lambdaFace: Map<string, LocalState> = new Map(); // sessionId -> state
  private muFace: Map<string, HistoricalPattern[]> = new Map(); // userId -> patterns
  private nuFace: Map<string, BiasDetection[]> = new Map(); // sessionId -> detections
  private omegaFace: Map<string, ComposedResponse> = new Map(); // sessionId -> response

  // Center anchor (cross-session)
  private centerAnchor: Map<string, UserBiasProfile> = new Map(); // userId -> profile

  // Similarity service for μ pattern matching
  private muSimilarity: MuVoiceSimilarity;

  // File persistence (would be connected to electron service in production)
  private persistenceAdapter?: {
    saveUserProfile: (profile: UserBiasProfile) => Promise<void>;
    loadUserProfile: (userId: string) => Promise<UserBiasProfile | null>;
  };

  constructor(options?: {
    persistenceAdapter?: {
      saveUserProfile: (profile: UserBiasProfile) => Promise<void>;
      loadUserProfile: (userId: string) => Promise<UserBiasProfile | null>;
    };
    embeddingFn?: (text: string) => Promise<number[]>;
  }) {
    this.muSimilarity = new MuVoiceSimilarity({
      embeddingFn: options?.embeddingFn,
    });
    this.persistenceAdapter = options?.persistenceAdapter;
  }

  /**
   * Initialize session - loads prior user profile
   */
  async initializeSession(userId: string, sessionId: string): Promise<void> {
    // Load user's cross-session profile from center
    if (this.persistenceAdapter) {
      const profile = await this.persistenceAdapter.loadUserProfile(userId);
      if (profile) {
        this.centerAnchor.set(userId, profile);
        // Pre-seed nu face with known patterns
        this.nuFace.set(sessionId, []);
      }
    }

    // Initialize session state
    if (!this.muFace.has(userId)) {
      this.muFace.set(userId, []);
    }
  }

  /**
   * λ Face: Capture immediate user input and context
   */
  captureLocalState(
    sessionId: string,
    userId: string,
    userInput: string,
    context: { frame?: string; history?: string[] } = {}
  ): LocalState {
    const state: LocalState = {
      sessionId,
      userId,
      userInput,
      conversationContext: context.history || [],
      frameIntroduced: context.frame || '',
      timestamp: new Date().toISOString(),
    };

    this.lambdaFace.set(sessionId, state);
    return state;
  }

  /**
   * μ Face: Search historical patterns similar to current input
   * Returns patterns above similarity threshold (0.8).
   */
  async getMuPatterns(userId: string, userInput: string): Promise<string[]> {
    const patterns = this.muFace.get(userId) || [];

    if (patterns.length === 0) {
      return [];
    }

    // Find similar historical patterns
    const contextStrings = patterns.map((p) => p.context);
    const similar = await this.muSimilarity.findSimilar(userInput, contextStrings);

    // Extract context of similar patterns, sorted by relevance
    return similar.map((s) => patterns[s.index].context);
  }

  /**
   * Store historical pattern (called after resolution)
   */
  recordHistoricalPattern(
    userId: string,
    pattern: HistoricalPattern
  ): void {
    const patterns = this.muFace.get(userId) || [];
    patterns.push(pattern);
    this.muFace.set(userId, patterns);
  }

  /**
   * ν Face: Record bias detection in session
   */
  recordBiasDetection(
    sessionId: string,
    detection: BiasDetection
  ): void {
    const detections = this.nuFace.get(sessionId) || [];
    detections.push(detection);
    this.nuFace.set(sessionId, detections);
  }

  /**
   * ν Face: Get all bias detections for a session
   */
  getSurfacedBiases(sessionId: string): BiasDetection[] {
    return (this.nuFace.get(sessionId) || []).filter((d) => d.surfaced);
  }

  /**
   * ω Face: Record composed response
   */
  recordComposedResponse(response: ComposedResponse): void {
    this.omegaFace.set(response.sessionId, response);
  }

  /**
   * ω Face: Get composed response
   */
  getComposedResponse(sessionId: string): ComposedResponse | undefined {
    return this.omegaFace.get(sessionId);
  }

  /**
   * ⊕ Center: Get user's cross-session bias profile
   */
  getUserBiasProfile(userId: string): UserBiasProfile | null {
    return this.centerAnchor.get(userId) || null;
  }

  /**
   * ⊕ Center: Update user bias profile
   * Called at end of session to record patterns detected.
   */
  async updateUserBiasProfile(
    userId: string,
    updates: {
      detectedBias?: string;
      biasFrequency?: number;
      successfulIntervention?: string;
      failedIntervention?: string;
    }
  ): Promise<void> {
    let profile = this.centerAnchor.get(userId);

    if (!profile) {
      profile = {
        userId,
        frameworks: [],
        detectedBiases: new Map(),
        asymmetricBoundaries: [],
        transferencePatterns: [],
        lastUpdated: new Date().toISOString(),
        successfulInterventions: [],
        failedInterventions: [],
      };
    }

    if (updates.detectedBias) {
      const currentFreq = profile.detectedBiases.get(updates.detectedBias) || 0;
      profile.detectedBiases.set(
        updates.detectedBias,
        (updates.biasFrequency || currentFreq + 1)
      );
    }

    if (updates.successfulIntervention) {
      if (
        !profile.successfulInterventions.includes(
          updates.successfulIntervention
        )
      ) {
        profile.successfulInterventions.push(updates.successfulIntervention);
      }
    }

    if (updates.failedIntervention) {
      if (!profile.failedInterventions.includes(updates.failedIntervention)) {
        profile.failedInterventions.push(updates.failedIntervention);
      }
    }

    profile.lastUpdated = new Date().toISOString();
    this.centerAnchor.set(userId, profile);

    // Persist if adapter available
    if (this.persistenceAdapter) {
      await this.persistenceAdapter.saveUserProfile(profile);
    }
  }

  /**
   * Check if a bias pattern is established (3+ occurrences)
   */
  isEstablishedPattern(userId: string, patternType: string): boolean {
    const profile = this.getUserBiasProfile(userId);
    if (!profile) return false;

    const frequency = profile.detectedBiases.get(patternType) || 0;
    return frequency >= 3;
  }

  /**
   * Get all established patterns for a user
   */
  getEstablishedPatterns(userId: string): string[] {
    const profile = this.getUserBiasProfile(userId);
    if (!profile) return [];

    return Array.from(profile.detectedBiases.entries())
      .filter(([_, frequency]) => frequency >= 3)
      .map(([pattern, _]) => pattern);
  }

  /**
   * End session: consolidate detections into μ patterns
   */
  async endSession(sessionId: string, userId: string): Promise<void> {
    const detections = this.nuFace.get(sessionId) || [];
    const localState = this.lambdaFace.get(sessionId);

    if (detections.length > 0 && localState) {
      // Convert surfaced biases to historical patterns for μ
      for (const detection of detections) {
        if (detection.surfaced) {
          this.recordHistoricalPattern(userId, {
            sessionId,
            date: new Date().toISOString(),
            pattern: `${detection.patternType}: ${detection.description}`,
            context: detection.evidence,
            relatedFrameworks: [],
            resolved: false,
          });

          // Update center anchor with detected bias
          await this.updateUserBiasProfile(userId, {
            detectedBias: detection.patternType,
          });
        }
      }
    }

    // Cleanup session-local faces
    this.lambdaFace.delete(sessionId);
    this.nuFace.delete(sessionId);
    this.omegaFace.delete(sessionId);
  }

  /**
   * μ Voice statistics for debugging
   */
  getMuVoiceStats() {
    return {
      cachedEmbeddings: this.muSimilarity.getCacheStats(),
      totalPatterns: Array.from(this.muFace.values()).reduce(
        (sum, p) => sum + p.length,
        0
      ),
      usersTracked: this.centerAnchor.size,
    };
  }

  /**
   * Clear all session data (testing only)
   */
  clearSessionData(): void {
    this.lambdaFace.clear();
    this.nuFace.clear();
    this.omegaFace.clear();
    this.muSimilarity.clearCache();
  }
}
