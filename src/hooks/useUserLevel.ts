'use client';

import { useState, useEffect, useCallback } from 'react';

export type UserLevel = 'newcomer' | 'intermediate' | 'advanced';

interface UserLevelConfig {
  level: UserLevel;
  onboarded: boolean;
  role: string | null;
  sessionCount: number;
}

/**
 * Detects and manages user experience level for progressive disclosure.
 *
 * Newcomer: First session, no onboarding complete
 * Intermediate: Onboarded, < 10 sessions
 * Advanced: 10+ sessions OR self-declared expert OR used Cmd+K
 */
export function useUserLevel(): UserLevelConfig & {
  setLevel: (level: UserLevel) => void;
  incrementSession: () => void;
  escalateToAdvanced: () => void;
} {
  const [config, setConfig] = useState<UserLevelConfig>({
    level: 'newcomer',
    onboarded: false,
    role: null,
    sessionCount: 0,
  });

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onboarded = localStorage.getItem('grip-onboarded') === 'true';
    const role = localStorage.getItem('grip-role');
    const experience = localStorage.getItem('grip-experience');
    const sessionCount = parseInt(localStorage.getItem('grip-session-count') || '0', 10);

    let level: UserLevel = 'newcomer';
    if (experience === 'expert' || sessionCount >= 10) {
      level = 'advanced';
    } else if (onboarded) {
      level = 'intermediate';
    }

    // Override from explicit setting
    const explicitLevel = localStorage.getItem('grip-user-level') as UserLevel | null;
    if (explicitLevel && ['newcomer', 'intermediate', 'advanced'].includes(explicitLevel)) {
      level = explicitLevel;
    }

    setConfig({ level, onboarded, role, sessionCount });

    // Increment session count
    const newCount = sessionCount + 1;
    localStorage.setItem('grip-session-count', String(newCount));
  }, []);

  const setLevel = useCallback((level: UserLevel) => {
    localStorage.setItem('grip-user-level', level);
    setConfig(prev => ({ ...prev, level }));
  }, []);

  const incrementSession = useCallback(() => {
    setConfig(prev => {
      const newCount = prev.sessionCount + 1;
      localStorage.setItem('grip-session-count', String(newCount));
      const level = newCount >= 10 ? 'advanced' : prev.level;
      return { ...prev, sessionCount: newCount, level };
    });
  }, []);

  const escalateToAdvanced = useCallback(() => {
    localStorage.setItem('grip-user-level', 'advanced');
    setConfig(prev => ({ ...prev, level: 'advanced' }));
  }, []);

  return { ...config, setLevel, incrementSession, escalateToAdvanced };
}

/**
 * Helper to check if a feature should be visible at the current user level.
 */
export function isVisible(currentLevel: UserLevel, minimumLevel: UserLevel): boolean {
  const levels: UserLevel[] = ['newcomer', 'intermediate', 'advanced'];
  return levels.indexOf(currentLevel) >= levels.indexOf(minimumLevel);
}
