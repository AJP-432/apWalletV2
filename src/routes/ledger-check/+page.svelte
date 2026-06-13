<script lang="ts">
	import { getLedgerAddress } from '$lib/ledger/signer';

	type Status = 'idle' | 'connecting' | 'connected' | 'error';

	let status = $state<Status>('idle');
	let address = $state<string | null>(null);
	let message = $state('');

	// Dev-only smoke test for Phase 3 (hardware escalation layer). This exercises
	// the real WebUSB path: connect -> derive address -> verify on device.
	async function connect() {
		status = 'connecting';
		address = null;
		message = '';

		try {
			// Dynamic import keeps the browser-only transport out of SSR.
			const { connectLedger } = await import('$lib/ledger/transport');
			const { app, close } = await connectLedger();
			try {
				address = await getLedgerAddress(app, undefined, { display: true });
				status = 'connected';
			} finally {
				await close();
			}
		} catch (err) {
			status = 'error';
			message = err instanceof Error ? err.message : String(err);
		}
	}
</script>

<main class="mx-auto flex max-w-xl flex-col gap-6 p-8">
	<header>
		<p class="text-xs font-semibold tracking-widest text-amber-600 uppercase">Dev smoke test</p>
		<h1 class="text-2xl font-bold">Ledger connection check</h1>
		<p class="mt-1 text-sm text-gray-500">
			Plug in your Ledger, unlock it, open the Ethereum app, then connect. The address is shown
			on-device for you to verify.
		</p>
	</header>

	<button
		onclick={connect}
		disabled={status === 'connecting'}
		class="self-start rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
	>
		{status === 'connecting' ? 'Connecting…' : 'Connect Ledger'}
	</button>

	{#if status === 'connected' && address}
		<div class="rounded-lg border border-green-300 bg-green-50 p-4">
			<p class="text-sm font-semibold text-green-800">Connected ✓</p>
			<p class="mt-1 font-mono text-sm break-all">{address}</p>
		</div>
	{:else if status === 'error'}
		<div class="rounded-lg border border-red-300 bg-red-50 p-4">
			<p class="text-sm font-semibold text-red-800">Connection failed</p>
			<p class="mt-1 text-sm text-red-700">{message}</p>
		</div>
	{/if}
</main>
