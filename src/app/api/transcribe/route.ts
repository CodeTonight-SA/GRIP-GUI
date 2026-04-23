import { NextRequest } from 'next/server';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get('audio');
  if (!(file instanceof Blob)) {
    return Response.json({ error: 'audio field required' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  // Gemini's MIME validator does not document whether it strips the
  // ;codecs= parameter before matching, and Google's own docs disagree
  // on whether audio/webm is in the allow-list. MediaRecorder in Chromium
  // emits "audio/webm;codecs=opus" — strip the parameter so we send the
  // plain base MIME and avoid the 200-with-empty-transcript black hole.
  const mime = (file.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mime, data: base64 } },
            { text: 'Transcribe this audio verbatim. Return only the transcript, no preamble.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return Response.json({ error: `Gemini ${res.status}: ${body}` }, { status: 502 });
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return Response.json({ text });
}
