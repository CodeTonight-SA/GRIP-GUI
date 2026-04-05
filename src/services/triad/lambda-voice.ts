/**
 * λ-Voice: Immediate Context Builder
 *
 * Captures the immediate turn context (user input, session frame, recent history).
 * Feeds into ν-voice for bias detection and ω-voice for composition.
 *
 * No external calls. Pure data transformation.
 */

export interface LambdaContext {
  userInput: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  recentExchanges: string[]; // Last 3 user/assistant exchanges
  frameIntroduced?: string; // e.g. 'ETH', 'ISA-95'
}

export class LambdaVoice {
  /**
   * Build immediate context from current turn.
   * Used by ν-voice to detect patterns and ω-voice to compose enriched prompt.
   */
  static buildContext(options: {
    userInput: string;
    sessionId: string;
    userId: string;
    recentExchanges?: string[];
    frameIntroduced?: string;
  }): LambdaContext {
    return {
      userInput: options.userInput,
      sessionId: options.sessionId,
      userId: options.userId,
      timestamp: new Date().toISOString(),
      recentExchanges: options.recentExchanges ?? [],
      frameIntroduced: options.frameIntroduced,
    };
  }

  /**
   * Extract key entities from user input for pattern matching.
   * Used by ν-voice for bias detection.
   */
  static extractEntities(input: string): {
    selfReferences: string[]; // "my X", "I feel", "my cortisol"
    challengeResponses: string[]; // "but you", "when challenged", "you said"
    certaintyMarkers: string[]; // "always", "directly causes", "lossless"
    assumptionMarkers: string[]; // "it's clear that", "obviously", "everyone knows"
  } {
    const selfPattern = /\b(my|I|me|myself)\s+([a-z]+(?:\s+[a-z]+)?)/gi;
    const challengePattern = /(you(?:\s+\w+)*|when\s+challenged|if\s+you)/gi;
    const certaintyPattern =
      /\b(always|never|directly\s+causes|lossless|without\s+loss|guaranteed|must)\b/gi;
    const assumptionPattern =
      /\b(obviously|clearly|everyone\s+knows|it's\s+plain|of\s+course|naturally)\b/gi;

    return {
      selfReferences: Array.from(input.matchAll(selfPattern)).map((m) => m[0]),
      challengeResponses: Array.from(input.matchAll(challengePattern)).map(
        (m) => m[0]
      ),
      certaintyMarkers: Array.from(input.matchAll(certaintyPattern)).map(
        (m) => m[0]
      ),
      assumptionMarkers: Array.from(input.matchAll(assumptionPattern)).map(
        (m) => m[0]
      ),
    };
  }

  /**
   * Detect language features common in biased reasoning.
   */
  static detectLanguageFeatures(input: string): {
    hedgingCount: number; // "maybe", "perhaps", "might"
    negationCount: number; // "not", "isn't", "can't"
    frameworkReferenceCount: number; // mentions of named frameworks
    causalClaimCount: number; // "causes", "leads to", "results in"
    emotionalLanguageCount: number; // "stress", "cortisol", "feeling"
  } {
    const hedgingPattern = /\b(maybe|perhaps|might|could|possibly|probably)\b/gi;
    const negationPattern = /\b(not|n't|can't|won't|doesn't)\b/gi;
    const frameworkPattern = /\b([A-Z]{2,4}|framework|model|system|theory)\b/gi;
    const causalPattern =
      /\b(causes|leads\s+to|results\s+in|causes|determines|drives)\b/gi;
    const emotionalPattern =
      /\b(stress|cortisol|anxiety|fear|anger|feeling|emotion|emotional)\b/gi;

    return {
      hedgingCount: (input.match(hedgingPattern) ?? []).length,
      negationCount: (input.match(negationPattern) ?? []).length,
      frameworkReferenceCount: (input.match(frameworkPattern) ?? []).length,
      causalClaimCount: (input.match(causalPattern) ?? []).length,
      emotionalLanguageCount: (input.match(emotionalPattern) ?? []).length,
    };
  }
}
