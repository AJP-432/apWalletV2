/**
 * Agent State Machine — pure transition logic.
 *
 * `transition` is a pure function: given a current state and an event it returns
 * the next state, or throws `InvalidAgentTransitionError` for any transition not
 * explicitly permitted. Illegal transitions are rejected by default ("fail
 * safe"), so an agent can never, for example, execute a high-value action
 * without either passing the budget check or obtaining a Ledger signature.
 *
 * See: src/lib/agent/types.ts, AGENTS.md
 */

import type { AgentState, AgentEvent, TerminalAgentState } from './types';

/** Thrown when an event is not valid for the current state. */
export class InvalidAgentTransitionError extends Error {
	readonly state: AgentState;
	readonly event: AgentEvent;

	constructor(state: AgentState, event: AgentEvent) {
		super(`Invalid agent transition: cannot apply event "${event}" while in state "${state}".`);
		this.name = 'InvalidAgentTransitionError';
		this.state = state;
		this.event = event;
	}
}

/**
 * Explicit transition table. Any (state, event) pair absent from this map is
 * treated as illegal. `ERROR` and `RESET` are handled uniformly below rather
 * than repeated per-state.
 */
const TRANSITIONS: Partial<Record<AgentState, Partial<Record<AgentEvent, AgentState>>>> = {
	IDLE: {
		START_TASK: 'SCRAPING'
	},
	SCRAPING: {
		SCRAPE_COMPLETE: 'EVALUATING'
	},
	EVALUATING: {
		WITHIN_BUDGET: 'EXECUTING',
		EXCEEDS_BUDGET: 'AWAITING_LEDGER_SIGNATURE'
	},
	AWAITING_LEDGER_SIGNATURE: {
		LEDGER_APPROVED: 'EXECUTING',
		LEDGER_REJECTED: 'HALTED'
	},
	EXECUTING: {
		EXECUTION_COMPLETE: 'COMPLETED'
	},
	COMPLETED: {
		RESET: 'IDLE'
	},
	HALTED: {
		RESET: 'IDLE'
	}
};

/** Active (non-terminal) states may always be forced into HALTED via ERROR. */
const ERROR_HALTABLE: ReadonlySet<AgentState> = new Set<AgentState>([
	'SCRAPING',
	'EVALUATING',
	'AWAITING_LEDGER_SIGNATURE',
	'EXECUTING'
]);

const TERMINAL_STATES: ReadonlySet<AgentState> = new Set<AgentState>(['COMPLETED', 'HALTED']);

/** Resolve the next state for `(state, event)`, or `undefined` if illegal. */
function nextState(state: AgentState, event: AgentEvent): AgentState | undefined {
	if (event === 'ERROR' && ERROR_HALTABLE.has(state)) {
		return 'HALTED';
	}
	return TRANSITIONS[state]?.[event];
}

/** Returns `true` when `event` is a valid transition from `state`. */
export function canTransition(state: AgentState, event: AgentEvent): boolean {
	return nextState(state, event) !== undefined;
}

/**
 * Apply `event` to `state` and return the resulting state.
 * @throws {InvalidAgentTransitionError} when the transition is not permitted.
 */
export function transition(state: AgentState, event: AgentEvent): AgentState {
	const next = nextState(state, event);
	if (next === undefined) {
		throw new InvalidAgentTransitionError(state, event);
	}
	return next;
}

/** Type guard: is this a terminal state (only escapable via RESET)? */
export function isTerminal(state: AgentState): state is TerminalAgentState {
	return TERMINAL_STATES.has(state);
}
