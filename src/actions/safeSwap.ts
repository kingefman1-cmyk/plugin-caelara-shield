import { swapParameters } from '../params';
import { makeAction } from './shieldAction';

export const shieldSafeSwap = makeAction({
  name: 'SHIELD_SAFE_SWAP',
  similes: ['SAFE_SWAP', 'BUILD_SWAP', 'SCREENED_SWAP'],
  description:
    'Screen both tokens (heuristic) and build UNSIGNED swap or bridge transactions. High-risk or unscreened tokens are refused unless overrideRisk is true, which must only be set after the human user has agreed. Requires the wallet address (taker). This action never signs and never sends: the user wallet must sign the returned transactions.',
  path: '/v1/route/build',
  parameters: swapParameters,
  needTaker: true,
  examples: [
    [
      { name: '{{name1}}', content: { text: 'Prepare a swap of 10 USDC to WETH on Base for my wallet 0x3333333333333333333333333333333333333333' } },
      {
        name: '{{agentName}}',
        content: { text: 'I will screen both tokens and prepare the unsigned transactions.', actions: ['SHIELD_SAFE_SWAP'] },
      },
    ],
  ],
});
