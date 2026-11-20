import type { Action, ActionParameter, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { postShield, type ShieldResponse } from '../api';
import { pickRoute } from '../params';

interface Spec {
  name: string;
  similes: string[];
  description: string;
  path: '/v1/route/quote' | '/v1/route/build';
  parameters: ActionParameter[];
  needTaker: boolean;
  examples: Action['examples'];
}

const NOTE = 'Heuristic screen: no findings is not proof of safety. Quotes can change.';

function summarize(name: string, r: ShieldResponse): string {
  if (!r.ok) return `${name} failed: ${String(r.error ?? 'error')}: ${String(r.message ?? '')}`.trim();
  const screening = (r.screening ?? {}) as { verdict?: string };
  const fee = (r.fee ?? {}) as { bps?: number };
  const head = `${String(r.kind)} via ${String(r.provider)}. Estimated out ${String(r.estimatedAmountOut)} (minimum ${String(r.minAmountOut ?? 'not given')}), smallest units of the output token. Token screening: ${String(screening.verdict)}. ${(Number(fee.bps) / 100).toFixed(2)}% fee included. ${NOTE}`;
  const txs = Array.isArray(r.transactions) ? (r.transactions as { type?: string }[]) : null;
  if (txs) return `${head} Built ${txs.length} UNSIGNED transaction(s): ${txs.map((t) => t.type).join(', ')}. Nothing was signed or sent; the user's wallet must sign them.`;
  const warnings = Array.isArray(r.warnings) && r.warnings.length ? ` Notes: ${(r.warnings as string[]).join(' ')}` : '';
  return head + warnings + (r.blocked ? ` Blocked: ${String(r.blockedReason)}` : '');
}

export function makeAction(spec: Spec, baseUrl?: string): Action {
  return {
    name: spec.name,
    similes: spec.similes,
    description: spec.description,
    parameters: spec.parameters,
    examples: spec.examples,
    // The model extracts and validates the declared parameters; the handler re-checks the required ones.
    validate: async (_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => true,
    handler: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state?: State,
      options?: { parameters?: Record<string, unknown> },
      callback?: HandlerCallback,
    ): Promise<ActionResult> => {
      const body = pickRoute(options?.parameters);
      const missing = ['fromChain', 'tokenIn', 'tokenOut', 'amount', ...(spec.needTaker ? ['taker'] : [])].filter((k) => body[k] === undefined);
      if (missing.length) {
        const text = `${spec.name} needs: ${missing.join(', ')}.`;
        if (callback) await callback({ text, actions: [spec.name] });
        return { success: false, text, error: new Error(text) };
      }
      const r = await postShield(spec.path, body, baseUrl);
      const text = summarize(spec.name, r);
      if (callback) await callback({ text, actions: [spec.name] });
      // the body is parsed JSON, which is what ActionResult.data holds
      return { success: r.ok === true, text, data: r as unknown as ActionResult['data'] };
    },
  };
}
