"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

const LeafletMap = dynamic(() => import("./LeafletMap"), {ssr: false});

type GeoData = {
  ip: string;
  city: string | null;
  region: string | null;
  postal: string | null;
  country_name: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null; // IANA e.g., "America/New_York"
  utc_offset: string | null; // e.g., "-0500"
  org: string | null; // ISP/Organization
};

type DNSAnswer = {
  type: number;
  data: string;
};

const initialCenter: [number, number] = [37.3861, -122.0839]; // fallback: Mountain View

function formatUTCOffset(utc: string | null | undefined): string {
  if (!utc || utc.length < 4) return "UTC";
  const sign = utc.startsWith("-") ? "-" : "+";
  const u = utc.replace("+", "").replace("-", "");
  const hh = u.slice(0, 2);
  const mm = u.slice(2, 4);
  return `UTC ${sign}${hh}:${mm}`;
}

export default function IpTrackerClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeoData | null>(null);
  const [mounted, setMounted] = useState(false);

  //Ensure component only renders after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (data?.latitude != null && data?.longitude != null) {
      return [data.latitude, data.longitude];
    }
    return initialCenter;
  }, [data?.latitude, data?.longitude]);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("https://ipapi.co/json/");
      const j = await res.json();
      if (j.error) throw new Error(j.reason || "Lookup failed");
      setData(j as GeoData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch your location");
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const raw = q.trim();
      const isProbablyDomain = /[a-zA-Z]/.test(raw);
      let target = raw;
      if (isProbablyDomain) {
        // Resolve domain to IPv4 using Google DNS-over-HTTPS
        try {
          const dnsRes = await fetch(
            `https://dns.google/resolve?name=${encodeURIComponent(raw)}&type=A`,
          );
          const dns = await dnsRes.json();
          const answer = Array.isArray(dns.Answer)
            ? dns.Answer.find((a: DNSAnswer) => a.type === 1)
            : null;
          if (answer && answer.data) target = answer.data;
        } catch {
          // If DNS resolution fails, fall back to ipapi directly with raw input
        }
      }
      const res = await fetch(
        `https://ipapi.co/${encodeURIComponent(target)}/json/`,
      );
      const j = await res.json();
      if (j.error) throw new Error(j.reason || "Lookup failed");
      setData(j as GeoData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchMe();
    }
  }, [fetchMe, mounted]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (query.trim()) search(query);
    },
    [query, search],
  );

  //Show loading state until component is mounted on client
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Header + Search */}
      <div className="relative z-10 flex h-full max-h-72 flex-col items-center bg-[url('/images/pattern-bg-mobile.png')] bg-cover bg-no-repeat px-6 pt-8 md:bg-[url('/images/pattern-bg-desktop.png')] md:pt-10">
        <h1 className="mb-6 z-10 text-2xl font-medium text-white md:text-3xl">
          IP Address Tracker
        </h1>
        <form
          onSubmit={onSubmit}
          className="group flex w-full z-10 max-w-xl shadow-md"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for any IP address or domain"
            className="flex-1 rounded-l-xl bg-white px-4 py-3 text-gray-700 group-hover:cursor-pointer focus:outline-none"
            aria-label="Search IP or domain"
          />
          <button
            type="submit"
            className="grid place-items-center rounded-r-xl bg-black px-6 transition-colors group-hover:cursor-pointer hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Search"
            disabled={loading}
          >
            <Image
              src="/images/icon-arrow.svg"
              alt="Search"
              width={16}
              height={16}
            />
          </button>
        </form>
        {error ? (
          <p className="mt-2 z-10 rounded bg-black/30 px-3 py-1 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {/* Info Card */}
        <div className="absolute z-10 bottom-0 left-1/2 flex w-full max-w-sm -translate-x-1/2 translate-y-1/2 flex-col items-stretch justify-between space-y-0 rounded-xl bg-white p-4 text-center shadow-lg md:w-[72%] md:max-w-7xl md:flex-row md:items-center md:space-y-0 md:p-8 md:text-left">
          {(
            [
              ["IP Address", data?.ip || "–"],
              [
                "Location",
                data
                  ? [data.city, data.region, data.postal]
                      .filter(Boolean)
                      .join(", ")
                  : "–",
              ],
              ["Timezone", formatUTCOffset(data?.utc_offset) || "UTC"],
              ["ISP", data?.org || "–"],
            ] as const
          ).map(([label, value], i) => (
            <div
              key={label}
              className={`flex-1 ${i > 0 ? "md:border-l md:pl-8" : ""} ${i > 0 ? "pt-0 md:pt-0" : ""} border-gray-200`}
            >
              <p className="mb-1 text-[10px] tracking-[0.15em] text-gray-400 uppercase">
                {label}
              </p>
              <p className="text-xl font-semibold break-words text-gray-950 md:text-2xl">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Map fills the rest */}
      <div className="z-0 h-[60vh] grow md:h-full">
        <LeafletMap
          center={center}
          zoom={13}
          markerLabel={data?.ip || undefined}
        />
      </div>
    </div>
  );
}
