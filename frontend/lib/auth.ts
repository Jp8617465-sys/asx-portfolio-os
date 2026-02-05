/**
 * Authentication utilities for logout and token management
 */

export function logout() {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');

  // Clear all auth cookies
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  // Redirect to home
  window.location.href = '/';
}

export function getUser() {
  // SSR-safe: return null during server-side rendering
  if (typeof window === 'undefined') return null;

  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function getToken() {
  // SSR-safe: return null during server-side rendering
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('access_token');
}

export function isAuthenticated() {
  return !!getToken();
}
