import type { Job,  Match, UserRating } from "./NetworkModels";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;

  const res = await fetch(`/api${path}`, {
      ...options,
      headers: isForm ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.detail ?? `Request failed: ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function apiWithStatus<T>(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.detail ?? `Request failed: ${res.status}`);
  }
  return { status: res.status, data: (await res.json()) as T }
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const ROMAN = ["", "I", "II", "III", "IV", "V"];

export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

export function winRate(wins: number, losses: number): number | null {
  const games = wins + losses;
  if (games === 0) return null;
  return (wins / games) * 100;
}

export async function waitForJob<T>(jobId: number, intervalMs = 1500, timeoutMs = 60_000): Promise<Job<T>> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const job = await api<Job<T>>(`/jobs/${jobId}`);

    if (job.status === "done") return job;
    if (job.status === "failed") throw new Error(job.error ?? "Job failed");

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for Bokutachi...")
}

export async function waitForMatch(matchId: number, intervalMs = 1500, timeoutMs = 60_000): Promise<Match> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const match = await api<Match>(`/match/${matchId}`);

    if (match.status != "active") return match;

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for match...");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  })
}

export function calculateTimeLeftPercentage(startTime: string | undefined, cutoffTime: string | undefined, msLeft: number | undefined) {
  const start = startTime ? new Date(startTime).getTime() : null;
  const end = cutoffTime ? new Date(cutoffTime).getTime() : null;

  if (!start || !end || msLeft === undefined)
    return 0

  const total = end - start;
  const progressTotal = end - (end - msLeft)

  return Math.min((100 - (progressTotal / total) * 100), 100);
}

export function toFixedTruncated(value: number, digits = 2) {
  const factor = 10 ** digits;
  return (Math.trunc(value * factor + Number.EPSILON * factor) / factor).toFixed(digits)
}

export function timeSince(iso: string): string {
  const then = new Date(iso);
  const now = new Date();

  const months =
  (now.getFullYear() - then.getFullYear()) * 12 +
  (now.getMonth() - then.getMonth()) -
  (now.getDate() - then.getDate() ? 1 : 0);

  if (months >= 12) return `${Math.floor(months / 12)}y`
  if (months >= 1) return `${months}mo`

  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000)
  return days >= 1 ? `${days}d` : "today"
}

export function timeAgo(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" } )
  
  const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60]
  ]

  const seconds = (new Date(iso).getTime() - Date.now()) / 1000

  for (const [unit, secs] of UNITS) {
    if (Math.abs(seconds) >= secs) {
      return rtf.format(Math.round(seconds / secs), unit)
    }
  }

  return "just now"
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function waitForRating(
  url: string,
  isCancelled: () => boolean,
  { interval = 1500, maxAttempts = 40 } = {}
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status, data } = await apiWithStatus<UserRating>(url, { method: "POST" } );
      if (status !== 202) return data;
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
    await sleep(interval)
  }
  throw new Error("Rating setup is taking too long. Try refreshing")
}