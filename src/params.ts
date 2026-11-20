import type { ActionParameter } from '@elizaos/core';

export const CHAINS = ['solana', 'ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'bnb'] as const;

const routeParameters: ActionParameter[] = [
  { name: 'fromChain', description: 'Source chain', required: true, schema: { type: 'string', enum: [...CHAINS] } },
  {
    name: 'toChain',
    description: 'Destination chain. A value different from fromChain means a bridge (EVM to EVM only)',
    required: false,
    schema: { type: 'string', enum: [...CHAINS] },
  },
  {
    name: 'tokenIn',
    description: 'Token to sell: "native", a token address, or a Solana mint',
    required: true,
    schema: { type: 'string' },
  },
  {
    name: 'tokenOut',
    description: 'Token to buy: "native", a token address, or a Solana mint',
    required: true,
    schema: { type: 'string' },
  },
  {
    name: 'amount',
    description: 'Amount of tokenIn as an integer string in its smallest unit (for example 10000000 for 10 USDC)',
    required: true,
    schema: { type: 'string', pattern: '^[1-9][0-9]*$' },
  },
  {
    name: 'slippageBps',
    description: 'Slippage in basis points, 1 to 500 (default 50)',
    required: false,
    schema: { type: 'number', minimum: 1, maximum: 500 },
  },
  {
    name: 'overrideRisk',
    description:
      'Let a high-risk or unscreened token through. Set true ONLY after the human user has seen the screening result and explicitly agreed',
    required: false,
    schema: { type: 'boolean', default: false },
  },
];

export const quoteParameters: ActionParameter[] = [
  ...routeParameters,
  { name: 'taker', description: 'Wallet address on fromChain (optional for a quote)', required: false, schema: { type: 'string' } },
];

export const swapParameters: ActionParameter[] = [
  ...routeParameters,
  { name: 'taker', description: 'Wallet address on fromChain that will sign the transactions', required: true, schema: { type: 'string' } },
];

export const ROUTE_KEYS = ['fromChain', 'toChain', 'tokenIn', 'tokenOut', 'amount', 'slippageBps', 'taker', 'overrideRisk'];

/** Copies only the known route fields, so nothing else the model supplied reaches the service. */
export function pickRoute(parameters: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ROUTE_KEYS) {
    const v = parameters?.[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}
