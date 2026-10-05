# Backtesting disclosures

Specify a strategy rather than inventing performance. Record universe, signal, exact public-availability timestamp, exchange timezone, execution rule, weights, rebalance, exit, benchmark, currency, fees, spread/slippage, and corporate-action policy. Use the first eligible tradable session after public availability, never the earlier transaction or quarter-end date. If only a publication date is known, default to the next market session and label the conservative timing assumption.

Preserve historical constituents and ticker changes to avoid survivorship bias. Handle amendments when they became public; never overwrite past signals with revised future knowledge. Identify delisted securities, splits, dividends and whether prices are adjusted. Report exposure gaps and missing data; do not silently drop adverse events.

PTR intervals do not define a unique portfolio. If midpoint/equal weighting is requested, explicitly label a hypothetical disclosed-signal basket; report sensitivity to interval boundaries. Options lacking expiry/strike/premium/contracts cannot be priced or backtested as stock substitutes. 13F weights belong to the covered snapshot only, not the manager's total assets.

Separate (1) return since the reported transaction date, (2) return since public disclosure, and (3) implementable simulated strategy return. The first is a hindsight diagnostic. Require dated price observations and a benchmark to calculate any of them. Report sample count, horizon, drawdown, transaction costs, methodology and limitations; do not assert causality or future profitability from a backtest.
