import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import { registerX402xScheme } from "@x402x/extensions";
import { skaleBase, skaleBaseSepolia } from "./custom-chain";

import "dotenv/config";

type WeatherDay = {
  dayOfWeek: string;
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: "sunny" | "rainy";
};

type WeatherResponse = {
  success: boolean;
  timestamp: string;
  data: {
    city: string;
    forecast: WeatherDay[];
  };
};

async function main() {
  const chainType = process.env.SKALE_BASE_NETWORK || "testnet";

  const currentChain = chainType === "mainnet" ? skaleBase : skaleBaseSepolia;

  const baseUrl = process.env.BASE_URL || "http://localhost:3001";
  const privateKey = process.env.PRIVATE_KEY;
  const networkChainId = currentChain.id;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Setup account
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[Client] Using wallet: ${account.address}`);

  // Setup x402 client
  const coreClient = new x402Client();
  const networkId = `eip155:${networkChainId}` as `${string}:${string}`;
  registerX402xScheme(coreClient, networkId, account);

  const fetchWithDebug = async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    console.log("[Payment] Making fetch request to:", input);

    // Workaround: upstream @x402/fetch incorrectly adds Access-Control-Expose-Headers as a REQUEST header.
    if (init?.headers) {
      const h = new Headers(init.headers);
      h.delete("Access-Control-Expose-Headers");
      h.delete("access-control-expose-headers");
      init = { ...init, headers: h };
    }

    const response = await fetch(input, init);
    console.log("[Payment] Response status:", response.status);

    if (response.status === 402) {
      console.log("[Payment] Got 402, inspecting headers:");
      response.headers.forEach((value, key) => {
        console.log(
          `  ${key}: ${value.substring(0, 150)}${
            value.length > 150 ? "..." : ""
          }`
        );
      });
    }

    return response;
  };

  // Wrap fetch with payment capability
  const fetchWithPayment = wrapFetchWithPayment(
    fetchWithDebug,
    coreClient
  );

  console.log();

  const url = `${baseUrl}/api/weather`;
  console.log(`[Client] Requesting weather data from: ${url}`);



  try {
    const response = await fetchWithPayment(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(response);

    if (response.status === 402) {
        const paymentRequiredHeader =
          response.headers.get("PAYMENT-REQUIRED") || response.headers.get("payment-required");
        if (paymentRequiredHeader) {
          const decodePaymentRequired = (raw: string) => {
            const trimmed = raw.trim();

            if (trimmed.startsWith("{")) {
              return JSON.parse(trimmed) as { error?: string };
            }

            const base64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
            const padLen = (4 - (base64.length % 4)) % 4;
            const padded = base64 + "=".repeat(padLen);

            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const decoded = new TextDecoder().decode(bytes);
            return JSON.parse(decoded) as { error?: string };
          };

          let parsed: { error?: string } | undefined;
          try {
            parsed = decodePaymentRequired(paymentRequiredHeader);
          } catch (e) {
            console.warn("[Payment] Failed to parse PAYMENT-REQUIRED header", {
              headerPrefix: paymentRequiredHeader.slice(0, 32),
              headerLength: paymentRequiredHeader.length,
              error: e instanceof Error ? e.message : String(e),
            });
            throw new Error("Payment required (failed to parse PAYMENT-REQUIRED header)");
          }

          throw new Error(parsed.error || "Payment required");
        }
        throw new Error("Payment required");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

    const data = (await response.json()) as WeatherResponse;

    console.log("\n[Client] Weather data received successfully!");
    console.log(`City: ${data.data.city}`);
    console.log("\nForecast:");
    data.data.forecast.forEach((day) => {
      console.log(
        `  ${day.dayOfWeek} (${day.date}): ${day.minTemp}°C - ${day.maxTemp}°C, ${day.condition}`
      );
    });
  } catch (error) {
    console.error(
      "[Client] Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
