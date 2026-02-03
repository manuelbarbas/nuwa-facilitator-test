# Nuwa Facilitator Test

A simplified x402 payment demo to test the [x402 facilitator](https://facilitator.x402x.dev) with hardcoded weather data.

## Overview

This project demonstrates x402 payments without the complexity of LangChain agents or external APIs. The server exposes a simple `/api/weather` endpoint that returns hardcoded London weather data for one week, protected by x402 payment middleware.

## Structure

```
├── src/
│   ├── server.ts         # Hono server with x402 payment-protected endpoint
│   ├── client.ts         # Client that makes x402 payment to access endpoint
│   └── custom-chain.ts   # SKALE Base chain configuration
├── .env                  # Environment variables
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure `.env`:
   - Copy `.env.example` to `.env`
   - `PRIVATE_KEY`: Wallet private key for the client
   - `RECEIVING_ADDRESS`: Merchant address to receive payments (NOT the settlement router)
   - `FACILITATOR_URL`: x402 facilitator URL (default: https://facilitator.x402x.dev)
   - `SKALE_BASE_NETWORK`: `"mainnet"` or `"testnet"` (default: `mainnet`)
   - `BASE_URL`: Server base URL for the client (default: http://localhost:3001)
   - `PORT`: Server port (default: 3001)

## Usage

1. Start the server:
```bash
npm run server
```

2. In a separate terminal, run the client:
```bash
npm run client
```

The client will automatically handle the x402 payment flow and retrieve the weather data.

## What it does

- **Server**: Exposes a payment-protected `/api/weather` endpoint that returns hardcoded London weather for 7 days
- **Client**: Requests the weather endpoint, automatically handles x402 payment through the facilitator, and displays the weather data
- **Facilitator**: Handles the payment settlement between client and server

## Notes

- No external APIs or LangChain required
- Weather data is hardcoded for simplicity
- Focuses on testing x402 facilitator functionality
