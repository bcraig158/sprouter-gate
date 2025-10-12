/**
 * Tests for domain detection utilities
 */

import { getCurrentDomain, getFaviconPath, getLoginLogo } from '../domainUtils';

// Mock window.location for testing
const mockLocation = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: {
      hostname,
    },
    writable: true,
  });
};

describe('domainUtils', () => {
  beforeEach(() => {
    // Reset window.location mock
    delete (window as any).location;
  });

  describe('getCurrentDomain', () => {
    it('should detect maidutickets.com domain', () => {
      mockLocation('maidutickets.com');
      expect(getCurrentDomain()).toBe('maidutickets');
    });

    it('should detect sproutersecure.com domain', () => {
      mockLocation('sproutersecure.com');
      expect(getCurrentDomain()).toBe('sproutersecure');
    });

    it('should default to localhost for unknown domains', () => {
      mockLocation('localhost');
      expect(getCurrentDomain()).toBe('localhost');
    });

    it('should handle subdomains correctly', () => {
      mockLocation('www.maidutickets.com');
      expect(getCurrentDomain()).toBe('maidutickets');
    });
  });

  describe('getFaviconPath', () => {
    it('should return maidu- prefixed path for maidutickets domain', () => {
      mockLocation('maidutickets.com');
      expect(getFaviconPath('favicon.ico')).toBe('/maidu-favicon.ico');
    });

    it('should return Sprouter- prefixed path for sproutersecure domain', () => {
      mockLocation('sproutersecure.com');
      expect(getFaviconPath('favicon.ico')).toBe('/Sprouter-favicon.ico');
    });
  });

  describe('getLoginLogo', () => {
    it('should return maidu3.png for maidutickets domain', () => {
      mockLocation('maidutickets.com');
      expect(getLoginLogo()).toBe('/maidu3.png');
    });

    it('should return Sprouter-apple-touch-icon.png for sproutersecure domain', () => {
      mockLocation('sproutersecure.com');
      expect(getLoginLogo()).toBe('/Sprouter-apple-touch-icon.png');
    });
  });
});
