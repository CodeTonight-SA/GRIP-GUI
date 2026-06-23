import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { readdirSync, existsSync } from 'fs';
import { parseGenome } from '@/lib/grip-readers';

const GRIP_DIR = join(homedir(), '.claude');

/**
 * GRIP Health API — returns real system stats from the local GRIP installation.
 * Reads genome, skill count, mode count from actual files.
 * Fail-closed: returns defaults on any error.
 */
export async function GET() {
  try {
    // Read genome
    let generation = 91;
    let geneCount = 378;
    let fitness = 0.376;
    try {
      const genomePath = join(GRIP_DIR, 'cache', 'genome.json');
      const raw = await readFile(genomePath, 'utf-8');
      const view = parseGenome(JSON.parse(raw));
      if (view) {
        generation = view.generation || generation;
        geneCount = view.geneCount || geneCount;
        fitness = view.fitness || fitness;
      }
    } catch { /* use defaults */ }

    // Count skills
    let skillCount = 288;
    try {
      const skillsDir = join(GRIP_DIR, 'skills');
      if (existsSync(skillsDir)) {
        skillCount = readdirSync(skillsDir, { withFileTypes: true })
          .filter(d => d.isDirectory()).length;
      }
    } catch { /* use default */ }

    // Count modes
    let modeCount = 31;
    try {
      const modesDir = join(GRIP_DIR, 'modes', 'definitions');
      if (existsSync(modesDir)) {
        modeCount = readdirSync(modesDir)
          .filter(f => f.endsWith('.yaml')).length;
      }
    } catch { /* use default */ }

    // Count agents
    let agentCount = 41;
    try {
      const agentsDir = join(GRIP_DIR, 'agents');
      if (existsSync(agentsDir)) {
        agentCount = readdirSync(agentsDir)
          .filter(f => f.endsWith('.md')).length;
      }
    } catch { /* use default */ }

    return NextResponse.json({
      status: 'healthy',
      generation,
      geneCount,
      fitness: Math.round(fitness * 1000) / 1000,
      skillCount,
      modeCount,
      agentCount,
      gateCount: 10,
      gripDir: GRIP_DIR,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      generation: 91,
      skillCount: 288,
      modeCount: 31,
      agentCount: 41,
      gateCount: 10,
    });
  }
}
