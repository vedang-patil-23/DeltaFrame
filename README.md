# DeltaFrame

DeltaFrame is an open-source, full-stack crypto order book and trading simulation app. This project is not a finished product or a professional trading tool—it's a learning experience, a place to experiment, and a record of my journey in fintech and web development.

---

## Project Background & Learning Journey

DeltaFrame is the next step in my ongoing exploration of financial technology and web app development. My approach is to build, break, and rebuild—learning by doing, making mistakes, and iterating. This project is a direct result of that philosophy.

### Experiments and Evolution
- **Initial Storage with CSV:** I began by storing trades and holdings in CSV files for simplicity and transparency. This allowed for easy inspection and quick prototyping, but quickly revealed limitations in reliability, scalability, and data integrity.
- **Migration to SQLite with Sequelize:** Recognizing the drawbacks of CSV, I migrated the backend to use SQLite with Sequelize ORM. This provided robust data management, transactional safety, and a more realistic foundation for simulating trading activity.
- **Refactoring Holdings Logic:** Originally, holdings were tracked in a dedicated table. After further research and feedback, I removed the Holdings table and now compute holdings dynamically from the Trades table, ensuring data consistency and reducing redundancy.
- **Continuous Refactoring:** Throughout development, I have prioritized long-term, production-grade solutions over quick fixes, even if it meant reworking large parts of the codebase. Every pivot and refactor is documented in the commit history and project notes.

> **Note:** This project is a sandbox for learning. It is not intended for production use, and I make no guarantees about reliability, security, or completeness.

---

## Features

- **Live Order Book:**
  - Fetches and displays real-time order book data for any supported CCXT exchange and trading pair.
  - Responsive UI with robust error handling for unsupported or offline exchanges.

- **Advanced Charting:**
  - Interactive candlestick, line, and area charts powered by Highcharts.
  - Features include zoom, pan, export (PNG, SVG, PDF, CSV), and tooltips with detailed OHLCV data.
  - Fully theme-aware, supporting both light and dark modes.

- **Trading Simulation:**
  - Simulate buy/sell trades, track portfolio holdings, and view trade history.
  - All trades are persisted in SQLite via Sequelize ORM.
  - Holdings are computed on-the-fly from trade history for accuracy.

- **Portfolio & P&L Tracking:**
  - View current holdings, trade history, and live unrealized P&L based on the latest market prices.
  - Portfolio value updates in real time as prices change.

- **Robust Error Handling:**
  - Clear error messages, graceful loading states, and defensive UI logic to prevent crashes or blank screens.

- **Minimal, Professional UI:**
  - Clean, responsive design focused on clarity and usability.
  - Supports both desktop and mobile devices.

---

## Technical Overview

- **Frontend:** React (Vite), Highcharts, modern CSS, responsive design.
- **Backend:** Node.js, Express, Sequelize ORM, SQLite database.
- **Data Flow:**
  - The backend fetches live order book data via CCXT and manages trades/balance in SQLite.
  - The frontend displays live data, allows simulated trading, and computes portfolio metrics in real time.
- **Data Model:**
  - Only Trades and Balance tables are persisted; holdings are derived from trades.
  - All CSV logic has been removed in favor of robust, transactional database operations.

---

## Previous Projects

DeltaFrame builds on lessons learned from earlier projects. You can explore the evolution here:
- [orderbook-viewer (original/minimal)](https://github.com/vedangp/orderbook-viewer)
- [orderbook-explorer (intermediate, more features)](https://github.com/vedangp/orderbook-explorer)
- [orderbook-vision (advanced charting, UI)](https://github.com/vedangp/orderbook-vision)

Each repository represents a distinct stage in my learning process, with its own set of experiments, mistakes, and improvements.

---

## Getting Started

1. Install dependencies in both backend and frontend:
   - `npm install` (in both `backend` and `frontend` directories)
2. Start the backend:
   - `cd backend && npm run dev` (or `node index.js`)
3. Start the frontend:
   - `cd frontend && npm run dev`
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## License
MIT (for learning and non-commercial use)

---

**Thank you for exploring DeltaFrame. If you have feedback, suggestions, or want to share your own learning journey, please open an issue or reach out. This project is a work in progress, and so am I.** 