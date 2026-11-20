# @caelaralabs/plugin-caelara-shield

Screened swap and bridge quotes for elizaOS agents, from [Caelara Shield](https://caelaralabs.com/shield/). The plugin returns quotes and **unsigned** transactions only. It never signs, never holds keys and never sends funds: your agent's wallet signs and submits.

## Actions

| Action | What it does |
|---|---|
| `SHIELD_ROUTE_QUOTE` | A swap or bridge quote across Solana, Ethereum, Base, Arbitrum, Optimism, Polygon and BNB Chain, with a heuristic screen of both tokens. |
| `SHIELD_SAFE_SWAP` | Screens both tokens and builds UNSIGNED swap or bridge transactions. High-risk or unscreened tokens are refused unless `overrideRisk` is true. Needs the wallet address (`taker`). |

Both declare their inputs as action `parameters`, so the model extracts and validates them (`fromChain`, `toChain`, `tokenIn`, `tokenOut`, `amount`, `slippageBps`, `overrideRisk`, `taker`). `amount` is an integer string in the smallest unit of `tokenIn`. Use `"native"` for ETH, BNB, POL or SOL.

## Install

```bash
bun add @caelaralabs/plugin-caelara-shield
```

```ts
import caelaraShieldPlugin from '@caelaralabs/plugin-caelara-shield';

export const character = {
  name: 'Trader',
  plugins: [caelaraShieldPlugin],
};
```

No API key is needed. The plugin talks to https://shield.caelaralabs.com.

## Things to know

- A 0.50% integrator fee is included in the quote and is taken on-chain by the router contract or program when the transaction is executed.
- Screening is heuristic: no findings is not proof of safety. Quotes can change before you send.
- `overrideRisk` lets a high-risk or unscreened token through. The parameter description tells the model to set it only after the human user has seen the screening result and agreed. Treat it as a consent gate in your agent's design.
- Polygon and BNB Chain tokens are not screened, so builds there need `overrideRisk`. Bridging to or from Solana is not supported.
- Solana swaps depend on the service's fee-account setup and may be refused with a clear error while that is incomplete.
- The free routes are rate-limited per IP.

## Compatibility and testing

Built and tested against `@elizaos/core` 2.0.5 (type-checked, built with tsup, `bun test`). The tests use mocked network calls; the live service was exercised separately with a quote and an unsigned build. It has not been loaded into a running elizaOS agent runtime, and the registry's own validation (`elizaos publish --test`) has not been run.

## Development

```bash
bun install
bun run build
bun test
```

## License

MIT
