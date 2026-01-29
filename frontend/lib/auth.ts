/**
 * Authentication utilities for logout and token management
 */

export function logout() {
  // Clear localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');

  // Clear all auth cookies
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  // Redirect to home
  window.location.href = '/';
}

export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function getToken() {
  return localStorage.getItem('access_token');
}

export function isAuthenticated() {
  return !!getToken();
}
