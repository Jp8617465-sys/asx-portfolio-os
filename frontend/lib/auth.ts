/**
 * Authentication utilities for logout and token management
 */

import { safeStorage } from './safe-storage';

export function logout() {
  // Clear localStorage
  safeStorage.removeItem('access_token');
  safeStorage.removeItem('user');

  // Clear all auth cookies
  if (typeof window !== 'undefined') {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirect to home
    window.location.href = '/';
  }
}

export function getUser() {
  const userStr = safeStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function getToken() {
  return safeStorage.getItem('access_token');
}

export function isAuthenticated() {
  return !!getToken();
}
