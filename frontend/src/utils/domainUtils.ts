/**
 * Domain detection utilities for handling different site configurations
 */

export type SiteDomain = 'maidutickets' | 'sproutersecure' | 'localhost';

/**
 * Detects the current site domain based on window.location.hostname
 */
export const getCurrentDomain = (): SiteDomain => {
  if (typeof window === 'undefined') {
    return 'localhost'; // Default for SSR
  }

  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('maidutickets.com')) {
    return 'maidutickets';
  } else if (hostname.includes('sproutersecure.com')) {
    return 'sproutersecure';
  } else {
    return 'localhost';
  }
};

/**
 * Gets the appropriate favicon path based on the current domain
 */
export const getFaviconPath = (filename: string): string => {
  const domain = getCurrentDomain();
  
  if (domain === 'maidutickets') {
    // Use Maidu-specific favicons (new logo)
    return `/maidu-${filename}`;
  } else {
    // Use updated Sprouter favicons with new naming
    return `/Sprouter-${filename}`;
  }
};

/**
 * Gets the appropriate logo image for the login page
 */
export const getLoginLogo = (): string => {
  const domain = getCurrentDomain();
  
  if (domain === 'maidutickets') {
    return '/maidu3.png'; // New Maidu logo
  } else {
    return '/Sprouter-apple-touch-icon.png'; // Correct Sprouter logo
  }
};
