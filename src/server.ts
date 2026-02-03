import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import type { RouteConfig as X402RouteConfig } from "@x402/core/server";
import { HTTPFacilitatorClient } from "@x402/core/http";
import {
  registerRouterSettlement,
  registerSettlementHooks,
  createSettlementRouteConfig,
} from "@x402x/extensions";
import { skaleBase, skaleBaseSepolia } from "./custom-chain";
import "dotenv/config";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  "/*",
  cors({
    origin: "*",
    credentials: false,
    exposeHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
    allowHeaders: [
      "Content-Type",
      "PAYMENT-SIGNATURE",
      "PAYMENT-RESPONSE",
      "X-PAYMENT-SIGNATURE",
      "X-PAYMENT-RESPONSE",
    ],
  }),
);

// Hardcoded weather data for London
const LONDON_WEATHER = {
  city: "London",
  forecast: [
    { dayOfWeek: "Monday", date: "2026-01-13", minTemp: 8, maxTemp: 12, condition: "rainy" as const },
    { dayOfWeek: "Tuesday", date: "2026-01-14", minTemp: 6, maxTemp: 10, condition: "rainy" as const },
    { dayOfWeek: "Wednesday", date: "2026-01-15", minTemp: 7, maxTemp: 11, condition: "sunny" as const },
    { dayOfWeek: "Thursday", date: "2026-01-16", minTemp: 9, maxTemp: 13, condition: "sunny" as const },
    { dayOfWeek: "Friday", date: "2026-01-17", minTemp: 8, maxTemp: 12, condition: "rainy" as const },
    { dayOfWeek: "Saturday", date: "2026-01-18", minTemp: 7, maxTemp: 11, condition: "rainy" as const },
    { dayOfWeek: "Sunday", date: "2026-01-19", minTemp: 10, maxTemp: 14, condition: "sunny" as const },
  ],
};

async function setupWeatherRoute() {
  const chainType = process.env.SKALE_BASE_NETWORK || "testnet";

  const currentChain = chainType === "mainnet" ? skaleBase : skaleBaseSepolia;

  const facilitatorUrl = process.env.FACILITATOR_URL;
  const receivingAddress = process.env.RECEIVING_ADDRESS as `0x${string}`;
  const networkChainId = currentChain.id;

  const network = `eip155:${networkChainId}`;
  console.log("[Server] Using network:", network);

  if (!facilitatorUrl || !receivingAddress) {
    console.error("Missing required environment variables");
    throw new Error("FACILITATOR_URL and RECEIVING_ADDRESS are required");
  }

  const facilitatorClient = new HTTPFacilitatorClient({
    url: facilitatorUrl,
  });

  const resourceServer = new x402ResourceServer(facilitatorClient);

  registerExactEvmScheme(resourceServer, {
    // Allow any EIP-155 network; x402x defines default assets per supported network.
    networks: ["eip155:*"],
  });
  registerRouterSettlement(resourceServer);
  registerSettlementHooks(resourceServer);

  await resourceServer.initialize();

  const routes = {
    "GET /api/weather": createSettlementRouteConfig(
      {
        accepts: {
          scheme: "exact",
          network,
          // Merchant address (final recipient). createSettlementRouteConfig will automatically
          // override payTo to the network settlementRouter and set finalPayTo to this value.
          payTo: receivingAddress,
          price: "$0.10",
        },
      },
      {
        // Dynamic fee: query facilitator /calculate-fee on 402 probe
        facilitatorUrl,
      },
    ) as X402RouteConfig,
  };

  app.use("/api/weather", paymentMiddleware(routes, resourceServer));

  app.get("/api/weather", async (c) => {
    console.log("[Server] Weather request received");
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: LONDON_WEATHER,
    });
  });

  console.log("[Server] Weather route configured with payment middleware");
}

async function startServer() {
  await setupWeatherRoute();

  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Weather endpoint: GET /api/weather (payment required)`);
    }
  );
}

startServer();
