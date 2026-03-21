import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

describe('Config', () => {
  describe('type validation', () => {
    it('config object exists', () => {
      const { config } = require('../../src/config');
      expect(config).toBeDefined();
    });

    it('port is a number', () => {
      const { config } = require('../../src/config');
      expect(typeof config.port).toBe('number');
    });

    it('downloadDir is a string', () => {
      const { config } = require('../../src/config');
      expect(typeof config.downloadDir).toBe('string');
    });

    it('dbPath is a string', () => {
      const { config } = require('../../src/config');
      expect(typeof config.dbPath).toBe('string');
    });

    it('schedulerEnabled is a boolean', () => {
      const { config } = require('../../src/config');
      expect(typeof config.schedulerEnabled).toBe('boolean');
    });

    it('schedulerCron is a string', () => {
      const { config } = require('../../src/config');
      expect(typeof config.schedulerCron).toBe('string');
    });

    it('timezone is a string', () => {
      const { config } = require('../../src/config');
      expect(typeof config.timezone).toBe('string');
    });

    it('maxDownloadsPerSync is a number', () => {
      const { config } = require('../../src/config');
      expect(typeof config.maxDownloadsPerSync).toBe('number');
    });

    it('has required config properties', () => {
      const { config } = require('../../src/config');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('downloadDir');
      expect(config).toHaveProperty('dbPath');
      expect(config).toHaveProperty('proxy');
      expect(config).toHaveProperty('ytDlpProxy');
      expect(config).toHaveProperty('ytDlpCookiesFromBrowser');
      expect(config).toHaveProperty('ytDlpCookiesFile');
      expect(config).toHaveProperty('ytDlpJsRuntimes');
      expect(config).toHaveProperty('maxDownloadsPerSync');
      expect(config).toHaveProperty('schedulerEnabled');
      expect(config).toHaveProperty('schedulerCron');
      expect(config).toHaveProperty('timezone');
    });
  });
});
