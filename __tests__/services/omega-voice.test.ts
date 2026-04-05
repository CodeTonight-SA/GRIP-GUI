/**
 * ω-Voice Compositor Tests
 *
 * Tests composition of enriched prompts from λ + μ + ν
 * Validates enrichment application and prompt construction
 *
 * Run with: npm test -- omega-voice.test.ts
 */

import { describe, it, expect } from 'vitest';
import { OmegaVoice } from '@/services/triad/omega-voice';
import { LambdaVoice } from '@/services/triad/lambda-voice';
import { NuVoice } from '@/services/triad/nu-voice';

describe('ω-Voice: Response Composition', () => {
  describe('Basic Composition', () => {
    it('should compose prompt with original text', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'What is stress?',
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias('What is stress?');

      const composed = OmegaVoice.compose({
        originalPrompt: 'What is stress?',
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.enrichedPrompt).toContain('What is stress?');
      expect(composed.originalPrompt).toBe('What is stress?');
    });

    it('should preserve original prompt unchanged when no enrichments apply', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'Tell me about psychology.',
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias('Tell me about psychology.');

      const composed = OmegaVoice.compose({
        originalPrompt: 'Tell me about psychology.',
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toEqual([]);
      expect(composed.enrichedPrompt).toBe('Tell me about psychology.');
    });
  });

  describe('μ-Context Enrichment', () => {
    it('should add historical context when patterns exist', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'How does stress work?',
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias('How does stress work?');
      const muPatterns = [
        'User previously claimed stress directly causes system changes',
        'User previously dismissed evidence with circular logic',
      ];

      const composed = OmegaVoice.compose({
        originalPrompt: 'How does stress work?',
        lambdaContext,
        muPatterns,
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toContain('mu_context');
      expect(composed.enrichedPrompt).toContain('Historical Patterns');
      expect(composed.enrichedPrompt).toContain(
        'User previously claimed stress'
      );
    });

    it('should limit number of patterns shown', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'Question?',
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias('Question?');
      const muPatterns = Array.from({ length: 10 }, (_, i) =>
        `Pattern ${i + 1}`
      );

      const composed = OmegaVoice.compose({
        originalPrompt: 'Question?',
        lambdaContext,
        muPatterns,
        nuAnalysis,
      });

      expect(composed.enrichedPrompt).toContain('Pattern 1');
      expect(composed.enrichedPrompt).toContain('Pattern 5');
      expect(composed.enrichedPrompt).not.toContain('Pattern 10');
    });
  });

  describe('ν-Bias Enrichment', () => {
    it('should add bias warning when patterns detected', () => {
      const biasedPrompt =
        'Under my framework, cortisol always causes changes. You are being defensive.';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: biasedPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias(biasedPrompt);

      const composed = OmegaVoice.compose({
        originalPrompt: biasedPrompt,
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toContain('nu_warning');
      expect(composed.enrichedPrompt).toContain('Bias Check');
      expect(composed.enrichedPrompt).toContain('Recommendations');
    });

    it('should include detected bias types in composition', () => {
      const biasedPrompt =
        'Under my model, stress directly causes changes because I showed it.';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: biasedPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias(biasedPrompt);

      const composed = OmegaVoice.compose({
        originalPrompt: biasedPrompt,
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.biasesDetected.length).toBeGreaterThan(0);
      expect(composed.biasesDetected[0].type).toMatch(
        /framework_lock|lossless|circular/
      );
    });

    it('should not add bias warning for neutral text', () => {
      const neutralPrompt = 'What are the different theories about stress?';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: neutralPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias(neutralPrompt);

      const composed = OmegaVoice.compose({
        originalPrompt: neutralPrompt,
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).not.toContain('nu_warning');
      expect(composed.enrichedPrompt).not.toContain('Bias Check');
    });
  });

  describe('λ-Frame Enrichment', () => {
    it('should add session context when framework introduced', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'Question?',
        sessionId: 'session-1',
        userId: 'user-1',
        frameIntroduced: 'ETH',
      });
      const nuAnalysis = NuVoice.detectBias('Question?');

      const composed = OmegaVoice.compose({
        originalPrompt: 'Question?',
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toContain('lambda_frame');
      expect(composed.enrichedPrompt).toContain('ETH');
    });

    it('should add session context when recent exchanges exist', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'Follow-up?',
        sessionId: 'session-1',
        userId: 'user-1',
        recentExchanges: ['First question', 'Response to first', 'Second question'],
      });
      const nuAnalysis = NuVoice.detectBias('Follow-up?');

      const composed = OmegaVoice.compose({
        originalPrompt: 'Follow-up?',
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toContain('lambda_frame');
      expect(composed.enrichedPrompt).toContain('3 exchanges');
    });

    it('should not add lambda frame if no context', () => {
      const lambdaContext = LambdaVoice.buildContext({
        userInput: 'Question?',
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias('Question?');

      const composed = OmegaVoice.compose({
        originalPrompt: 'Question?',
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).not.toContain('lambda_frame');
    });
  });

  describe('Multiple Enrichments', () => {
    it('should combine all enrichments when applicable', () => {
      const biasedPrompt =
        'Under my theory, stress directly causes changes. You are being defensive.';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: biasedPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
        frameIntroduced: 'ETH',
        recentExchanges: ['Q1', 'A1', 'Q2'],
      });
      const nuAnalysis = NuVoice.detectBias(biasedPrompt);
      const muPatterns = ['Pattern 1', 'Pattern 2'];

      const composed = OmegaVoice.compose({
        originalPrompt: biasedPrompt,
        lambdaContext,
        muPatterns,
        nuAnalysis,
      });

      expect(composed.appliedEnrichments).toContain('mu_context');
      expect(composed.appliedEnrichments).toContain('nu_warning');
      expect(composed.appliedEnrichments).toContain('lambda_frame');

      expect(composed.enrichedPrompt).toContain('Historical Patterns');
      expect(composed.enrichedPrompt).toContain('Bias Check');
      expect(composed.enrichedPrompt).toContain('Session Context');
    });

    it('should preserve original prompt order in enrichment', () => {
      const original = 'What is stress?';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: original,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const biasedInput =
        'Stress directly causes changes because I showed it.';
      const nuAnalysis = NuVoice.detectBias(biasedInput);
      const muPatterns = ['Historical pattern'];

      const composed = OmegaVoice.compose({
        originalPrompt: original,
        lambdaContext,
        muPatterns,
        nuAnalysis,
      });

      const originalIndex = composed.enrichedPrompt.indexOf(original);
      expect(originalIndex).toBeGreaterThan(0);
    });
  });

  describe('Enrichment Metadata', () => {
    it('should track which enrichments were applied', () => {
      const biasedPrompt = 'Under my framework, stress always changes things.';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: biasedPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias(biasedPrompt);

      const composed = OmegaVoice.compose({
        originalPrompt: biasedPrompt,
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(Array.isArray(composed.appliedEnrichments)).toBe(true);
      expect(composed.appliedEnrichments[0]).toMatch(
        /mu_context|nu_warning|lambda_frame/
      );
    });

    it('should return biases detected by nu-voice', () => {
      const biasedPrompt = 'Under my model, stress causes changes.';
      const lambdaContext = LambdaVoice.buildContext({
        userInput: biasedPrompt,
        sessionId: 'session-1',
        userId: 'user-1',
      });
      const nuAnalysis = NuVoice.detectBias(biasedPrompt);

      const composed = OmegaVoice.compose({
        originalPrompt: biasedPrompt,
        lambdaContext,
        muPatterns: [],
        nuAnalysis,
      });

      expect(composed.biasesDetected).toEqual(nuAnalysis.patterns);
    });
  });
});
