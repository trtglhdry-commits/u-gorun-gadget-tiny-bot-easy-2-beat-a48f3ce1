// Tiny Bot: hourly moving-average crossover paper trader.
// Protocol: agent-fun/bars-replay/v1 — NDJSON on stdin (hello, batch, done),
// one reply per batch on stdout. Node 22, stdlib only, no network, no clock,
// no randomness: the same bars always produce the same orders.
// Strategy: per symbol, hold SOL (or any listed asset) at 20% of equity while
// its 6-hour average close sits above its 24-hour average close, otherwise
// sit in USDC. Fast > slow means uptrend, so buy; fast < slow means the
// trend broke, so sell the whole position. No shorts, no leverage.
import * as readline from "node:readline";

const FAST = 6; // fast average window, in hourly bars
const SLOW = 24; // slow average window, in hourly bars
const TARGET_BPS = 2000; // target weight per position: 20% of equity
const MAX_SLIPPAGE_BPS = 50;

interface BarMsg {
  symbol: string;
  c: string;
}
interface PositionMsg {
  symbol: string;
  qty: string;
}
interface AccountMsg {
  cash_quote_units: string;
  positions: PositionMsg[];
  equity_quote_units: string;
}
interface BatchMsg {
  type: string;
  seq: number;
  bars: BarMsg[];
  account: AccountMsg;
}
interface HelloMsg {
  type: string;
  symbols: { symbol: string; price_scale: number; qty_scale: number }[];
  capital: { quote_scale: number };
  caps: { max_weight_bps: number };
  fees: { min_notional_quote_units: string };
}

// Per-symbol close history (raw integer closes; scales are fixed per symbol,
// so raw values compare and average exactly like scaled prices).
const closes = new Map<string, bigint[]>();
let maxWeightBps = 2500;
let minNotional = 1000000n;

// Average of the last n closes, scaled by n (sum), so averages compare
// without division: fastSum * SLOW > slowSum * FAST means fast avg > slow avg.
function windowSum(history: bigint[], n: number): bigint {
  let sum = 0n;
  for (let i = history.length - n; i < history.length; i++) sum += history[i];
  return sum;
}

function decide(batch: BatchMsg): unknown[] {
  const orders: unknown[] = [];
  const equity = BigInt(batch.account.equity_quote_units);
  let cashLeft = BigInt(batch.account.cash_quote_units);
  const held = new Map<string, bigint>();
  for (const p of batch.account.positions) held.set(p.symbol, BigInt(p.qty));
  for (const bar of batch.bars) {
    const history = closes.get(bar.symbol);
    if (!history || history.length < SLOW) continue;
    const fast = windowSum(history, FAST) * BigInt(SLOW);
    const slow = windowSum(history, SLOW) * BigInt(FAST);
    const qty = held.get(bar.symbol) ?? 0n;
    if (fast > slow && qty === 0n) {
      // Uptrend and flat: buy up to the 20% target weight, capped by the
      // 25% max-weight cap and by the cash actually on hand, so orders are
      // never rejected for insufficient cash when several symbols trend
      // together (7 symbols x 20% would exceed 100% of equity).
      const target = (equity * BigInt(TARGET_BPS)) / 10000n;
      const cap = (equity * BigInt(maxWeightBps)) / 10000n;
      let notional = target < cap ? target : cap;
      if (notional > cashLeft) notional = cashLeft;
      if (notional >= minNotional) {
        cashLeft -= notional;
        orders.push({
          side: "buy",
          client_id: `b-${bar.symbol}-${batch.seq}`,
          symbol: bar.symbol,
          notional_quote_units: notional.toString(),
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        });
      }
    } else if (fast < slow && qty > 0n) {
      // Trend broke while holding: sell the whole position.
      orders.push({
        side: "sell",
        client_id: `s-${bar.symbol}-${batch.seq}`,
        symbol: bar.symbol,
        qty: qty.toString(),
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      });
    }
  }
  return orders;
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line: string) => {
  if (!line.trim()) return;
  const msg = JSON.parse(line) as HelloMsg | BatchMsg | { type: string };
  if (msg.type === "hello") {
    const hello = msg as HelloMsg;
    maxWeightBps = hello.caps.max_weight_bps;
    minNotional = BigInt(hello.fees.min_notional_quote_units);
    for (const s of hello.symbols) {
      closes.set(s.symbol, []);
    }
  } else if (msg.type === "batch") {
    const batch = msg as BatchMsg;
    for (const bar of batch.bars) {
      const history = closes.get(bar.symbol);
      if (history) history.push(BigInt(bar.c));
    }
    const orders = decide(batch);
    process.stdout.write(
      JSON.stringify({ type: "reply", seq: batch.seq, orders }) + "\n",
    );
  } else if (msg.type === "done") {
    process.exit(0);
  }
});
