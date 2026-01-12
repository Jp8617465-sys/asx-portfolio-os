"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import Topbar from "./Topbar";
import StatCard from "./StatCard";
import DriftChart from "./DriftChart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { getDashboard, getDriftSummary, getModelStatusSummary } from "../lib/api";

type ModelStatusSummary = {
  last_run?: {
    version?: string;
    created_at?: string;
    roc_auc_mean?: number;
  };
  signals?: {
    as_of?: string;
    row_count?: number;
  };
  drift?: {
    psi_mean?: number;
    psi_max?: number;
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
  summary?: {
    n_targets?: number;
  };
};

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardClient() {
  const { data: summary, isLoading: summaryLoading } = useSWR<ModelStatusSummary>(
    "model-status-summary",
    () => getModelStatusSummary("model_a_ml")
  );
  const { data: drift, isLoading: driftLoading } = useSWR<DriftSummary>(
    "drift-summary",
    () => getDriftSummary("model_a_ml")
  );

  const asOf = summary?.signals?.as_of;
  const { data: dashboard } = useSWR<DashboardSummary>(
    asOf ? `dashboard-${asOf}` : null,
    () => getDashboard(asOf as string, "model_a_v1_1")
  );

  const driftData = (drift?.rows || []).slice(0, 5).map((row: any, index: number) => ({
    label: row.created_at?.slice(5, 10) || `Run ${index + 1}`,
    psi: row.metrics?.psi_mean ?? 0
  })).reverse();

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="Model Health Overview"
        subtitle="Live status, drift diagnostics, and core model metrics in a single view."
      />

      <motion.section className="grid gap-6 lg:grid-cols-4" variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <StatCard
            label="Latest Version"
            value={summary?.last_run?.version ?? "n/a"}
            trend={summary?.last_run?.created_at ?? "No run recorded"}
            isLoading={summaryLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            label="ROC-AUC Mean"
            value={summary?.last_run?.roc_auc_mean ? summary.last_run.roc_auc_mean.toFixed(3) : "n/a"}
            trend="Classifier performance"
            isLoading={summaryLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            label="Signal Rows"
            value={summary?.signals?.row_count ? summary.signals.row_count.toLocaleString() : "0"}
            trend={`as_of ${summary?.signals?.as_of ?? "unknown"}`}
            isLoading={summaryLoading}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            label="Targets"
            value={dashboard?.summary?.n_targets ? dashboard.summary.n_targets.toString() : "n/a"}
            trend="Latest portfolio output"
            isLoading={!dashboard && summaryLoading}
          />
        </motion.div>
      </motion.section>

      <motion.section className="grid gap-6 lg:grid-cols-[2fr,1fr]" variants={container} initial="hidden" animate="show">
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Drift Pulse</CardTitle>
            </CardHeader>
            <CardContent>
              {driftData.length ? (
                <DriftChart data={driftData} />
              ) : (
                <p className="text-sm text-slate-500">
                  {driftLoading ? "Loading drift history..." : "No drift history available yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <Badge>Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Drift Mean</span>
                <span className="font-semibold text-ink dark:text-mist">
                  {summary?.drift?.psi_mean ? summary.drift.psi_mean.toFixed(3) : "n/a"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Drift Max</span>
                <span className="font-semibold text-ink dark:text-mist">
                  {summary?.drift?.psi_max ? summary.drift.psi_max.toFixed(3) : "n/a"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}
