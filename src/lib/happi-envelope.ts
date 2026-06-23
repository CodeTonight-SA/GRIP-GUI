/**
 * HAPPI/1.1 envelope — the single source of truth for the provider-agnostic
 * request shape GRIP-GUI uses to talk to the HAL substrate.
 *
 * Why this exists: live GRIP's AI substrate is HAPPI-based. Every LLM call in
 * the harness is wrapped in a HAPPI envelope before it reaches a provider
 * (`lib/hal_llm_adapter.py` → hal-server, `skills/donna/_happi_dispatch.py` →
 * `bash happi.md run`). The GUI used to construct an ad-hoc request body, so
 * the envelope contract lived nowhere in the TS codebase. Defining it here —
 * in ONE place — keeps GRIP-GUI a first-class HAPPI speaker and lets the shape
 * track HAPPI revisions without touching every call site.
 *
 * Canonical shape (mirrors `skills/donna/_happi_dispatch.py::build_envelope`
 * and `lib/hal/happi/envelope.py`, verified against ~/.claude on 2026-06-23):
 *
 *   { v, id, cmd, args, flags, content?, ctx?, auth? }
 *
 * User-message resolution precedence inside HAL is: content > flags.message >
 * args. GRIP always carries the prompt in `content` (the documented primary
 * slot — see the #2697 envelope-content contract), never `flags.message`.
 */

export const HAPPI_VERSION = 'happi/1.1' as const;

/**
 * Default model alias for the GUI's chat surfaces.
 *
 * Single source of truth: every chat call site (the browser `/api/grip/chat`
 * route, the Electron PTY path, and the HAL `/api/infer` path) used to inline
 * the literal `'sonnet'` as its implicit default, so the default model could
 * not be changed in one place and never reflected the live session-model
 * choice. Routing this through one constant lets the default move with a single
 * edit — and, when the HAL backend is reachable, HAL's own cascade
 * (CCH → Kimi → cheap → local) overrides it server-side via `/api/infer`.
 *
 * `'sonnet'` remains the historical default to keep behaviour byte-identical
 * for existing callers; HAL routing (see `HAL_DEFAULTS` / the opt-in default
 * flag in `grip-session.ts`) is what introduces the multi-provider substrate.
 */
export const DEFAULT_MODEL = 'sonnet' as const;

/** Auth descriptor — mirrors the HAPPI `auth` object HAL adapters consume. */
export interface HappiAuth {
  /** e.g. 'apikey' | 'subscription' | 'bearer'. */
  scheme: string;
  /** Token or a `keychain:<entry>` reference; optional for subscription auth. */
  token?: string;
}

/**
 * A HAPPI/1.1 envelope. `content` carries the user message; `flags` carries
 * provider/model/system directives; `ctx` carries session/correlation state;
 * `auth` is added only when the caller has a credential descriptor.
 */
export interface HappiEnvelope {
  v: typeof HAPPI_VERSION;
  /** Correlation id (stable per request). */
  id: string;
  /** Command verb, e.g. 'chat'. */
  cmd: string;
  /** Positional args (lowest user-message precedence). */
  args: string[];
  /** Provider-agnostic directives: provider, model, system, max_tokens, audit… */
  flags: Record<string, unknown>;
  /** Primary user-message slot (highest precedence). */
  content?: string;
  /** Session/correlation context, e.g. { session_id }. */
  ctx?: Record<string, unknown>;
  /** Optional auth descriptor. */
  auth?: HappiAuth;
}

export interface BuildHappiEnvelopeOptions {
  /** Command verb (default 'chat'). */
  cmd?: string;
  /** User message — placed in `content`, the canonical primary slot. */
  content?: string;
  /** Provider-agnostic flags (model, provider, system, max_tokens…). */
  flags?: Record<string, unknown>;
  /** Positional args. */
  args?: string[];
  /** Session/correlation context. */
  ctx?: Record<string, unknown>;
  /** Auth descriptor. */
  auth?: HappiAuth;
  /** When true, sets `flags.audit = true` (HAL audit-chain opt-in). */
  audit?: boolean;
  /** Override the generated correlation id (mainly for deterministic tests). */
  id?: string;
}

/** Generate a correlation id (uuid4, prefixed for traceability). */
function newEnvelopeId(): string {
  return `gui-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Build a minimal HAPPI/1.1 envelope. Mirrors the canonical Python builder:
 * `content` and `ctx`/`auth` are added only when present (so a bare envelope
 * never carries empty slots), and `audit` folds into `flags`.
 */
export function buildHappiEnvelope(opts: BuildHappiEnvelopeOptions = {}): HappiEnvelope {
  const flags: Record<string, unknown> = { ...(opts.flags ?? {}) };
  if (opts.audit) flags.audit = true;

  const envelope: HappiEnvelope = {
    v: HAPPI_VERSION,
    id: opts.id ?? newEnvelopeId(),
    cmd: opts.cmd ?? 'chat',
    args: [...(opts.args ?? [])],
    flags,
  };
  if (opts.content) envelope.content = opts.content;
  if (opts.ctx && Object.keys(opts.ctx).length > 0) envelope.ctx = opts.ctx;
  if (opts.auth) envelope.auth = opts.auth;
  return envelope;
}

/** The `/api/infer` wire body hal-server accepts (HAL #331). */
export interface HalInferBody {
  prompt: string;
  model: string;
  audit: boolean;
}

/**
 * Derive the hal-server `/api/infer` wire body from a HAPPI envelope.
 *
 * `/api/infer` wraps `grip_infer`/RAILLM, which re-wraps the call in a HAPPI
 * envelope server-side, so its HTTP contract is the flat `{prompt, model,
 * audit}` shape (`lib/hal_llm_adapter.py::_grip_infer_call`). This adapter
 * lets the GUI think in envelopes while still speaking that route's exact
 * contract — the prompt comes from `content` (canonical precedence), the model
 * from `flags.model`, and audit from `flags.audit`.
 */
export function halInferBodyFromEnvelope(env: HappiEnvelope): HalInferBody {
  return {
    prompt: env.content ?? '',
    model: typeof env.flags.model === 'string' ? (env.flags.model as string) : '',
    audit: env.flags.audit === true,
  };
}
