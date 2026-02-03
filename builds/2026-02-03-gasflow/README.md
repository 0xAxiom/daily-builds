# GasFlow ⛽

**Predictive Multi-Chain Gas Optimizer**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)

GasFlow helps DeFi users save money by predicting optimal transaction timing across multiple blockchains. Stop losing 10-30% of profits to poor gas timing.

## Features

- 📊 **Multi-Chain Gas Monitoring** - Real-time gas prices from Base, Arbitrum, Polygon, Optimism
- 🔮 **Predictive Analytics** - 15/30/60 minute forecasts with confidence scoring
- 🛤️ **Route Optimization** - Find the cheapest chain for your transaction type
- 📈 **Live Dashboard** - Professional charts and real-time updates
- 💰 **Savings Calculator** - See exactly how much you can save

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GasFlow                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Chain RPCs] → Collector (5s) → SQLite → Predictor            │
│                                     ↓                           │
│  [Dashboard] ← WebSocket ← REST API ← Router                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Backend (API Server)

```bash
cd /path/to/gasflow
npm install
npm run build
npm start
```

API runs on `http://localhost:3001`

### Frontend (Dashboard)

```bash
cd dashboard
npm install
npm run dev
```

Dashboard runs on `http://localhost:5173`

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/gas` | Current gas prices for all chains |
| `GET /api/gas/:chainId` | Gas price for specific chain |
| `GET /api/predict/:chainId` | 15/30/60 min predictions |
| `GET /api/route` | Optimal chain for transaction type |
| `GET /api/market` | Market summary with volatility |
| `WS /ws` | Real-time updates |

### Example Response

```json
{
  "chains": [
    {
      "chainId": 8453,
      "name": "Base",
      "gasPrice": "0.001",
      "baseFee": "0.0008",
      "priorityFee": "0.0002",
      "pendingTxCount": 1250,
      "timestamp": 1738598400000
    }
  ]
}
```

## Supported Chains

| Chain | ID | RPC |
|-------|-----|-----|
| Base | 8453 | mainnet.base.org |
| Arbitrum | 42161 | arb1.arbitrum.io |
| Polygon | 137 | polygon-rpc.com |
| Optimism | 10 | mainnet.optimism.io |

## Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- viem (blockchain interactions)
- better-sqlite3 (time-series storage)
- ws (WebSocket)

**Frontend:**
- React 19 + Vite
- TypeScript
- Recharts (visualizations)
- Tailwind CSS

## Project Structure

```
gasflow/
├── src/
│   ├── collector.ts    # Multi-chain gas collection
│   ├── database.ts     # SQLite time-series storage
│   ├── predictor.ts    # Time-series forecasting
│   ├── router.ts       # Route optimization
│   ├── server.ts       # Express + WebSocket API
│   └── types.ts        # TypeScript definitions
├── dashboard/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GasChart.tsx       # Multi-chain comparison
│   │   │   ├── PredictionPanel.tsx # Forecast display
│   │   │   ├── RouteOptimizer.tsx  # Route calculator
│   │   │   └── MarketSummary.tsx   # Market overview
│   │   ├── api.ts      # API client
│   │   └── App.tsx     # Main application
│   └── package.json
├── ARCHITECTURE.md     # Detailed design doc
└── package.json
```

## How It Works

### Gas Collection
Every 5 seconds, the collector fetches:
- Base fee from latest block
- Priority fee (max priority fee per gas)
- Pending transaction count

Data is stored in SQLite with 24-hour retention for historical analysis.

### Prediction Engine
Uses time-series analysis to forecast gas prices:
- Simple moving average (trend)
- Hourly pattern detection (rush hours)
- Volatility-adjusted confidence scoring

### Route Optimization
Compares execution costs across chains for:
- Simple transfers (21k gas)
- ERC20 transfers (65k gas)
- Swaps (~200k gas)
- LP operations (~300k gas)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT

---

Built by [Axiom](https://github.com/0xAxiom) 🔬

Part of [daily-builds](https://github.com/0xAxiom/daily-builds) - One substantial project per day.
