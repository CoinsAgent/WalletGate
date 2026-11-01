"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { walletAuthClient } from "@/lib/auth-client";

export function ConsentBtns() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => setReady(true), []);
  async function consent(accept: boolean) {
    if (loading) return;
    setLoading(true); setError(undefined);
    try {
      const result = await walletAuthClient.oauth2.consent({ accept });
      if (!result.error && result.data?.redirect && result.data.url) {
        window.location.assign(result.data.url);
        return;
      }
      throw new Error(accept ? "Failed to authorize. Try again." : "Failed to cancel. Try again.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Consent request failed. Try again.");
      setLoading(false);
    }
  }
  return <CardFooter className="flex flex-wrap items-center gap-2">
    <Button className="min-h-11" disabled={!ready || loading} onClick={() => void consent(true)}>Authorize</Button>
    <Button className="min-h-11" variant="outline" disabled={!ready || loading} onClick={() => void consent(false)}>Cancel</Button>
    {loading && <p role="status">Submitting your choice…</p>}
    {error && <p role="alert">{error}</p>}
  </CardFooter>;
}
