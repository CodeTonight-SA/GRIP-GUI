/**
 * spike-types.ts
 *
 * §13.5 Pattern 1 — Data shape for agent-initiated IPC routing.
 *
 * Adding `workspaceId` to AgentStatus is the migration anchor for W8a-refactor.
 * Every `mainWindow.webContents.send('agent:*', agentStatus)` call site is
 * rewritten to `getWindowForWorkspace(agentStatus.workspaceId)?.webContents.send(...)`.
 *
 * Migration path for existing saved agents: on first W8a-refactor launch,
 * agents without a workspaceId are assigned to the synthetic 'default' workspace
 * created during the §13.4 partition migration.
 */

/** Minimal AgentStatus shape for the W8 spike — not the full production type. */
export interface AgentStatus {
  /** Unique agent identifier. */
  agentId: string;
  /** Display name shown in the agent grid. */
  name: string;
  /** Current lifecycle state. */
  status: 'idle' | 'running' | 'stopped' | 'error';
  /**
   * Workspace that owns this agent.
   * Added in W8a-refactor. Existing saved agents default to 'default'.
   */
  workspaceId: string;
}
