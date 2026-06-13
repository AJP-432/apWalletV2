/**
 * Funding decision — pool-funded vs. hardware-escalated, for one workflow node.
 *
 * Extends the simple budget check into the procurement model: an action is paid
 * from the pre-approved pool (operator wallet, cap = ENS `max_budget`) only when
 * it is an allowed task, costs no more than the per-action `escalation_threshold`,
 * and fits in the remaining pool. Anything else escalates to a Ledger signature.
 *
 * The returned `event` plugs into `transition('EVALUATING', event)`:
 *   - `POOL`     -> `WITHIN_BUDGET` -> EXECUTING
 *   - `ESCALATE` -> `EXCEEDS_BUDGET` -> AWAITING_LEDGER_SIGNATURE
 *
 * Fail-safe: unknown budget, disallowed task, or invalid cost always escalates.
 *
 * See: src/lib/utils/ens.ts (AgentPolicy), src/lib/agent/budget-guard.ts
 */

import type { AgentEvent } from './types';
import type { AgentPolicy } from '../utils/ens';
import { isTaskAllowed, type ProposedAction } from './budget-guard';

export type FundingSource = 'POOL' | 'ESCALATE';

export type FundingReason =
	| 'pool' // approved: pay from the pool
	| 'over-threshold' // single action exceeds escalation_threshold
	| 'pool-exhausted' // would overspend the remaining pool
	| 'task-not-allowed' // task category not in allowed_task
	| 'no-budget' // max_budget unset — no pool to draw from
	| 'invalid-cost'; // negative / nonsensical cost

export interface FundingDecision {
	source: FundingSource;
	event: Extract<AgentEvent, 'WITHIN_BUDGET' | 'EXCEEDS_BUDGET'>;
	reason: FundingReason;
	/** Pool capacity remaining (wei) before this action: `max(cap - spent, 0)`. */
	remainingPool: bigint;
}

function escalate(reason: FundingReason, remainingPool: bigint): FundingDecision {
	return { source: 'ESCALATE', event: 'EXCEEDS_BUDGET', reason, remainingPool };
}

/**
 * Decide how to fund a single {@link ProposedAction}.
 *
 * @param policy            The agent's ENS-resolved policy.
 * @param action            The proposed action (task type + cost in wei).
 * @param spentFromPoolWei  Cumulative amount already spent from the pool.
 */
export function decideFunding(
	policy: AgentPolicy,
	action: ProposedAction,
	spentFromPoolWei: bigint
): FundingDecision {
	if (policy.maxBudget === null) {
		return escalate('no-budget', 0n);
	}

	const remainingPool = policy.maxBudget > spentFromPoolWei ? policy.maxBudget - spentFromPoolWei : 0n;

	if (action.costWei < 0n) {
		return escalate('invalid-cost', remainingPool);
	}
	if (!isTaskAllowed(policy.allowedTasks, action.taskType)) {
		return escalate('task-not-allowed', remainingPool);
	}
	if (policy.escalationThreshold !== null && action.costWei > policy.escalationThreshold) {
		return escalate('over-threshold', remainingPool);
	}
	if (action.costWei > remainingPool) {
		return escalate('pool-exhausted', remainingPool);
	}

	return { source: 'POOL', event: 'WITHIN_BUDGET', reason: 'pool', remainingPool };
}
