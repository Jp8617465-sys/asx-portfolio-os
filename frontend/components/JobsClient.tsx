"use client";

import useSWR from "swr";
import Topbar from "./Topbar";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { getDriftSummary, getModelStatusSummary } from "../lib/api";

type ModelStatusSummary = {
  last_run?: {
    created_at?: string;
  };
  signals?: {
    as_of?: string;
    row_count?: number;
  };
};

type DriftSummary = {
  rows?: Array<{
    created_at?: string;
  }>;
};

const statusStyles: Record<string, string> = {
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  Failed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
  Queued: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
};

export default function JobsClient() {
  const { data: summary, isLoading: summaryLoading } = useSWR<ModelStatusSummary>(
    "model-status-summary",
    () => getModelStatusSummary("model_a_ml")
  );
  const { data: drift, isLoading: driftLoading } = useSWR<DriftSummary>(
    "drift-summary",
    () => getDriftSummary("model_a_ml")
  );
  const loading = summaryLoading && driftLoading;

  const jobs = [
    {
      name: "Model Training",
      schedule: "Manual",
      lastRun: summary?.last_run?.created_at ?? "n/a",
      status: summary?.last_run?.created_at ? "Success" : "Queued"
    },
    {
      name: "Signals Persist",
      schedule: "Triggered after training",
      lastRun: summary?.signals?.as_of ?? "n/a",
      status: summary?.signals?.row_count ? "Success" : "Queued"
    },
    {
      name: "Weekly Drift Audit",
      schedule: "Sundays 02:30",
      lastRun: drift?.rows?.[0]?.created_at ?? "n/a",
      status: drift?.rows?.length ? "Success" : "Queued"
    },
    {
      name: "Extended Feature Build",
      schedule: "Daily 03:00",
      lastRun: "Pending",
      status: "Queued"
    }
  ];

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="Automation Jobs"
        subtitle="Track job health, recent executions, and upcoming schedules."
        eyebrow="Job Control"
      />

      <Card>
        <CardHeader>
          <CardTitle>Automation Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.name}>
                    <TableCell className="font-semibold">{job.name}</TableCell>
                    <TableCell>{job.schedule}</TableCell>
                    <TableCell>{job.lastRun}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[job.status] || "bg-slate-100 text-slate-600"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
