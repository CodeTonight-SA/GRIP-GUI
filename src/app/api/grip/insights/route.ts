import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const INSIGHTS_FILE = join(homedir(), '.claude', 'learning', 'insights.jsonl');
const RULES_FILE = join(homedir(), '.claude', 'rules', 'learned-insights.md');

export async function GET() {
  try {
    // Read insights.jsonl
    const content = await readFile(INSIGHTS_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const insights = lines.map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean).reverse(); // newest first

    // Get file modification time for staleness check
    const fileStat = await stat(INSIGHTS_FILE);
    const lastModified = fileStat.mtime.toISOString();

    // Check if learned-insights.md exists (indicates /learn has been run)
    let rulesLastModified: string | null = null;
    try {
      const rulesStat = await stat(RULES_FILE);
      rulesLastModified = rulesStat.mtime.toISOString();
    } catch { /* no rules file */ }

    // Staleness: insights are stale if the file hasn't been modified in 24 hours
    const ageMs = Date.now() - fileStat.mtime.getTime();
    const isStale = ageMs > 24 * 60 * 60 * 1000;

    return NextResponse.json({
      insights,
      total: insights.length,
      lastModified,
      rulesLastModified,
      isStale,
      ageHours: Math.round(ageMs / (60 * 60 * 1000)),
    });
  } catch {
    return NextResponse.json({ insights: [], total: 0, isStale: true, ageHours: 0 });
  }
}
