import { createLogger } from "@ai-foundry/utils";
import type { Env } from "../env.js";

const logger = createLogger("svc-ingestion:unstructured");

const PARSE_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2_000;

export type UnstructuredStrategy = "auto" | "fast" | "hi_res" | "ocr_only";

export type UnstructuredElement = {
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
};

export async function parseDocument(
  fileBytes: ArrayBuffer,
  filename: string,
  mimeType: string,
  env: Env,
  strategy?: UnstructuredStrategy,
): Promise<UnstructuredElement[]> {
  if (!env.UNSTRUCTURED_API_KEY) {
    logger.warn("UNSTRUCTURED_API_KEY not set — skipping document parsing");
    return [];
  }

  const primaryStrategy = strategy ?? "auto";
  let lastError: Error | undefined;

  // Phase 1: try with primary strategy (with retries)
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info("Retrying parse", { attempt, delay, filename, strategy: primaryStrategy });
      await sleep(delay);
    }
    try {
      return await fetchUnstructured(fileBytes, filename, mimeType, env, primaryStrategy);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (!isRetryableError(e)) {
        break;
      }
      logger.warn("Retryable error", { attempt, error: lastError.message, strategy: primaryStrategy });
    }
  }

  // Phase 2: if all retries failed with timeout, fallback to "fast" strategy
  if (primaryStrategy !== "fast" && lastError && isTimeoutError(lastError)) {
    logger.info("All retries exhausted with timeout, falling back to fast strategy", {
      filename,
      originalStrategy: primaryStrategy,
    });
    try {
      return await fetchUnstructured(fileBytes, filename, mimeType, env, "fast");
    } catch (fastErr) {
      logger.warn("Fast strategy also failed", { filename, error: String(fastErr) });
      // throw the original error, not the fast-strategy error
    }
  }

  throw lastError ?? new Error("parseDocument failed");
}

async function fetchUnstructured(
  fileBytes: ArrayBuffer,
  filename: string,
  mimeType: string,
  env: Env,
  strategy: UnstructuredStrategy,
): Promise<UnstructuredElement[]> {
  const formData = new FormData();
  const blob = new Blob([fileBytes], { type: mimeType });
  formData.append("files", blob, filename);
  formData.append("strategy", strategy);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.UNSTRUCTURED_API_URL}/general/v0/general`, {
      method: "POST",
      headers: {
        "unstructured-api-key": env.UNSTRUCTURED_API_KEY,
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Unstructured.io error ${response.status}: ${body}`);
    }

    const data = await response.json() as Array<{
      type?: string;
      text?: string;
      metadata?: Record<string, unknown>;
    }>;

    return data.map((el) => {
      const element: UnstructuredElement = {
        type: el.type ?? "Text",
        text: el.text ?? "",
      };
      if (el.metadata !== undefined) {
        element.metadata = el.metadata;
      }
      return element;
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isTimeoutError(error: Error): boolean {
  if (error.name === "AbortError") return true;
  const msg = error.message.toLowerCase();
  return msg.includes("timeout") || msg.includes("524") || msg.includes("abort");
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (isTimeoutError(error)) return true;
  const msg = error.message;
  if (/\b5\d{2}\b/.test(msg)) return true;
  if (msg.includes("network") || msg.includes("fetch failed")) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
