'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WalkthroughStep {
  id: string;
  title: string;
  content: React.ReactNode;
}

const ROLES = [
  { id: 'executive', label: 'EXECUTIVE', description: 'Strategy, decisions, team leadership' },
  { id: 'developer', label: 'DEVELOPER', description: 'Code, architecture, systems design' },
  { id: 'legal', label: 'LEGAL', description: 'Contracts, review, compliance' },
  { id: 'creative', label: 'CREATIVE', description: 'Writing, design, content, marketing' },
];

const EXPERIENCE_LEVELS = [
  { id: 'new', label: 'NEW TO AI', description: 'I have not used AI tools for work yet' },
  { id: 'intermediate', label: 'INTERMEDIATE', description: 'I use AI tools regularly but want more' },
  { id: 'expert', label: 'EXPERT', description: 'I am fluent with AI and want the full power interface' },
];

export default function WalkthroughPage() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const handleComplete = () => {
    // Store user preferences
    if (typeof window !== 'undefined') {
      localStorage.setItem('grip-onboarded', 'true');
      localStorage.setItem('grip-role', selectedRole || 'developer');
      localStorage.setItem('grip-experience', selectedExperience || 'intermediate');
    }
    router.push('/');
  };

  const steps: WalkthroughStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      content: (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 bg-[var(--primary)] mb-8" />
          <h1 className="text-4xl font-bold tracking-tighter text-[var(--foreground)] mb-2">
            GRIP
          </h1>
          <p className="font-mono text-xs tracking-widest text-[var(--muted-foreground)] mb-6">
            COMMANDER
          </p>
          <p className="text-[var(--muted-foreground)] max-w-md mb-8 leading-relaxed">
            Your AI thinking partner. It adapts to how you work — whether you
            are writing code, drafting contracts, or making strategic decisions.
          </p>
          <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
            149 SKILLS | 30 MODES | 21 AGENTS
          </p>
        </div>
      ),
    },
    {
      id: 'role',
      title: 'Your Work',
      content: (
        <div className="py-8">
          <span className="grip-label block mb-2">STEP 1 OF 3</span>
          <h2 className="text-2xl font-bold tracking-tighter text-[var(--foreground)] mb-2">
            What best describes your work?
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            This helps GRIP suggest the right modes and skills for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`text-left p-5 border transition-all ${
                  selectedRole === role.id
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
                    {role.label}
                  </span>
                  {selectedRole === role.id && (
                    <div className="w-5 h-5 bg-[var(--primary)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-[var(--primary-foreground)]" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{role.description}</p>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'experience',
      title: 'Experience',
      content: (
        <div className="py-8">
          <span className="grip-label block mb-2">STEP 2 OF 3</span>
          <h2 className="text-2xl font-bold tracking-tighter text-[var(--foreground)] mb-2">
            How familiar are you with AI tools?
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            GRIP adapts its interface to your experience level.
          </p>
          <div className="space-y-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedExperience(level.id)}
                className={`w-full text-left p-5 border transition-all ${
                  selectedExperience === level.id
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                    : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold tracking-widest text-[var(--foreground)]">
                    {level.label}
                  </span>
                  {selectedExperience === level.id && (
                    <div className="w-5 h-5 bg-[var(--primary)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-[var(--primary-foreground)]" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{level.description}</p>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'ready',
      title: 'Ready',
      content: (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-12 h-12 bg-[var(--success)] flex items-center justify-center mb-6">
            <Check className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold tracking-tighter text-[var(--foreground)] mb-2">
            Your GRIP is configured
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-md mb-6">
            {selectedRole === 'executive' && 'GRIP will start in Strategy mode with decision-making and leadership skills.'}
            {selectedRole === 'developer' && 'GRIP will start in Code mode with design principles and feature development skills.'}
            {selectedRole === 'legal' && 'GRIP will start in Legal mode with contract drafting and compliance skills.'}
            {selectedRole === 'creative' && 'GRIP will start in Writing mode with authentic writing and content skills.'}
            {!selectedRole && 'GRIP will start in Code mode. You can change this anytime.'}
          </p>
          <div className="space-y-2 mb-8">
            <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              {selectedExperience === 'expert' ? 'FULL INTERFACE UNLOCKED' : selectedExperience === 'new' ? 'GUIDED MODE ACTIVE' : 'STANDARD INTERFACE'}
            </p>
            <p className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)]">
              CMD+K FOR COMMANDS AT ANY TIME
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canProceed = step === 0 || step === 3 || (step === 1 && selectedRole) || (step === 2 && selectedExperience);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* Progress — animated fill */}
        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 bg-[var(--border)] overflow-hidden">
              <motion.div
                className="h-full bg-[var(--primary)]"
                initial={false}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: direction * -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-8"
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-[var(--border)]">
            <button
              onClick={() => { setDirection(-1); setStep(Math.max(0, step - 1)); }}
              disabled={step === 0}
              className="flex items-center gap-2 font-mono text-xs tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 transition-colors min-h-[48px]"
            >
              <ArrowLeft className="w-3 h-3" /> BACK
            </button>

            {isLastStep ? (
              <button
                onClick={handleComplete}
                className="flex items-center gap-2 bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 font-mono text-xs tracking-widest hover:opacity-90 transition-opacity min-h-[48px]"
              >
                ENTER GRIP <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => { setDirection(1); setStep(Math.min(steps.length - 1, step + 1)); }}
                disabled={!canProceed}
                className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-3 font-mono text-xs tracking-widest hover:opacity-90 disabled:opacity-30 transition-opacity min-h-[48px]"
              >
                CONTINUE <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        {!isLastStep && (
          <div className="text-center mt-4">
            <button
              onClick={handleComplete}
              className="font-mono text-[10px] tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              SKIP WALKTHROUGH
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
