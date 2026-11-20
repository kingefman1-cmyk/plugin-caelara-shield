import type { Plugin } from '@elizaos/core';
import { shieldRouteQuote } from './actions/routeQuote';
import { shieldSafeSwap } from './actions/safeSwap';

export { shieldRouteQuote, shieldSafeSwap };
export { makeAction } from './actions/shieldAction';
export { postShield, SHIELD_BASE_URL } from './api';

export const caelaraShieldPlugin: Plugin = {
  name: 'caelara-shield',
  description:
    'Screened swap and bridge quotes from Caelara Shield: heuristic token screening, unsigned transactions, EVM and Solana. Never signs.',
  actions: [shieldRouteQuote, shieldSafeSwap],
};

export default caelaraShieldPlugin;
