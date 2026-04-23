// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn>;

async function invokeRoute(audioBlob: Blob): Promise<{
  response: Response;
  fetchMock: FetchMock;
}> {
  // Reset module registry so the route pulls the freshly-stubbed env each time.
  vi.resetModules();
  process.env.GEMINI_API_KEY = 'test-key';

  const fetchMock: FetchMock = vi.fn(async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'hello world' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
  vi.stubGlobal('fetch', fetchMock);

  const { POST } = await import('../../src/app/api/transcribe/route');

  const form = new FormData();
  form.append('audio', audioBlob, 'clip.webm');
  const req = new Request('http://localhost/api/transcribe', {
    method: 'POST',
    body: form,
  });

  // NextRequest is a thin wrapper around Request — the route only touches
  // formData(), which is native on the web Request, so a cast is safe.
  const response = await POST(req as unknown as Parameters<typeof POST>[0]);
  return { response, fetchMock };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEMINI_API_KEY;
});

describe('POST /api/transcribe', () => {
  it('strips the ;codecs= parameter from the MediaRecorder MIME before calling Gemini', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: 'audio/webm;codecs=opus',
    });
    const { response, fetchMock } = await invokeRoute(blob);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    const mime = body.contents[0].parts[0].inline_data.mime_type;

    expect(mime).toBe('audio/webm');
    expect(mime).not.toContain(';');
    expect(mime).not.toContain('codecs');
  });

  it('returns the transcribed text in the JSON response', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: 'audio/webm;codecs=opus',
    });
    const { response } = await invokeRoute(blob);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.text).toBe('hello world');
  });

  it('returns 500 when GEMINI_API_KEY is missing', async () => {
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    const { POST } = await import('../../src/app/api/transcribe/route');

    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array([1])], { type: 'audio/webm' }), 'clip.webm');
    const req = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: form,
    });

    const response = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toMatch(/GEMINI_API_KEY/);
  });
});
