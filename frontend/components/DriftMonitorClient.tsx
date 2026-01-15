import { useEffect, useState } from "react";

interface DriftAlert {
  feature_name: string;
  psi_score: number;
  status: string;
}

interface DriftSummary {
  status: string;
  last_check: string;
  summary: {
    total_features: number;
    features_with_drift: number;
    features_with_warning: number;
    features_stable: number;
    max_psi_score: number;
  };
  drift_alerts: DriftAlert[];
  warning_alerts: DriftAlert[];
  trend: Array<{
    date: string;
    avg_psi: number;
    max_psi: number;
    drift_count: number;
  }>;
}

export default function DriftMonitorClient() {
  const [data, setData] = useState<DriftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriftSummary();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDriftSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDriftSummary = async () => {
    try {
      setLoading(true);
      const apiKey = process.env.NEXT_PUBLIC_OS_API_KEY || "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8788";

      const response = await fetch(`${apiUrl}/drift/summary`, {
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch drift data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRIFT":
        return "bg-red-100 text-red-800 border-red-200";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "STABLE":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.status === "no_data") {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No drift monitoring data available. Run the drift audit job first.
          </p>
        </div>
      </div>
    );
  }

  const driftPercent = (data.summary.features_with_drift / data.summary.total_features) * 100;
  const healthStatus =
    driftPercent < 5 ? "Healthy" : driftPercent < 15 ? "Warning" : "Critical";
  const healthColor =
    driftPercent < 5
      ? "text-green-600"
      : driftPercent < 15
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Model Drift Monitor</h1>
        <div className="text-sm text-gray-500">
          Last check: {new Date(data.last_check).toLocaleString()}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Health Status</h3>
          <p className={`mt-2 text-2xl font-bold ${healthColor}`}>{healthStatus}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Total Features</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {data.summary.total_features}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Features Drifting</h3>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {data.summary.features_with_drift}
          </p>
          <p className="text-sm text-gray-600">{driftPercent.toFixed(1)}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase">Max PSI Score</h3>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {data.summary.max_psi_score.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Drift Alerts */}
      {data.drift_alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Critical Drift Alerts ({data.drift_alerts.length})
          </h2>
          <div className="space-y-2">
            {data.drift_alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getStatusColor(alert.status)}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{alert.feature_name}</span>
                  <span className="text-sm font-mono">PSI: {alert.psi_score.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Alerts */}
      {data.warning_alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Warning Alerts ({data.warning_alerts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.warning_alerts.slice(0, 10).map((alert, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${getStatusColor(alert.status)}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{alert.feature_name}</span>
                  <span className="text-xs font-mono">
                    {alert.psi_score.toFixed(3)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drift Trend */}
      {data.trend.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">7-Day Drift Trend</h2>
          <div className="space-y-2">
            {data.trend.map((day, idx) => (
              <div key={idx} className="flex items-center space-x-4">
                <div className="w-24 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          day.avg_psi > 0.2 ? "bg-red-600" : day.avg_psi > 0.1 ? "bg-yellow-600" : "bg-green-600"
                        }`}
                        style={{ width: `${Math.min(day.avg_psi * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-16">
                      {day.avg_psi.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="w-20 text-sm text-gray-600">
                  {day.drift_count} drifts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
