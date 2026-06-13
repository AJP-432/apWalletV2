import { describe, it, expect } from 'vitest';
import {
	transition,
	canTransition,
	isTerminal,
	InvalidAgentTransitionError
} from './state-machine';
import type { AgentState } from './types';

describe('agent state machine — nominal autonomous path', () => {
	it('starts a task from IDLE into SCRAPING', () => {
		expect(transition('IDLE', 'START_TASK')).toBe('SCRAPING');
	});

	it('moves SCRAPING -> EVALUATING when scraping completes', () => {
		expect(transition('SCRAPING', 'SCRAPE_COMPLETE')).toBe('EVALUATING');
	});

	it('stays autonomous (EVALUATING -> EXECUTING) when within budget', () => {
		expect(transition('EVALUATING', 'WITHIN_BUDGET')).toBe('EXECUTING');
	});

	it('completes execution (EXECUTING -> COMPLETED)', () => {
		expect(transition('EXECUTING', 'EXECUTION_COMPLETE')).toBe('COMPLETED');
	});
});

describe('agent state machine — hardware escalation path', () => {
	it('escalates to AWAITING_LEDGER_SIGNATURE when the budget is exceeded', () => {
		expect(transition('EVALUATING', 'EXCEEDS_BUDGET')).toBe('AWAITING_LEDGER_SIGNATURE');
	});

	it('proceeds to EXECUTING once the Ledger signature is approved', () => {
		expect(transition('AWAITING_LEDGER_SIGNATURE', 'LEDGER_APPROVED')).toBe('EXECUTING');
	});

	it('halts when the Ledger signature is rejected', () => {
		expect(transition('AWAITING_LEDGER_SIGNATURE', 'LEDGER_REJECTED')).toBe('HALTED');
	});
});

describe('agent state machine — recovery and errors', () => {
	it('resets a COMPLETED agent back to IDLE', () => {
		expect(transition('COMPLETED', 'RESET')).toBe('IDLE');
	});

	it('resets a HALTED agent back to IDLE', () => {
		expect(transition('HALTED', 'RESET')).toBe('IDLE');
	});

	it('can ERROR into HALTED from any active state', () => {
		const activeStates: AgentState[] = [
			'SCRAPING',
			'EVALUATING',
			'AWAITING_LEDGER_SIGNATURE',
			'EXECUTING'
		];
		for (const state of activeStates) {
			expect(transition(state, 'ERROR')).toBe('HALTED');
		}
	});
});

describe('agent state machine — guards (fail safe)', () => {
	it('throws InvalidAgentTransitionError on an illegal transition', () => {
		// You must never skip the budget evaluation and execute directly from IDLE.
		expect(() => transition('IDLE', 'EXECUTION_COMPLETE')).toThrow(InvalidAgentTransitionError);
	});

	it('does NOT allow EVALUATING to be approved by a Ledger signature it never requested', () => {
		expect(() => transition('EVALUATING', 'LEDGER_APPROVED')).toThrow(InvalidAgentTransitionError);
	});

	it('error includes the offending state and event for debuggability', () => {
		expect(() => transition('IDLE', 'LEDGER_APPROVED')).toThrow(/IDLE/);
		expect(() => transition('IDLE', 'LEDGER_APPROVED')).toThrow(/LEDGER_APPROVED/);
	});

	it('canTransition reflects validity without throwing', () => {
		expect(canTransition('IDLE', 'START_TASK')).toBe(true);
		expect(canTransition('IDLE', 'LEDGER_APPROVED')).toBe(false);
	});

	it('identifies terminal states', () => {
		expect(isTerminal('COMPLETED')).toBe(true);
		expect(isTerminal('HALTED')).toBe(true);
		expect(isTerminal('IDLE')).toBe(false);
		expect(isTerminal('AWAITING_LEDGER_SIGNATURE')).toBe(false);
	});
});
