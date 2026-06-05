import { callOptionalLegacyAsk } from './transport';
import { toNumber } from './utils';

export async function fetchLegacyThreadPresence(bid: number, tid: number, signal?: AbortSignal) {
  const rows = await callOptionalLegacyAsk({ ask: 'tidinfo', bid, tid }, signal);
  const row = rows[0];

  if (!row) {
    return false;
  }

  return toNumber(row.bid) === bid && toNumber(row.tid) === tid;
}
