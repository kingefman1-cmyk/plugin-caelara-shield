import { quoteParameters } from '../params';
import { makeAction } from './shieldAction';

export const shieldRouteQuote = makeAction({
  name: 'SHIELD_ROUTE_QUOTE',
  similes: ['ROUTE_QUOTE', 'SWAP_QUOTE', 'BRIDGE_QUOTE'],
  description:
    'Get a swap or bridge quote across solana, ethereum, base, arbitrum, optimism, polygon and bnb. Includes a 0.50% integrator fee and a heuristic screen of both tokens. Nothing is signed or sent.',
  path: '/v1/route/quote',
  parameters: quoteParameters,
  needTaker: false,
  examples: [
    [
      { name: '{{name1}}', content: { text: 'How much WETH would 10 USDC get me on Base?' } },
      {
        name: '{{agentName}}',
        content: { text: 'Let me get a screened quote for that.', actions: ['SHIELD_ROUTE_QUOTE'] },
      },
    ],
  ],
});
