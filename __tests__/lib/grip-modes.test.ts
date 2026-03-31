import { describe, it, expect } from 'vitest';
import { GRIP_MODES, getModeById, getModesByCategory } from '@/src/lib/grip-modes';

describe('GRIP Modes', () => {
  describe('TRIAD-TEACHING mode', () => {
    it('should exist in GRIP_MODES', () => {
      const triadMode = GRIP_MODES.find(m => m.id === 'triad-teaching');
      expect(triadMode).toBeDefined();
    });

    it('should have correct properties', () => {
      const triadMode = getModeById('triad-teaching');
      expect(triadMode).toEqual({
        id: 'triad-teaching',
        name: 'TRIAD TEACHING',
        description: 'Multi-voice teaching through Explainer, Contextualizer, and Challenger synthesis',
        category: 'content',
        skills: ['pedagogical-patterns', 'curriculum-design', 'research-synthesis'],
        tokenBudget: 4000,
      });
    });

    it('should be in content category', () => {
      const contentModes = getModesByCategory('content');
      const hasTriad = contentModes.some(m => m.id === 'triad-teaching');
      expect(hasTriad).toBe(true);
    });

    it('should have valid skill references', () => {
      const triadMode = getModeById('triad-teaching');
      expect(triadMode?.skills).toContain('pedagogical-patterns');
      expect(triadMode?.skills).toContain('curriculum-design');
      expect(triadMode?.skills).toContain('research-synthesis');
    });

    it('should have reasonable token budget (3000-5000)', () => {
      const triadMode = getModeById('triad-teaching');
      expect(triadMode?.tokenBudget).toBeGreaterThanOrEqual(3000);
      expect(triadMode?.tokenBudget).toBeLessThanOrEqual(5000);
    });
  });

  describe('Mode structure integrity', () => {
    it('should have no duplicate mode IDs', () => {
      const ids = GRIP_MODES.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all required fields for each mode', () => {
      GRIP_MODES.forEach(mode => {
        expect(mode.id).toBeDefined();
        expect(mode.name).toBeDefined();
        expect(mode.description).toBeDefined();
        expect(mode.category).toBeDefined();
        expect(mode.skills).toBeDefined();
        expect(Array.isArray(mode.skills)).toBe(true);
        expect(mode.tokenBudget).toBeDefined();
        expect(typeof mode.tokenBudget).toBe('number');
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['development', 'strategy', 'content', 'research', 'operations', 'meta'];
      GRIP_MODES.forEach(mode => {
        expect(validCategories).toContain(mode.category);
      });
    });
  });

  describe('getModeById', () => {
    it('should return mode when found', () => {
      const mode = getModeById('code');
      expect(mode?.id).toBe('code');
    });

    it('should return undefined when not found', () => {
      const mode = getModeById('nonexistent');
      expect(mode).toBeUndefined();
    });

    it('should return triad-teaching mode', () => {
      const mode = getModeById('triad-teaching');
      expect(mode?.id).toBe('triad-teaching');
    });
  });

  describe('getModesByCategory', () => {
    it('should return all content modes including triad-teaching', () => {
      const contentModes = getModesByCategory('content');
      const modeIds = contentModes.map(m => m.id);
      expect(modeIds).toContain('writing');
      expect(modeIds).toContain('teaching');
      expect(modeIds).toContain('triad-teaching');
    });

    it('should not mix categories', () => {
      const contentModes = getModesByCategory('content');
      contentModes.forEach(mode => {
        expect(mode.category).toBe('content');
      });
    });
  });
});
