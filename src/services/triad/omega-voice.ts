/**
 * ω-Voice: Response Compositor
 *
 * Blends λ (immediate context) + μ (historical patterns) + ν (bias analysis)
 * into a single enriched prompt for Claude.
 *
 * Single-pass composition (Phase 2). Convergence loop is Phase 3 (Sand Spreader).
 */

import { LambdaContext } from './lambda-voice';
import { NuAnalysis, BiasPattern } from './nu-voice';

export interface ComposedPrompt {
  enrichedPrompt: string;
  appliedEnrichments: ('mu_context' | 'nu_warning' | 'lambda_frame')[];
  biasesDetected: BiasPattern[];
  originalPrompt: string;
}

export class OmegaVoice {
  /**
   * Compose enriched prompt from λ + μ + ν outputs.
   * Returns the prompt string and metadata about what was enriched.
   */
  static compose(options: {
    originalPrompt: string;
    lambdaContext: LambdaContext;
    muPatterns: string[]; // Historical context strings
    nuAnalysis: NuAnalysis; // Bias analysis
  }): ComposedPrompt {
    const enrichments: ('mu_context' | 'nu_warning' | 'lambda_frame')[] = [];
    let enrichedPrompt = options.originalPrompt;

    // Step 1: Add μ-context if patterns found
    if (options.muPatterns.length > 0) {
      const contextSection = this.buildMuSection(options.muPatterns);
      enrichedPrompt = contextSection + '\n\n' + enrichedPrompt;
      enrichments.push('mu_context');
    }

    // Step 2: Add ν-warning if biases detected
    if (options.nuAnalysis.detected) {
      const warningSection = this.buildNuSection(options.nuAnalysis);
      enrichedPrompt = enrichedPrompt + '\n\n' + warningSection;
      enrichments.push('nu_warning');
    }

    // Step 3: Add λ-frame if session context is notable
    const framingContext = this.buildLambdaFraming(options.lambdaContext);
    if (framingContext) {
      enrichedPrompt = enrichedPrompt + '\n\n' + framingContext;
      enrichments.push('lambda_frame');
    }

    return {
      enrichedPrompt,
      appliedEnrichments: enrichments,
      biasesDetected: options.nuAnalysis.patterns,
      originalPrompt: options.originalPrompt,
    };
  }

  /**
   * Build μ-context section: historical patterns + lessons.
   */
  private static buildMuSection(patterns: string[]): string {
    const patternList = patterns
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n');

    return `## Historical Patterns (μ-Voice)

The following patterns emerged from prior conversations and may be relevant:

${patternList}

Consider how these patterns might apply to the current question.`;
  }

  /**
   * Build ν-warning section: bias alerts + recommendations.
   */
  private static buildNuSection(analysis: NuAnalysis): string {
    const biasLines = analysis.patterns
      .map((p) => {
        const typeLabel = p.type.replace(/_/g, ' ').toUpperCase();
        return `- **${typeLabel}** (confidence: ${(p.confidence * 100).toFixed(0)}%)\n  Evidence: ${p.evidence.map((e) => `"${e.slice(0, 50)}..."`).join(', ')}`;
      })
      .join('\n');

    const recLines = analysis.recommendations
      .map((r) => `- ${r}`)
      .join('\n');

    return `## Bias Check (ν-Voice)

Potential reasoning patterns detected:

${biasLines}

### Recommendations:
${recLines}

Please review these considerations as you formulate your response.`;
  }

  /**
   * Build λ-framing: session context, introduced frameworks, etc.
   */
  private static buildLambdaFraming(context: LambdaContext): string | null {
    if (!context.frameIntroduced && context.recentExchanges.length === 0) {
      return null;
    }

    let framing = '## Session Context (λ-Voice)\n\n';
    const parts: string[] = [];

    if (context.frameIntroduced) {
      parts.push(`**Framework introduced:** ${context.frameIntroduced}`);
    }

    if (context.recentExchanges.length > 0) {
      parts.push(
        `**Recent turns:** ${context.recentExchanges.length} exchanges in this session`
      );
    }

    if (parts.length === 0) return null;
    return framing + parts.join('\n');
  }

  /**
   * Extract the original prompt from enriched prompt (for reference).
   * Useful for storing/logging what was actually asked vs what was enriched.
   */
  static extractOriginal(enrichedPrompt: string, originalLength: number): string {
    // Simple heuristic: last N characters should be close to the original
    return enrichedPrompt.slice(-originalLength).trim();
  }
}
