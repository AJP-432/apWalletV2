import { describe, it, expect } from 'vitest';
import {
	validateWorkflow,
	topologicalOrder,
	WorkflowValidationError,
	type WorkflowGraph,
	type WorkflowNode
} from './workflow';

const node = (id: string, dependsOn: string[] = [], priority?: number): WorkflowNode => ({
	id,
	label: `Node ${id}`,
	taskType: 'book_hotel',
	vendorName: `${id}.vendors.eth`,
	dependsOn,
	priority
});

const graph = (nodes: WorkflowNode[], goal = 'test goal'): WorkflowGraph => ({ goal, nodes });

describe('validateWorkflow', () => {
	it('accepts a valid DAG', () => {
		expect(() => validateWorkflow(graph([node('a'), node('b', ['a'])]))).not.toThrow();
	});

	it('accepts an empty workflow', () => {
		expect(() => validateWorkflow(graph([]))).not.toThrow();
	});

	it('rejects duplicate node ids', () => {
		expect(() => validateWorkflow(graph([node('a'), node('a')]))).toThrow(WorkflowValidationError);
	});

	it('rejects a dependency on an unknown node', () => {
		expect(() => validateWorkflow(graph([node('a', ['ghost'])]))).toThrow(/ghost/);
	});

	it('rejects a self-dependency', () => {
		expect(() => validateWorkflow(graph([node('a', ['a'])]))).toThrow(WorkflowValidationError);
	});
});

describe('topologicalOrder', () => {
	it('orders a linear chain by dependency', () => {
		const order = topologicalOrder(graph([node('c', ['b']), node('b', ['a']), node('a')]));
		expect(order.map((n) => n.id)).toEqual(['a', 'b', 'c']);
	});

	it('places every dependency before its dependents (diamond)', () => {
		const order = topologicalOrder(
			graph([node('d', ['b', 'c']), node('b', ['a']), node('c', ['a']), node('a')])
		);
		const pos = (id: string) => order.findIndex((n) => n.id === id);
		expect(pos('a')).toBeLessThan(pos('b'));
		expect(pos('a')).toBeLessThan(pos('c'));
		expect(pos('b')).toBeLessThan(pos('d'));
		expect(pos('c')).toBeLessThan(pos('d'));
	});

	it('breaks ties by priority (higher first), then declaration order', () => {
		// Two independent roots; NYC prioritized over London.
		const order = topologicalOrder(
			graph([node('london', [], 1), node('nyc', [], 5), node('tokyo', [])])
		);
		expect(order.map((n) => n.id)).toEqual(['nyc', 'london', 'tokyo']);
	});

	it('throws on a cycle', () => {
		expect(() => topologicalOrder(graph([node('a', ['b']), node('b', ['a'])]))).toThrow(
			WorkflowValidationError
		);
	});
});
