import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import caelaraShieldPlugin, { shieldRouteQuote, shieldSafeSwap } from '../index';
import { pickRoute } from '../params';

const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function stubFetch(body: unknown, status = 200) {
  calls = [];
  globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const route = {
  fromChain: 'base',
  tokenIn: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  tokenOut: '0x4200000000000000000000000000000000000006',
  amount: '10000000',
};
const taker = '0x3333333333333333333333333333333333333333';
// biome-ignore lint/suspicious/noExplicitAny: the runtime, message and state are not used by these handlers
const run = (action: typeof shieldRouteQuote, parameters: Record<string, unknown>, callback?: any) =>
  action.handler({} as any, {} as any, undefined, { parameters } as any, callback);

describe('plugin shape', () => {
  it('exposes the plugin with two actions', () => {
    expect(caelaraShieldPlugin.name).toBe('caelara-shield');
    expect(caelaraShieldPlugin.actions?.map((a) => a.name)).toEqual(['SHIELD_ROUTE_QUOTE', 'SHIELD_SAFE_SWAP']);
  });

  it('says in the descriptions that nothing is signed and the override needs the user', () => {
    expect(shieldSafeSwap.description).toMatch(/never signs/i);
    expect(shieldSafeSwap.description).toMatch(/human user has agreed/i);
    expect(shieldRouteQuote.description).toMatch(/Nothing is signed/);
  });

  it('declares a required taker for the swap only', () => {
    const t = (a: typeof shieldRouteQuote) => a.parameters?.find((p) => p.name === 'taker');
    expect(t(shieldSafeSwap)?.required).toBe(true);
    expect(t(shieldRouteQuote)?.required).toBe(false);
  });

  it('constrains amount to a positive integer string and chains to the supported set', () => {
    const amount = shieldRouteQuote.parameters?.find((p) => p.name === 'amount');
    expect(amount?.schema.pattern).toBe('^[1-9][0-9]*$');
    const chain = shieldRouteQuote.parameters?.find((p) => p.name === 'fromChain');
    expect(chain?.schema.enum).toEqual(['solana', 'ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bnb']);
  });

  it('has no parameter that could carry a key, seed or signer', () => {
    for (const a of [shieldRouteQuote, shieldSafeSwap]) {
      for (const p of a.parameters ?? []) expect(p.name).not.toMatch(/key|seed|mnemonic|private|signer/i);
    }
  });
});

describe('pickRoute', () => {
  it('keeps only the known route fields and drops empty values', () => {
    expect(pickRoute({ ...route, privateKey: 'x', note: 'y', toChain: '', slippageBps: 50 })).toEqual({ ...route, slippageBps: 50 });
  });
});

describe('SHIELD_ROUTE_QUOTE handler', () => {
  it('posts to /v1/route/quote and reports the quote', async () => {
    stubFetch({
      ok: true,
      kind: 'swap',
      provider: 'velora',
      estimatedAmountOut: '5000',
      minAmountOut: '4900',
      fee: { bps: 50 },
      screening: { verdict: 'allow' },
      warnings: [],
    });
    const cb = mock(async () => []);
    const result = await run(shieldRouteQuote, route, cb);
    expect(calls[0].url).toBe('https://shield.caelaralabs.com/v1/route/quote');
    expect(JSON.parse(String(calls[0].init.body))).toEqual(route);
    expect(result.success).toBe(true);
    expect(result.text).toContain('0.50% fee included');
    expect(result.text).toContain('Token screening: allow');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fails without a request when a required parameter is missing', async () => {
    stubFetch({ ok: true });
    const result = await run(shieldRouteQuote, { fromChain: 'base' });
    expect(result.success).toBe(false);
    expect(result.text).toContain('tokenIn');
    expect(calls.length).toBe(0);
  });

  it('turns a service error body into a failed result with the reason', async () => {
    stubFetch({ ok: false, error: 'invalid_request', message: 'amount must be an integer string' }, 400);
    const result = await run(shieldRouteQuote, { ...route, amount: '1.5' });
    expect(result.success).toBe(false);
    expect(result.text).toContain('invalid_request');
  });

  it('reports a network failure without throwing', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const result = await run(shieldRouteQuote, route);
    expect(result.success).toBe(false);
    expect(result.text).toContain('network_error');
  });
});

describe('SHIELD_SAFE_SWAP handler', () => {
  it('requires the taker before any request', async () => {
    stubFetch({ ok: true });
    const result = await run(shieldSafeSwap, route);
    expect(result.success).toBe(false);
    expect(result.text).toContain('taker');
    expect(calls.length).toBe(0);
  });

  it('posts to /v1/route/build and says the transactions are unsigned', async () => {
    stubFetch({
      ok: true,
      kind: 'swap',
      provider: 'velora',
      estimatedAmountOut: '5000',
      minAmountOut: '4900',
      fee: { bps: 50 },
      screening: { verdict: 'allow' },
      transactions: [{ type: 'approval' }, { type: 'swap' }],
    });
    const result = await run(shieldSafeSwap, { ...route, taker });
    expect(calls[0].url).toBe('https://shield.caelaralabs.com/v1/route/build');
    expect(JSON.parse(String(calls[0].init.body)).taker).toBe(taker);
    expect(result.success).toBe(true);
    expect(result.text).toContain('UNSIGNED');
    expect(result.text).toContain('Nothing was signed or sent');
  });

  it('reports a screening block as a failure with the reason', async () => {
    stubFetch({ ok: false, error: 'blocked_by_screening', message: 'A token in this route screened as high risk.' }, 422);
    const result = await run(shieldSafeSwap, { ...route, taker });
    expect(result.success).toBe(false);
    expect(result.text).toContain('blocked_by_screening');
  });
});
