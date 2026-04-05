/**
 * ν-Voice: Bias Detection
 *
 * Detects 7 bias pattern types from user input using regex + linguistic analysis.
 * No external API calls — keeps cost $0 and avoids recursive loops.
 *
 * Pattern types:
 * - framework_lock: Theory becomes operating reality
 * - lossless_assumption: Unverified mechanism presented as fact
 * - asymmetric_boundary: One-directional rules for self vs others
 * - transference: Attributing own patterns to others
 * - circular_evidence: Using conclusion as evidence
 * - contradiction_loop: Self-contradiction within session
 * - other: Elevated certainty + hedging mismatch
 */

import { LambdaVoice } from './lambda-voice';

export interface NuAnalysis {
  detected: boolean;
  patterns: BiasPattern[];
  overallConfidence: number; // 0.0 to 1.0
  recommendations: string[];
}

export interface BiasPattern {
  type:
    | 'framework_lock'
    | 'lossless_assumption'
    | 'asymmetric_boundary'
    | 'transference'
    | 'circular_evidence'
    | 'contradiction_loop'
    | 'other';
  confidence: number; // 0.0 to 1.0
  evidence: string[]; // Quote excerpts from input
}

export class NuVoice {
  /**
   * Main detection entry point.
   * Runs all 7 bias detectors and returns composite analysis.
   */
  static detectBias(userInput: string, history?: string[]): NuAnalysis {
    const patterns: BiasPattern[] = [];

    // Run each detector
    const frameworkLock = this.detectFrameworkLock(userInput);
    const lossless = this.detectLosslessAssumption(userInput);
    const asymmetric = this.detectAsymmetricBoundary(userInput);
    const transference = this.detectTransference(userInput, history);
    const circular = this.detectCircularEvidence(userInput, history);
    const contradiction = this.detectContradictionLoop(userInput, history);
    const other = this.detectOther(userInput);

    // Collect results
    if (frameworkLock) patterns.push(frameworkLock);
    if (lossless) patterns.push(lossless);
    if (asymmetric) patterns.push(asymmetric);
    if (transference) patterns.push(transference);
    if (circular) patterns.push(circular);
    if (contradiction) patterns.push(contradiction);
    if (other) patterns.push(other);

    // Calculate overall confidence
    const overallConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
        : 0;

    return {
      detected: patterns.length > 0,
      patterns,
      overallConfidence,
      recommendations: this.buildRecommendations(patterns),
    };
  }

  /**
   * framework_lock: Theory presented as operating reality.
   * E.g. "Under the ETH framework, cortisol directly controls state transitions"
   * OR "My model shows that emotional state determines output"
   */
  private static detectFrameworkLock(input: string): BiasPattern | null {
    const patterns = [
      /under\s+(?:my|the)\s+([a-z\-]+)\s+framework[,.]?\s+([^.!?]+)/gi,
      /my\s+([a-z\-]+)\s+(?:model|theory|framework)\s+(?:shows|proves|demonstrates)\s+that\s+([^.!?]+)/gi,
      /the\s+([a-z\-]+)\s+framework\s+(?:means|implies|indicates)\s+([^.!?]+)/gi,
    ];

    const evidence: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        evidence.push(match[0].trim().slice(0, 100));
      }
    }

    if (evidence.length > 0) {
      return {
        type: 'framework_lock',
        confidence: Math.min(0.95, 0.6 + evidence.length * 0.15),
        evidence: evidence.slice(0, 3),
      };
    }

    return null;
  }

  /**
   * lossless_assumption: Unverified mechanism claimed as fact.
   * E.g. "Always", "Directly causes", "Without loss", "Lossless mechanism"
   */
  private static detectLosslessAssumption(input: string): BiasPattern | null {
    const certaintyMarkers =
      /\b(always|never|directly\s+causes?|without\s+loss|lossless|guaranteed|must\s+\w+)\b/gi;
    const mechanismPattern =
      /([a-z\-]+)\s+(?:causes?|leads?\s+to|results?\s+in|determines?|drives?)\s+([a-z\-]+)/gi;

    const certaintyMatches = Array.from(input.matchAll(certaintyMarkers));
    const mechanismMatches = Array.from(input.matchAll(mechanismPattern));

    // Combine for evidence
    const evidence: string[] = [];
    for (const match of certaintyMatches.slice(0, 3)) {
      evidence.push(match[0].trim());
    }
    for (const match of mechanismMatches.slice(0, 3)) {
      evidence.push(match[0].trim().slice(0, 80));
    }

    if (evidence.length > 0) {
      return {
        type: 'lossless_assumption',
        confidence: Math.min(0.9, 0.5 + evidence.length * 0.2),
        evidence,
      };
    }

    return null;
  }

  /**
   * asymmetric_boundary: One-directional rules.
   * E.g. "I can challenge you, but when you challenge me..." OR
   * "My stress causes transitions, but yours doesn't"
   */
  private static detectAsymmetricBoundary(input: string): BiasPattern | null {
    // Pattern: "I/my" followed by action, then "you/your" with different action
    const selfActionPattern =
      /\b(?:I|my)\s+(?:can\s+)?([a-z\-]+)\s+/gi;
    const oppositePattern =
      /\bbut\s+(?:when\s+)?(?:you|your)\s+(?:can't|can\s+)?(?:don't\s+)?([a-z\-]+)\s+/gi;

    // Also check for stress/emotional language asymmetry
    const stressLang =
      /my\s+(?:stress|cortisol|anxiety|emotion)[,.]?\s+(?:causes?|leads?\s+to)\s+([a-z\-]+)/gi;
    const challengeLang =
      /when\s+(?:you|challenged|criticized)/gi;

    const selfMatches = Array.from(input.matchAll(selfActionPattern));
    const opposite = Array.from(input.matchAll(oppositePattern));
    const stress = Array.from(input.matchAll(stressLang));
    const challenge = Array.from(input.matchAll(challengeLang));

    const evidence: string[] = [];
    if (selfMatches.length > 0 && (opposite.length > 0 || challenge.length > 0)) {
      for (const m of selfMatches.slice(0, 2)) evidence.push(m[0].trim());
      for (const m of opposite.slice(0, 2)) evidence.push(m[0].trim());
      for (const m of stress.slice(0, 2)) evidence.push(m[0].trim());
    }

    if (evidence.length > 0) {
      return {
        type: 'asymmetric_boundary',
        confidence: Math.min(0.85, 0.55 + evidence.length * 0.1),
        evidence,
      };
    }

    return null;
  }

  /**
   * transference: Attributing own patterns to others.
   * E.g. "You're being defensive" (when the user has been challenged)
   * OR "You misunderstood me" (repeated projections)
   */
  private static detectTransference(
    input: string,
    history?: string[]
  ): BiasPattern | null {
    const attributionPattern =
      /you(?:['']re|\s+are)?\s+(?:being\s+)?(?:defensive|aggressive|closed|emotional|evasive|stubborn)/gi;
    const misunderstandingPattern =
      /you\s+(?:misunderstood|misinterpreted|didn't\s+listen|didn't\s+get)/gi;

    const attribution = Array.from(input.matchAll(attributionPattern));
    const misunderstand = Array.from(input.matchAll(misunderstandingPattern));

    const evidence: string[] = [];
    for (const match of attribution.slice(0, 2)) evidence.push(match[0].trim());
    for (const match of misunderstand.slice(0, 2)) evidence.push(match[0].trim());

    // Check if this is a repeated pattern in history
    let repetitionBonus = 0;
    if (history && history.length > 0) {
      const historyMatches = history.filter(
        (line) =>
          attributionPattern.test(line) || misunderstandingPattern.test(line)
      ).length;
      repetitionBonus = Math.min(0.3, historyMatches * 0.1);
    }

    if (evidence.length > 0) {
      return {
        type: 'transference',
        confidence: Math.min(
          0.8,
          0.5 + evidence.length * 0.15 + repetitionBonus
        ),
        evidence,
      };
    }

    return null;
  }

  /**
   * circular_evidence: Using conclusion as evidence.
   * E.g. "Because I said so" or "As I already showed" without external reference.
   */
  private static detectCircularEvidence(
    input: string,
    history?: string[]
  ): BiasPattern | null {
    const circularPattern =
      /(?:because\s+)?(?:I\s+(?:said|showed|demonstrated|proved)|as\s+I\s+(?:said|showed|mentioned))[.,!?]?\s+(?!that\s+(?:the|a|external|research|evidence))/gi;
    const unsupportedClaim =
      /\bI\s+(?:clearly|obviously)\s+(?:showed|proved|demonstrated)\s+([^.!?]+)\./gi;

    const circular = Array.from(input.matchAll(circularPattern));
    const unsupported = Array.from(input.matchAll(unsupportedClaim));

    const evidence: string[] = [];
    for (const match of circular.slice(0, 2)) evidence.push(match[0].trim());
    for (const match of unsupported.slice(0, 2))
      evidence.push(match[0].trim().slice(0, 80));

    if (evidence.length > 0) {
      return {
        type: 'circular_evidence',
        confidence: Math.min(0.85, 0.55 + evidence.length * 0.15),
        evidence,
      };
    }

    return null;
  }

  /**
   * contradiction_loop: Self-contradiction within session.
   * Compare current input against history for conflicting claims.
   */
  private static detectContradictionLoop(
    input: string,
    history?: string[]
  ): BiasPattern | null {
    if (!history || history.length === 0) return null;

    // Look for negation of previous claims
    const negationPattern = /(?:not|n't|can't|won't|doesn't?|isn't)\s+([a-z\-]+)/gi;
    const currentNegations = Array.from(input.matchAll(negationPattern)).map(
      (m) => m[1]
    );

    const evidence: string[] = [];
    for (const histLine of history.slice(-3)) {
      // If history says something is true and current says it's false
      if (
        currentNegations.some((neg) =>
          histLine.toLowerCase().includes(neg.toLowerCase())
        )
      ) {
        evidence.push(`History: ${histLine.slice(0, 60)}...`);
        evidence.push(`Current: ${input.slice(0, 60)}...`);
      }
    }

    if (evidence.length > 0) {
      return {
        type: 'contradiction_loop',
        confidence: 0.7,
        evidence,
      };
    }

    return null;
  }

  /**
   * other: Elevated certainty with low hedging (pragmatic anomaly).
   */
  private static detectOther(input: string): BiasPattern | null {
    const features = LambdaVoice.detectLanguageFeatures(input);

    // High certainty + low hedging = suspicious
    // But only flag if both are high AND hedging is near-zero
    const certaintyScore = features.causalClaimCount + features.frameworkReferenceCount;
    const hedgingRatio =
      certaintyScore > 0 ? features.hedgingCount / certaintyScore : 1;

    // Stricter threshold: need >= 4 certainty claims AND < 10% hedging
    if (certaintyScore >= 4 && hedgingRatio < 0.1) {
      return {
        type: 'other',
        confidence: Math.min(
          0.75,
          0.4 + certaintyScore * 0.1 + (0.1 - hedgingRatio) * 0.2
        ),
        evidence: [
          `${certaintyScore} high-certainty claims with ${features.hedgingCount} hedges`,
        ],
      };
    }

    return null;
  }

  /**
   * Build recommendations based on detected patterns.
   */
  private static buildRecommendations(patterns: BiasPattern[]): string[] {
    const recs: string[] = [];

    for (const p of patterns) {
      switch (p.type) {
        case 'framework_lock':
          recs.push(
            'Distinguish between theoretical framework and observed reality'
          );
          break;
        case 'lossless_assumption':
          recs.push(
            'Ground causal claims in external evidence or empirical data'
          );
          break;
        case 'asymmetric_boundary':
          recs.push(
            'Apply reasoning standards consistently to self and others'
          );
          break;
        case 'transference':
          recs.push('Verify attributions before assigning traits to others');
          break;
        case 'circular_evidence':
          recs.push(
            'Reference external sources or logical steps, not self-authority'
          );
          break;
        case 'contradiction_loop':
          recs.push('Reconcile conflicting claims from this session');
          break;
        case 'other':
          recs.push('Add appropriate hedging to high-confidence claims');
          break;
      }
    }

    return [...new Set(recs)]; // Deduplicate
  }
}
