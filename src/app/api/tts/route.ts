import { NextRequest } from 'next/server';

const TTS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

// Gemini TTS returns raw 16-bit PCM mono at 24kHz. Browsers need a WAV header
// to play it through <audio>, so we wrap the PCM bytes with a 44-byte RIFF/WAVE
// header before returning the buffer to the client.
function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  const { text, voice = 'Aoede' } = await req.json();
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'text required' }, { status: 400 });
  }

  const res = await fetch(`${TTS_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[TTS] Gemini error:', res.status, body.slice(0, 500));
    return Response.json(
      { error: `Gemini TTS ${res.status}`, detail: body.slice(0, 500) },
      { status: 502 }
    );
  }

  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    return Response.json({ error: 'No audio in response' }, { status: 502 });
  }

  const pcm = Buffer.from(b64, 'base64');
  const wav = pcmToWav(pcm);
  return new Response(new Uint8Array(wav), {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'no-store',
    },
  });
}
