/**
 * Agent State Machine — type definitions.
 *
 * The agent operates autonomously while an action stays within the
 * ENS-configured budget. The moment an action exceeds that budget (or is
 * flagged high-risk) it must halt and escalate to a hardware signature on a
 * Ledger device. These types encode that lifecycle.
 *
 * See: docs/ens/ensip-26-agent-text-records.md, AGENTS.md
 */

/** Discrete states an agent can occupy. */
export type AgentState =
	| 'IDLE' // ready, no active task
	| 'SCRAPING' // performing the autonomous, low-value `allowed_task`
	| 'EVALUATING' // checking the proposed action cost against `max_budget`
	| 'AWAITING_LEDGER_SIGNATURE' // halted; needs on-device hardware confirmation
	| 'EXECUTING' // approved (autonomously or by Ledger); performing the action
	| 'COMPLETED' // task finished successfully
	| 'HALTED'; // stopped due to rejection or error (terminal until RESET)

/** Events that can drive a state transition. */
export type AgentEvent =
	| 'START_TASK' // begin the autonomous task
	| 'SCRAPE_COMPLETE' // autonomous work produced a proposed action
	| 'WITHIN_BUDGET' // proposed cost <= max_budget: stay autonomous
	| 'EXCEEDS_BUDGET' // proposed cost > max_budget: escalate to hardware
	| 'LEDGER_APPROVED' // user physically confirmed on the Ledger device
	| 'LEDGER_REJECTED' // user rejected on the Ledger device
	| 'EXECUTION_COMPLETE' // the action finished executing
	| 'ERROR' // an unrecoverable error occurred
	| 'RESET'; // return a terminal state back to IDLE

/** The set of states from which no further progress is possible without RESET. */
export type TerminalAgentState = Extract<AgentState, 'COMPLETED' | 'HALTED'>;
