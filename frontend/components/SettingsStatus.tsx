"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";
import { getHealth } from "../lib/api";

export default function SettingsStatus() {
  const { data, error } = useSWR("health", () => getHealth());
  const [testing, setTesting] = useState(false);

  const statusLabel = error ? "Offline" : data ? "Healthy" : "Checking...";
  const statusClass = error
    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
    : data
      ? "bg-accentSoft text-accent dark:bg-white/10 dark:text-slate-200"
      : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await getHealth();
      toast({
        title: "API OK",
        description: `Health check returned: ${res?.status ?? "ok"}`
      });
    } catch (err) {
      toast({
        title: "API Error",
        description: "Health check failed. Verify OS_API_KEY and API URL."
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center justify-between">
          <span>Render Status</span>
          <Badge className={statusClass}>{statusLabel}</Badge>
        </div>
        <p className="text-xs text-slate-500">
          This check calls `/health` to confirm the backend is reachable.
        </p>
        <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
          {testing ? "Testing..." : "Test API"}
        </Button>
      </CardContent>
    </Card>
  );
}
