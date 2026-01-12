"use client";

import useSWR from "swr";
import Topbar from "./Topbar";
import DriftChart from "./DriftChart";
import FeatureImpactChart from "./FeatureImpactChart";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Skeleton } from "./ui/skeleton";
import { getDashboard, getDriftSummary, getFeatureImportance, getModelStatusSummary } from "../lib/api";

type ModelStatusSummary = {
  last_run?: {
    version?: string;
    created_at?: string;
    roc_auc_mean?: number;
    rmse_mean?: number;
  };
  signals?: {
    as_of?: string;
    row_count?: number;
  };
  drift?: {
    psi_mean?: number;
  };
};

type DriftSummary = {
  rows?: Array<{
    created_at?: string;
    metrics?: {
      psi_mean?: number;
    };
  }>;
};

type DashboardSummary = {
  targets?: Array<{
    symbol?: string;
    rank?: number;
    score?: number;
    target_weight?: number;
  }>;
};

type FeatureImportance = {
  features?: Array<{
    feature: string;
    importance: number;
  }>;
};

export default function ModelsClient() {
  const { data: summary, isLoading: summaryLoading } = useSWR<ModelStatusSummary>(
    "model-status-summary",
    () => getModelStatusSummary("model_a_ml")
  );
  const asOf = summary?.signals?.as_of;
  const { data: dashboard, isLoading: dashboardLoading } = useSWR<DashboardSummary>(
    asOf ? `dashboard-${asOf}` : null,
    () => getDashboard(asOf as string, "model_a_v1_1")
  );
  const { data: drift } = useSWR<DriftSummary>(
    "drift-summary",
    () => getDriftSummary("model_a_ml")
  );
  const { data: importance, isLoading: importanceLoading } = useSWR<FeatureImportance>(
    "feature-importance",
    () => getFeatureImportance("model_a_ml", 8)
  );

  const featureImportance = (importance?.features || []).map((row: any) => ({
    name: row.feature,
    value: row.importance
  }));

  const driftSeries = (drift?.rows || []).slice(0, 6).map((row: any, index: number) => ({
    label: row.created_at?.slice(5, 10) || `Run ${index + 1}`,
    psi: row.metrics?.psi_mean ?? 0
  })).reverse();

  const targets = (dashboard?.targets || []).slice(0, 8);

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="Model Registry"
        subtitle="Track active model versions, performance metrics, and drift posture."
        eyebrow="Model Control"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Phase 2 Live</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Model A
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Model A v1.1</DropdownMenuItem>
                <DropdownMenuItem>Model A ML</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Model Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>ROC-AUC</TableHead>
                  <TableHead>RMSE</TableHead>
                  <TableHead>Drift</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {summaryLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="grid gap-3 md:grid-cols-5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell className="font-semibold">{summary?.last_run?.version ?? "n/a"}</TableCell>
                  <TableCell>{summary?.last_run?.roc_auc_mean?.toFixed?.(3) ?? "n/a"}</TableCell>
                  <TableCell>{summary?.last_run?.rmse_mean?.toFixed?.(3) ?? "n/a"}</TableCell>
                  <TableCell>{summary?.drift?.psi_mean?.toFixed?.(3) ?? "n/a"}</TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Importance</CardTitle>
            </CardHeader>
            <CardContent>
              {importanceLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : featureImportance.length ? (
                <FeatureImpactChart data={featureImportance} />
              ) : (
                <p className="text-sm text-slate-500">No feature importance available.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drift Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              {driftSeries.length ? (
                <DriftChart data={driftSeries} />
              ) : (
                <p className="text-sm text-slate-500">No drift data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top Signals (Latest)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Target Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : targets.length ? (
                targets.map((row: any) => (
                  <TableRow key={row.symbol}>
                    <TableCell>{row.rank}</TableCell>
                    <TableCell className="font-semibold">{row.symbol}</TableCell>
                    <TableCell>{row.score?.toFixed?.(4) ?? "n/a"}</TableCell>
                    <TableCell>{row.target_weight?.toFixed?.(4) ?? "n/a"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-slate-500">
                    No signals loaded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retrain Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
          <p>Retraining will be enabled once Phase 2 live integration is complete.</p>
          <Button variant="outline" disabled>
            Retrain Model
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
