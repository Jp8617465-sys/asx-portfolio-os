/**
 * Alert Contract Types for ASX Portfolio OS
 * Defines types for price alerts and notifications
 */

export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'SIGNAL_CHANGE' | 'VOLUME_SPIKE';
export type AlertStatus = 'active' | 'triggered' | 'disabled' | 'expired';

/** Alert configuration */
export interface Alert {
  id: number;
  userId: number;
  symbol: string;
  alertType: AlertType;
  threshold: number;
  status: AlertStatus;
  notificationChannel: string;
  createdAt: string;
  triggeredAt?: string;
  currentPrice?: number;
}

/** Request payload for creating an alert */
export interface CreateAlertPayload {
  symbol: string;
  alertType: AlertType;
  threshold: number;
  notificationChannel?: string;
}

/** Alert history entry */
export interface AlertHistoryEntry {
  id: number;
  alertId: number;
  symbol: string;
  alertType: AlertType;
  threshold: number;
  triggeredAt: string;
  priceAtTrigger: number;
  notificationSent: boolean;
}

/** Alert API Contract */
export interface AlertAPI {
  getAlerts(): Promise<{ alerts: Alert[]; count: number }>;
  createAlert(payload: CreateAlertPayload): Promise<Alert>;
  updateAlert(id: number, updates: Partial<CreateAlertPayload>): Promise<Alert>;
  deleteAlert(id: number): Promise<{ success: boolean }>;
  getAlertHistory(): Promise<{ history: AlertHistoryEntry[]; count: number }>;
}
