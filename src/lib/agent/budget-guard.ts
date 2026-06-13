/**
 * Budget guard — the autonomous-vs-escalate decision.
 *
 * Given an agent's ENS-derived {@link AgentPolicy} and a proposed action, decide
 * whether the agent may act autonomously (`WITHIN_BUDGET`) or must halt for a
 * hardware signature (`EXCEEDS_BUDGET`). The returned value is an
 * {@link AgentEvent} that feeds directly into `transition('EVALUATING', event)`.
 *
 * Fail-safe by construction: an action is autonomous ONLY when every condition
 * is satisfiable. Anything unknown, mismatched, or malformed escalates.
 *
 * See: src/lib/utils/ens.ts (AgentPolicy), src/lib/agent/state-machine.ts
 */

import type { AgentEvent } from './types';
import type { AgentPolicy } from '../utils/ens';

/** A unit of work the agent proposes to perform. */
export interface ProposedAction {
	/** Task category, compared against the policy's `allowedTask`. */
	taskType: string;
	/** Estimated cost of the action, in wei. */
	costWei: bigint;
}

/** The subset of agent events this guard can emit. */
export type BudgetDecision = Extract<AgentEvent, 'WITHIN_BUDGET' | 'EXCEEDS_BUDGET'>;

/** True when `requested` is one of the policy's allowed task categories. */
export function isTaskAllowed(allowedTasks: string[], requested: string): boolean {
	const normalized = requested.trim().toLowerCase();
	return allowedTasks.includes(normalized);
}

/**
 * Decide whether {@link ProposedAction} may run autonomously under {@link AgentPolicy}.
 *
 * @returns `'WITHIN_BUDGET'` to stay autonomous, or `'EXCEEDS_BUDGET'` to
 *          escalate to a Ledger signature.
 */
export function evaluateAction(policy: AgentPolicy, action: ProposedAction): BudgetDecision {
	const autonomous =
		policy.maxBudget !== null &&
		isTaskAllowed(policy.allowedTasks, action.taskType) &&
		action.costWei >= 0n &&
		action.costWei <= policy.maxBudget;

	return autonomous ? 'WITHIN_BUDGET' : 'EXCEEDS_BUDGET';
}
