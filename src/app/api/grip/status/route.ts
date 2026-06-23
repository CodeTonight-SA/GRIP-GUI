import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { readdirSync } from 'fs';
import { parseGenome, parseLatestInstance } from '@/lib/grip-readers';

export async function GET() {
  const home = homedir();
  const claudeDir = join(home, '.claude');

  // Genome — genes is a dict (Object.keys), fitness is the last fitness_history
  // entry. Shared with /api/grip/health via parseGenome so the two never drift.
  let genome = null;
  try {
    const raw = await readFile(join(claudeDir, 'cache', 'genome.json'), 'utf-8');
    genome = parseGenome(JSON.parse(raw));
  } catch { /* no genome */ }

  // Instance — grip/index.json is an INDEX whose `instances` list holds the
  // per-instance records. Pick the latest by serialized_at; the record itself
  // carries content_hash / lineage.generation / message_count.
  let instance = null;
  try {
    const projectsDir = join(claudeDir, 'projects');
    const dirs = readdirSync(projectsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      try {
        const indexPath = join(projectsDir, dir.name, 'grip', 'index.json');
        const raw = await readFile(indexPath, 'utf-8');
        const parsed = parseLatestInstance(JSON.parse(raw));
        if (parsed) {
          instance = parsed;
          break;
        }
      } catch { continue; }
    }
  } catch { /* no projects */ }

  // Active modes
  let activeModes: string[] = [];
  try {
    const raw = await readFile(join(claudeDir, '.active-modes'), 'utf-8');
    activeModes = raw.trim().split('\n').filter(Boolean);
  } catch { /* no modes */ }

  return NextResponse.json({ genome, activeModes, instance });
}
