export const OrchestrationEngine = {
  STATES: [
    'idle',
    'setup',
    'round1_active',
    'round1_paused',
    'round1_complete',
    'round2_active',
    'round2_paused',
    'round2_complete',
    'finished'
  ] as const,

  TRANSITIONS: {
    'idle': ['setup'],
    'setup': ['round1_active', 'idle'],
    'round1_active': ['round1_paused', 'round1_complete', 'finished'],
    'round1_paused': ['round1_active', 'finished'],
    'round1_complete': ['round2_active', 'finished'],
    'round2_active': ['round2_paused', 'round2_complete', 'finished'],
    'round2_paused': ['round2_active', 'finished'],
    'round2_complete': ['finished'],
    'finished': ['setup', 'idle']
  } as Record<string, string[]>,

  getValidTransitions(currentState: string): string[] {
    return this.TRANSITIONS[currentState] || [];
  },

  canTransition(from: string, to: string): boolean {
    const valid = this.getValidTransitions(from);
    return valid.includes(to);
  },

  getStateColor(state: string): string {
    switch (state) {
      case 'idle':
      case 'setup':
        return 'bg-slate-200';
      case 'round1_active':
      case 'round2_active':
        return 'bg-indigo-600';
      case 'round1_paused':
      case 'round2_paused':
        return 'bg-amber-400';
      case 'round1_complete':
      case 'round2_complete':
      case 'finished':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-200';
    }
  },

  getStateLabel(state: string): string {
    switch (state) {
      case 'idle': return 'Idle';
      case 'setup': return 'Setup';
      case 'round1_active': return 'Round 1 Active';
      case 'round1_paused': return 'Round 1 Paused';
      case 'round1_complete': return 'Round 1 Complete';
      case 'round2_active': return 'Round 2 Active';
      case 'round2_paused': return 'Round 2 Paused';
      case 'round2_complete': return 'Round 2 Complete';
      case 'finished': return 'Finished';
      default: return state;
    }
  }
};
