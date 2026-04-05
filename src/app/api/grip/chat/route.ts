import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TetrahedralPyramid } from '@/services/memory';
import { LambdaVoice } from '@/services/triad/lambda-voice';
import { NuVoice } from '@/services/triad/nu-voice';
import { OmegaVoice } from '@/services/triad/omega-voice';

const GRIP_DIR = join(homedir(), '.claude');

// Global pyramid instance (in production, use proper state management)
const pyramid = new TetrahedralPyramid();

/**
 * GRIP Chat API — Full Triad orchestration
 *
 * Triad chain: λ (context) → μ (history) → ν (bias) → ω (composition)
 *
 * Phase 2: Full Triad orchestration
 *   λ-voice: Build immediate context
 *   μ-voice: Retrieve historical patterns
 *   ν-voice: Detect cognitive biases
 *   ω-voice: Compose enriched prompt
 *
 * Then spawn `claude -p` with enriched prompt and stream response.
 *
 * Request body:
 *   - prompt: string (required)
 *   - userId: string (required for memory tracking)
 *   - sessionId: string (optional, for session resumption)
 *   - model: 'sonnet' | 'opus' | 'haiku' (default: sonnet)
 *   - frameIntroduced?: string (framework context, e.g. 'ETH')
 *   - recentExchanges?: string[] (conversation history for contradiction detection)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    prompt,
    userId = 'anonymous',
    sessionId = uuidv4(),
    model = 'sonnet',
    frameIntroduced,
    recentExchanges = [],
  } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let enrichedPrompt = prompt;
  const triadLog: string[] = [];

  try {
    // Initialize session with user's prior profile
    await pyramid.initializeSession(userId, sessionId);

    // λ-VOICE: Build immediate context
    triadLog.push('[Triad] λ-voice: Building immediate context');
    const lambdaContext = LambdaVoice.buildContext({
      userInput: prompt,
      sessionId,
      userId,
      recentExchanges,
      frameIntroduced,
    });

    // Capture in pyramid
    pyramid.captureLocalState(sessionId, userId, prompt, {
      frame: frameIntroduced,
      history: recentExchanges,
    });

    // μ-VOICE: Retrieve historical patterns
    triadLog.push('[Triad] μ-voice: Retrieving historical patterns');
    const muPatterns = await pyramid.getMuPatterns(userId, prompt);
    if (muPatterns.length > 0) {
      triadLog.push(`  Found ${muPatterns.length} historical patterns`);
    }

    // ν-VOICE: Detect cognitive biases
    triadLog.push('[Triad] ν-voice: Analyzing for cognitive biases');
    const nuAnalysis = NuVoice.detectBias(prompt, recentExchanges);
    if (nuAnalysis.detected) {
      triadLog.push(
        `  Detected ${nuAnalysis.patterns.length} bias patterns (confidence: ${(nuAnalysis.overallConfidence * 100).toFixed(0)}%)`
      );
      // Record bias detection in pyramid
      for (const pattern of nuAnalysis.patterns) {
        pyramid.recordBiasDetection(sessionId, {
          sessionId,
          patternType: pattern.type,
          description: pattern.evidence.join(' | '),
          severity:
            pattern.confidence > 0.8
              ? 'high'
              : pattern.confidence > 0.6
                ? 'medium'
                : 'low',
          evidence: pattern.evidence.join(' | '),
          surfaced: false,
        });
      }
    }

    // ω-VOICE: Compose enriched prompt
    triadLog.push('[Triad] ω-voice: Composing enriched prompt');
    const composed = OmegaVoice.compose({
      originalPrompt: prompt,
      lambdaContext,
      muPatterns,
      nuAnalysis,
    });
    enrichedPrompt = composed.enrichedPrompt;
    triadLog.push(
      `  Applied enrichments: ${composed.appliedEnrichments.join(', ') || 'none'}`
    );

    // Log Triad chain
    console.log(triadLog.join('\n'));
  } catch (error) {
    // If Triad enrichment fails, continue with original prompt
    console.error('Triad orchestration error:', error);
    console.log('[Triad] Falling back to original prompt');
  }

  // Build claude CLI args
  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--model', model,
  ];

  // Resume existing session for ultra-fast response (no context reload)
  if (sessionId && sessionId !== 'anonymous') {
    args.push('--resume', sessionId);
  }

  // Add the enriched prompt last
  args.push(enrichedPrompt);

  // Create a streaming response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const proc = spawn('claude', args, {
        cwd: GRIP_DIR,
        env: {
          ...process.env,
          // Ensure GRIP infrastructure is loaded
          HOME: homedir(),
        },
      });

      proc.stdout.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()));
      });

      proc.stderr.on('data', (data: Buffer) => {
        // Log stderr server-side only — don't forward to client
        // unless it's a critical error
        const text = data.toString();
        if (text.includes('Error') || text.includes('error')) {
          const errorEvent = JSON.stringify({ type: 'error', message: text.trim() }) + '\n';
          controller.enqueue(encoder.encode(errorEvent));
        }
      });

      proc.on('close', () => {
        controller.close();
      });

      proc.on('error', (err) => {
        const errorEvent = JSON.stringify({ type: 'error', message: err.message }) + '\n';
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      });

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        proc.kill('SIGTERM');
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
