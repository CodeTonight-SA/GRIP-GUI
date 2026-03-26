import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { readdirSync } from 'fs';

export async function GET() {
  const home = homedir();
  const claudeDir = join(home, '.claude');

  // Genome
  let genome = null;
  try {
    const raw = await readFile(join(claudeDir, 'cache', 'genome.json'), 'utf-8');
    const g = JSON.parse(raw);
    genome = { generation: g.generation || 0, geneCount: g.genes?.length || 0, fitness: g.fitness || 0 };
  } catch { /* no genome */ }

  // Active modes
  let activeModes: string[] = [];
  try {
    const raw = await readFile(join(claudeDir, '.active-modes'), 'utf-8');
    activeModes = raw.trim().split('\n').filter(Boolean);
  } catch { /* no modes */ }

  // Instance — find first project grip index
  let instance = null;
  try {
    const projectsDir = join(claudeDir, 'projects');
    const dirs = readdirSync(projectsDir, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const dir of dirs) {
      try {
        const indexPath = join(projectsDir, dir.name, 'grip', 'index.json');
        const raw = await readFile(indexPath, 'utf-8');
        const inst = JSON.parse(raw);
        instance = { sha: (inst.sha || '').slice(0, 8) || '?', gen: inst.generation || 0, messages: inst.messages || 0 };
        break;
      } catch { continue; }
    }
  } catch { /* no projects */ }

  return NextResponse.json({ genome, activeModes, instance });
}
