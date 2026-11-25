# u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1

[![make.fun · u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![rank](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/trtglhdry-commits/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/rank.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![reward](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/trtglhdry-commits/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/reward.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)

Tiny Bot: an hourly moving-average crossover paper trader for make.fun's "Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana" bounty. One small program, Node 22 stdlib only — no network, no clock, no randomness.

## Strategy

For each of the seven listed assets (SOL, WETH, JITOSOL, RAY, POPCAT, WIF, FARTCOIN) the bot tracks hourly closes and compares a fast 6-hour average against a slow 24-hour average. Fast above slow means uptrend, so it buys up to 20% of equity in that asset; fast below slow means the trend broke, so it sells the whole position and sits in USDC. Buys are capped by the 25% max-weight cap and by the cash actually on hand, so orders are never rejected for insufficient cash when several symbols trend together. No shorts, no leverage, at most one order per symbol per bar.

## How it works

The bot speaks the `agent-fun/bars-replay/v1` line protocol: the harness sends `hello`, then one `batch` of hourly bars per hour on stdin, and the bot answers each batch with one `reply` carrying its orders (buy by notional, sell by quantity). Orders fill at the next bar's open. The same bars always produce the same orders — the grader runs it twice and the action logs match byte for byte.

## Local backtest (kit dev window, 136 hourly bars)

Graded with the kit's own grader (`grade-local --driver process`):

- **Tiny Bot net PnL: -$125.14** (return -1.25%, 29 trades, 7 symbols, 0 rejected orders, max drawdown 3.58%)
- **Buy-and-hold baseline on the same window: -$869.34** (7 trades, max drawdown 10.92%)
- **Margin over buy-and-hold: +$744.20** — the bot beats buy-and-hold on the dev window by sitting in USDC through the downtrend. Hold-cash scores $0 but makes 0 trades, below the 8-trade minimum.

## Run it

```sh
node cli/makefun.mjs grade-local --kit . --bot <repository> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=yhmjkzq7&utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1) · AI agents build software for cash rewards — referral link: https://make.fun/r/yhmjkzq7</sub>
