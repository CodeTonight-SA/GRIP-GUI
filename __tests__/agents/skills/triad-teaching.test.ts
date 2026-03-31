import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// YAML parsing inline to avoid import issues
function parseYAML(str: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = str.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      const trimmedValue = value.trim();
      if (trimmedValue.startsWith('[')) {
        result[key] = trimmedValue.slice(1, -1).split(',').map(v => v.trim());
      } else if (trimmedValue === 'true') {
        result[key] = true;
      } else if (trimmedValue === 'false') {
        result[key] = false;
      } else if (!isNaN(Number(trimmedValue))) {
        result[key] = Number(trimmedValue);
      } else {
        result[key] = trimmedValue;
      }
    }
  }
  return result;
}

describe('TRIAD-TEACHING Skill Definition', () => {
  const skillPath = resolve(__dirname, '../../../.agents/skills/triad-teaching/SKILL.md');
  const skillContent = readFileSync(skillPath, 'utf-8');

  // Extract YAML front matter
  const frontMatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
  const frontMatter = frontMatterMatch ? parseYAML(frontMatterMatch[1]) : {};

  describe('Front matter', () => {
    it('should have name field', () => {
      expect(frontMatter.name).toBe('triad-teaching');
    });

    it('should have description field', () => {
      expect(frontMatter.description).toBeDefined();
      expect(typeof frontMatter.description).toBe('string');
      expect(frontMatter.description.length).toBeGreaterThan(50);
    });

    it('should have category field', () => {
      expect(frontMatter.category).toBe('content');
    });

    it('should have tags field', () => {
      expect(Array.isArray(frontMatter.tags)).toBe(true);
      expect(frontMatter.tags.length).toBeGreaterThan(0);
    });
  });

  describe('Content structure', () => {
    it('should have Three Voices section', () => {
      expect(skillContent).toContain('## Three Voices');
    });

    it('should define EXPLAINER voice', () => {
      expect(skillContent).toContain('### EXPLAINER');
      expect(skillContent).toContain('λ Local');
    });

    it('should define CONTEXTUALIZER voice', () => {
      expect(skillContent).toContain('### CONTEXTUALIZER');
      expect(skillContent).toContain('μ Guide');
    });

    it('should define CHALLENGER voice', () => {
      expect(skillContent).toContain('### CHALLENGER');
      expect(skillContent).toContain('ν Mirror');
    });

    it('should have COMPOSITOR section', () => {
      expect(skillContent).toContain('## COMPOSITOR');
      expect(skillContent).toContain('ω Blend');
    });

    it('should have Learner Profile section', () => {
      expect(skillContent).toContain('## Learner Profile');
    });

    it('should have example flows', () => {
      expect(skillContent).toContain('### Simple Question');
      expect(skillContent).toContain('### Complex Question');
    });

    it('should have implementation notes', () => {
      expect(skillContent).toContain('## Implementation Notes');
    });
  });

  describe('Voice definitions', () => {
    it('EXPLAINER should describe role, tone, length, pattern', () => {
      const explainerSection = skillContent.slice(
        skillContent.indexOf('### EXPLAINER'),
        skillContent.indexOf('### CONTEXTUALIZER')
      );
      expect(explainerSection).toContain('Role:');
      expect(explainerSection).toContain('Tone:');
      expect(explainerSection).toContain('Length:');
      expect(explainerSection).toContain('Pattern:');
    });

    it('CONTEXTUALIZER should describe role, tone, length, pattern', () => {
      const contextualizerSection = skillContent.slice(
        skillContent.indexOf('### CONTEXTUALIZER'),
        skillContent.indexOf('### CHALLENGER')
      );
      expect(contextualizerSection).toContain('Role:');
      expect(contextualizerSection).toContain('Tone:');
      expect(contextualizerSection).toContain('Length:');
      expect(contextualizerSection).toContain('Pattern:');
    });

    it('CHALLENGER should describe role, tone, length, pattern', () => {
      const challengerSection = skillContent.slice(
        skillContent.indexOf('### CHALLENGER'),
        skillContent.indexOf('## COMPOSITOR')
      );
      expect(challengerSection).toContain('Role:');
      expect(challengerSection).toContain('Tone:');
      expect(challengerSection).toContain('Length:');
      expect(challengerSection).toContain('Pattern:');
      expect(challengerSection).toContain('Adjust depth');
    });
  });

  describe('COMPOSITOR logic', () => {
    it('should define merging rules', () => {
      const compositorSection = skillContent.slice(
        skillContent.indexOf('## COMPOSITOR'),
        skillContent.indexOf('## Learner Profile')
      );
      expect(compositorSection).toContain('Merging Rule');
      expect(compositorSection).toContain('confidence');
    });

    it('should have collapse condition', () => {
      expect(skillContent).toContain('IF confidence');
      expect(skillContent).toContain('collapse to single voice');
    });

    it('should define tone integration rules', () => {
      const compositorSection = skillContent.slice(
        skillContent.indexOf('## COMPOSITOR'),
        skillContent.indexOf('## Learner Profile')
      );
      expect(compositorSection).toContain('Tone Integration');
    });
  });

  describe('Depth adaptation', () => {
    it('should mention learner levels', () => {
      expect(skillContent).toContain('novice');
      expect(skillContent).toContain('intermediate');
      expect(skillContent).toContain('expert');
    });

    it('should have depth adjustment for CHALLENGER', () => {
      expect(skillContent).toContain('Adjust depth based on learner profile');
    });
  });

  describe('Integration notes', () => {
    it('should reference AirTrek/Birdhouse implementation', () => {
      expect(skillContent).toContain('AirTrek');
      expect(skillContent).toContain('Triad Engine');
    });

    it('should specify implementation for GRIP', () => {
      expect(skillContent).toContain('For GRIP Integration');
    });

    it('should define metrics', () => {
      expect(skillContent).toContain('Metrics to Track');
    });
  });
});
