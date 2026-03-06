import { useRouter } from 'next/router';
import { useCallback } from 'react';
import type { ParsedUrlQuery } from 'querystring';

export interface BotScreenState {
  intent: string;
  params: Record<string, string | number>;
}

/** Intents that must never be persisted in the URL */
const SKIP_PERSIST = new Set(['init', 'refresh_token']);

/**
 * Parse bot screen state from a Next.js router query object.
 * Excludes `botId` (route param) and any SKIP_PERSIST intents.
 * Numeric-looking string values are converted back to numbers.
 */
export function parseUrlState(query: ParsedUrlQuery): BotScreenState | null {
  // Strip route params (botId) — they must not end up in intent params
  const { intent, botId: _bid, ...rest } = query as Record<string, string>;
  if (!intent || SKIP_PERSIST.has(intent)) return null;

  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== '') {
      params[k] = v !== '' && !isNaN(Number(v)) ? Number(v) : v;
    }
  }
  return { intent, params };
}

/**
 * Persists the current bot screen (intent + params) in the URL query string
 * using Next.js shallow routing so the page does not re-render on navigation.
 *
 * On page refresh the URL is re-read and the same intent+params are replayed,
 * restoring the exact screen the user was on.
 */
export function useBotUrlState() {
  const router = useRouter();

  /** Push screen state into the URL (no history entry, no re-render). */
  const saveToUrl = useCallback(
    (intent: string, params: Record<string, unknown>) => {
      if (SKIP_PERSIST.has(intent)) return;

      // botId must always be present so Next.js can interpolate /apps/[botId]
      const { botId } = router.query as Record<string, string>;
      const query: Record<string, string> = { botId, intent };
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          query[k] = String(v);
        }
      }
      router.replace({ pathname: router.pathname, query }, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  /** Remove screen state query params but keep botId (called on manual refresh). */
  const clearUrl = useCallback(() => {
    const { botId } = router.query as Record<string, string>;
    router.replace(
      { pathname: router.pathname, query: { botId } },
      undefined,
      { shallow: true },
    );
  }, [router]);

  return { saveToUrl, clearUrl };
}
