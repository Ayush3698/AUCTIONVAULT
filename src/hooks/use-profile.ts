"use client";

import { useCallback, useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { readProfile, writeProfile } from "@/lib/profile";

const CHECK_DELAY = 350;

export type ProfileLoadStatus = "disconnected" | "loading" | "ready";

export interface UseProfileResult {
  status: ProfileLoadStatus;
  profile: Profile | null;
  error: string | null;
  retry: () => void;
  save: (profile: Profile) => void;
}

export function useProfile(address: string | undefined): UseProfileResult {
  const [status, setStatus] = useState<ProfileLoadStatus>("disconnected");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [prevAddress, setPrevAddress] = useState<string | null>(null);

  const current = address ?? null;
  if (prevAddress !== current) {
    setPrevAddress(current);
    setStatus(current ? "loading" : "disconnected");
    setProfile(null);
    setError(null);
  }

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        const stored = readProfile(address);
        if (cancelled) return;
        setProfile(stored);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setError("Could not load profile. Please try again.");
        setStatus("ready");
      }
    }, CHECK_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address, attempt]);

  const save = useCallback((next: Profile) => {
    try {
      writeProfile(next);
    } catch {}

    setProfile(next);
    setStatus("ready");
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  return { status, profile, error, retry, save };
}