
/**
 * Checks if a user is authenticated based on the presence of a token in localStorage
 * In a real app, this would validate the token with the backend
 */
export const isAuthenticated = (): boolean => {
  return localStorage.getItem('token') !== null;
};

/**
 * Retrieves the current user from localStorage
 * In a real app, this would typically come from a context or state management library
 */
export const getCurrentUser = () => {
  const userString = localStorage.getItem('user');
  return userString ? JSON.parse(userString) : null;
};

/**
 * Mock function to simulate logging out a user
 */
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
