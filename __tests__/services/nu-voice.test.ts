/**
 * ν-Voice Bias Detection Tests
 *
 * Tests regex-based detection of 7 bias pattern types
 * Validates evidence extraction and confidence scoring
 *
 * Run with: npm test -- nu-voice.test.ts
 */

import { describe, it, expect } from 'vitest';
import { NuVoice } from '@/services/triad/nu-voice';

describe('ν-Voice: Cognitive Bias Detection', () => {
  describe('framework_lock Detection', () => {
    it('should detect theory presented as operating reality', () => {
      const input =
        'Under my ETH framework, cortisol directly controls state transitions. This model shows that feed-forward mechanisms are lossless.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(true);
      const frameworkLock = analysis.patterns.find(
        (p) => p.type === 'framework_lock'
      );
      expect(frameworkLock).toBeDefined();
      expect(frameworkLock!.confidence).toBeGreaterThan(0.5);
      expect(frameworkLock!.evidence.length).toBeGreaterThan(0);
    });

    it('should not flag framework mentions without claiming reality', () => {
      const input = 'The ETH framework proposes that transitions occur in stages.';

      const analysis = NuVoice.detectBias(input);

      const frameworkLock = analysis.patterns.find(
        (p) => p.type === 'framework_lock'
      );
      expect(frameworkLock).toBeUndefined();
    });
  });

  describe('lossless_assumption Detection', () => {
    it('should detect unverified mechanism claims', () => {
      const input =
        'Cortisol always directly causes state changes. The transition happens without loss of information.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(true);
      const lossless = analysis.patterns.find(
        (p) => p.type === 'lossless_assumption'
      );
      expect(lossless).toBeDefined();
      expect(lossless!.confidence).toBeGreaterThan(0.4);
    });

    it('should catch absolute certainty claims', () => {
      const input =
        'This mechanism must work. Stress always leads to system changes.';

      const analysis = NuVoice.detectBias(input);

      const lossless = analysis.patterns.find(
        (p) => p.type === 'lossless_assumption'
      );
      expect(lossless).toBeDefined();
    });
  });

  describe('asymmetric_boundary Detection', () => {
    it('should detect one-directional rules', () => {
      const input =
        'I can challenge you on your methods. But when you question my framework, you just do not understand the depth.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(true);
      const asymmetric = analysis.patterns.find(
        (p) => p.type === 'asymmetric_boundary'
      );
      expect(asymmetric).toBeDefined();
    });

    it('should detect self-exemption with stress language', () => {
      const input =
        'My stress causes system transitions, but your concerns are not valid.';

      const analysis = NuVoice.detectBias(input);

      const asymmetric = analysis.patterns.find(
        (p) => p.type === 'asymmetric_boundary'
      );
      expect(asymmetric).toBeDefined();
    });
  });

  describe('transference Detection', () => {
    it('should detect defensive attribution', () => {
      const input =
        "You're being defensive when I explain my model. You're being emotional about the evidence.";

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(true);
      const transference = analysis.patterns.find(
        (p) => p.type === 'transference'
      );
      expect(transference).toBeDefined();
    });

    it('should detect repeated misunderstanding claims', () => {
      const input =
        'You misunderstood the framework. You misinterpreted what I meant earlier.';

      const analysis = NuVoice.detectBias(input);

      const transference = analysis.patterns.find(
        (p) => p.type === 'transference'
      );
      expect(transference).toBeDefined();
    });
  });

  describe('circular_evidence Detection', () => {
    it('should detect self-referential proof', () => {
      const input =
        'I clearly showed the mechanism works. Because I said so earlier, it must be valid.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(true);
      const circular = analysis.patterns.find(
        (p) => p.type === 'circular_evidence'
      );
      expect(circular).toBeDefined();
    });
  });

  describe('contradiction_loop Detection', () => {
    it('should detect contradictions with history', () => {
      const history = [
        'Cortisol always causes state transitions.',
        'The mechanism is fundamental.',
      ];
      const input = 'But cortisol does not always cause changes. My model was wrong.';

      const analysis = NuVoice.detectBias(input, history);

      const contradiction = analysis.patterns.find(
        (p) => p.type === 'contradiction_loop'
      );
      expect(contradiction).toBeDefined();
    });
  });

  describe('other Pattern Detection', () => {
    it('should flag high certainty with minimal hedging', () => {
      const input =
        'The framework directly causes state changes. It determines all transitions. This model proves the mechanism works.';

      const analysis = NuVoice.detectBias(input);

      const other = analysis.patterns.find((p) => p.type === 'other');
      expect(other).toBeDefined();
    });
  });

  describe('False Positives', () => {
    it('should not flag neutral analytical text', () => {
      const input =
        'The theory suggests several possible mechanisms. Further research might explore how stress affects transitions.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(false);
    });

    it('should not flag proper hedging', () => {
      const input =
        'It appears that cortisol might play a role in state transitions. This could suggest a mechanism worth investigating.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.detected).toBe(false);
    });
  });

  describe('Overall Confidence Scoring', () => {
    it('should calculate composite confidence', () => {
      const input =
        'Under my framework, stress always causes changes because I demonstrated it. You obviously do not understand.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.overallConfidence).toBeGreaterThan(0.5);
      expect(analysis.overallConfidence).toBeLessThanOrEqual(1.0);
    });

    it('should generate recommendations for detected biases', () => {
      const input =
        'My cortisol directly causes changes. But you are just being defensive.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toMatch(
        /ground|evidence|defensive|frame/i
      );
    });
  });

  describe('Evidence Extraction', () => {
    it('should extract quoted evidence from text', () => {
      const input =
        'Under my theory, stress causes changes. I showed this clearly. You misunderstood.';

      const analysis = NuVoice.detectBias(input);

      expect(analysis.patterns.length).toBeGreaterThan(0);
      for (const pattern of analysis.patterns) {
        expect(pattern.evidence.length).toBeGreaterThan(0);
        expect(pattern.evidence[0].length).toBeGreaterThan(0);
      }
    });

    it('should limit evidence length for readability', () => {
      const input =
        'Under my framework that I developed over many years of research, the mechanism that I discovered works perfectly in all cases because it is self-evident.';

      const analysis = NuVoice.detectBias(input);

      for (const pattern of analysis.patterns) {
        for (const evidence of pattern.evidence) {
          expect(evidence.length).toBeLessThan(200);
        }
      }
    });
  });
});
