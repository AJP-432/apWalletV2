/**
 * Workflow graph — the plan the agent executes.
 *
 * A goal is planned into a directed acyclic graph of fundable nodes (each a
 * procurement subtask tied to a vendor ENS name). The executor walks the graph
 * in dependency order; each node runs the agent state machine and is either
 * pool-funded or escalated to a Ledger signature.
 *
 * This module is pure graph logic — no planner, no execution, no I/O.
 *
 * See: src/lib/agent/funding.ts, src/lib/agent/state-machine.ts
 */

/** Lifecycle of a single node during execution. */
export type WorkflowNodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ESCALATED' | 'HALTED';

/** One fundable subtask in the workflow. */
export interface WorkflowNode {
	/** Unique id within the graph. */
	id: string;
	/** Human-readable label for the UI. */
	label: string;
	/** Task category, matched against the agent's `allowed_task` list. */
	taskType: string;
	/** Vendor ENS name resolved (payee + price) at execution time. */
	vendorName: string;
	/** Ids of nodes that must complete before this one. */
	dependsOn: string[];
	/** Ordering hint; higher runs earlier among ready nodes. Defaults to 0. */
	priority?: number;
	/** Optional cached cost estimate (wei); the live price comes from the vendor. */
	estimatedCostWei?: bigint;
}

/** A planned workflow: the originating goal plus its node graph. */
export interface WorkflowGraph {
	goal: string;
	nodes: WorkflowNode[];
}

/** Thrown when a workflow graph is structurally invalid (bad refs or a cycle). */
export class WorkflowValidationError extends Error {
	readonly name = 'WorkflowValidationError';
	constructor(message: string) {
		super(message);
	}
}

/**
 * Validate graph structure: unique ids, no self-dependencies, and every
 * dependency references a known node.
 *
 * @throws {WorkflowValidationError}
 */
export function validateWorkflow(graph: WorkflowGraph): void {
	const ids = new Set<string>();
	for (const n of graph.nodes) {
		if (ids.has(n.id)) {
			throw new WorkflowValidationError(`Duplicate node id "${n.id}".`);
		}
		ids.add(n.id);
	}

	for (const n of graph.nodes) {
		for (const dep of n.dependsOn) {
			if (dep === n.id) {
				throw new WorkflowValidationError(`Node "${n.id}" depends on itself.`);
			}
			if (!ids.has(dep)) {
				throw new WorkflowValidationError(`Node "${n.id}" depends on unknown node "${dep}".`);
			}
		}
	}
}

/**
 * Return the nodes in an execution order that respects all dependencies
 * (Kahn's algorithm). Among nodes that are simultaneously ready, higher
 * `priority` runs first, ties broken by declaration order.
 *
 * @throws {WorkflowValidationError} if the graph is invalid or contains a cycle.
 */
export function topologicalOrder(graph: WorkflowGraph): WorkflowNode[] {
	validateWorkflow(graph);

	const byId = new Map(graph.nodes.map((n) => [n.id, n]));
	const declaredIndex = new Map(graph.nodes.map((n, i) => [n.id, i]));
	const inDegree = new Map<string, number>(graph.nodes.map((n) => [n.id, n.dependsOn.length]));

	// Dependents of each node, so we can decrement in-degrees as we go.
	const dependents = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
	for (const n of graph.nodes) {
		for (const dep of n.dependsOn) {
			dependents.get(dep)!.push(n.id);
		}
	}

	const ordered: WorkflowNode[] = [];
	const ready = graph.nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);

	const sortReady = (ids: string[]) =>
		ids.sort((a, b) => {
			const pa = byId.get(a)!.priority ?? 0;
			const pb = byId.get(b)!.priority ?? 0;
			if (pa !== pb) return pb - pa; // higher priority first
			return declaredIndex.get(a)! - declaredIndex.get(b)!;
		});

	while (ready.length > 0) {
		sortReady(ready);
		const id = ready.shift()!;
		ordered.push(byId.get(id)!);
		for (const dependent of dependents.get(id)!) {
			inDegree.set(dependent, inDegree.get(dependent)! - 1);
			if (inDegree.get(dependent) === 0) {
				ready.push(dependent);
			}
		}
	}

	if (ordered.length !== graph.nodes.length) {
		throw new WorkflowValidationError('Workflow graph contains a cycle.');
	}

	return ordered;
}
