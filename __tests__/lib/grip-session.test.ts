import { describe, it, expect } from 'vitest';

// Inline the filter function for testing (same logic as in grip-session.ts)
// This avoids needing Next.js path aliases in the vitest environment.
const METADATA_TAGS = 'system-reminder|command-message|command-name|command-args|claude-mem-context';
const CLOSED_METADATA_RE = new RegExp(`<(?:${METADATA_TAGS})>[\\s\\S]*?<\\/(?:${METADATA_TAGS})>`, 'g');
const UNCLOSED_METADATA_RE = new RegExp(`<(?:${METADATA_TAGS})>[\\s\\S]*$`);

function filterResponseMetadata(text: string): string {
  if (!text) return text;
  return text
    .replace(CLOSED_METADATA_RE, '')
    .replace(UNCLOSED_METADATA_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

describe('filterResponseMetadata', () => {
  it('strips closed <system-reminder> blocks', () => {
    const input = 'Hello\n<system-reminder>\nSkill list here\n</system-reminder>\nWorld';
    expect(filterResponseMetadata(input)).toBe('Hello\n\nWorld');
  });

  it('strips unclosed <system-reminder> at end (mid-stream)', () => {
    const input = 'Hello\n<system-reminder>\nPartial metadata...';
    expect(filterResponseMetadata(input)).toBe('Hello');
  });

  it('strips multiple metadata block types', () => {
    const input = [
      'Response text',
      '<command-message>foo</command-message>',
      '<command-name>bar</command-name>',
      '<command-args>baz</command-args>',
      '<claude-mem-context>memory</claude-mem-context>',
      'More text',
    ].join('\n');
    expect(filterResponseMetadata(input)).toBe('Response text\n\nMore text');
  });

  it('returns empty string for metadata-only content', () => {
    const input = '<system-reminder>All metadata</system-reminder>';
    expect(filterResponseMetadata(input)).toBe('');
  });

  it('passes through clean text unchanged', () => {
    const input = 'This is a normal response with no metadata.';
    expect(filterResponseMetadata(input)).toBe(input);
  });

  it('collapses excessive whitespace after stripping', () => {
    const input = 'Before\n\n\n\n<system-reminder>gone</system-reminder>\n\n\n\nAfter';
    const result = filterResponseMetadata(input);
    expect(result).not.toContain('\n\n\n');
  });

  it('handles empty input', () => {
    expect(filterResponseMetadata('')).toBe('');
  });

  it('handles multiple system-reminder blocks', () => {
    const input = '<system-reminder>A</system-reminder>Text<system-reminder>B</system-reminder>';
    expect(filterResponseMetadata(input)).toBe('Text');
  });

  it('handles multiline system-reminder with skill listings', () => {
    const input = [
      'Here is my answer.',
      '<system-reminder>',
      'The following skills are available:',
      '- code-review: Analyse code',
      '- design-principles: SOLID, DRY',
      '</system-reminder>',
      'The answer continues here.',
    ].join('\n');
    expect(filterResponseMetadata(input)).toBe('Here is my answer.\n\nThe answer continues here.');
  });
});
