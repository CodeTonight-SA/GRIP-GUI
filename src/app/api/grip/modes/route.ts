import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const ACTIVE_MODES_FILE = join(homedir(), '.claude', '.active-modes');

/**
 * GRIP Modes API — read and write active modes.
 * Reads/writes ~/.claude/.active-modes (newline-separated mode IDs).
 * This is the same file that `bash ~/.claude/lib/mode-loader.sh` uses.
 */
export async function GET() {
  try {
    const content = await readFile(ACTIVE_MODES_FILE, 'utf-8');
    const modes = content.trim().split('\n').filter(Boolean);
    return NextResponse.json({ modes });
  } catch {
    return NextResponse.json({ modes: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { modes } = await req.json();
    if (!Array.isArray(modes) || modes.length > 3) {
      return NextResponse.json({ error: 'Invalid modes (max 3)' }, { status: 400 });
    }

    // Validate mode IDs (alphanumeric + hyphens only)
    for (const mode of modes) {
      if (typeof mode !== 'string' || !/^[a-z0-9-]+$/.test(mode)) {
        return NextResponse.json({ error: `Invalid mode ID: ${mode}` }, { status: 400 });
      }
    }

    await writeFile(ACTIVE_MODES_FILE, modes.join('\n') + '\n', 'utf-8');
    return NextResponse.json({ modes, saved: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Write failed' },
      { status: 500 }
    );
  }
}
