export const SHIELD_BASE_URL = 'https://shield.caelaralabs.com';

export interface ShieldResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * POSTs JSON to a Shield route with an 8 second timeout. The service answers client errors with a JSON body of the
 * form { ok: false, error, message }; that body is returned as-is. Network failures return the same shape.
 */
export async function postShield(path: string, body: unknown, baseUrl: string = SHIELD_BASE_URL): Promise<ShieldResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(baseUrl + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    try {
      return (await res.json()) as ShieldResponse;
    } catch {
      return { ok: false, error: 'bad_response', message: `Shield returned HTTP ${res.status} without JSON.` };
    }
  } catch (e) {
    return { ok: false, error: 'network_error', message: String((e as Error).message) };
  } finally {
    clearTimeout(timer);
  }
}
