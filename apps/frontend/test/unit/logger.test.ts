import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('creates logger with default INFO level', () => {
      const logger = new Logger();
      logger.info('test');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('accepts custom log level', () => {
      const logger = new Logger({ level: LogLevel.ERROR });
      logger.info('should not log');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('accepts custom timestamp setting', () => {
      const loggerNoTs = new Logger({ enableTimestamp: false });
      const loggerWithTs = new Logger({ enableTimestamp: true });

      loggerNoTs.info('no timestamp');
      loggerWithTs.info('with timestamp');

      const noTsCall = consoleSpy.mock.calls.find(c => c[0]?.includes('no timestamp'));
      const withTsCall = consoleSpy.mock.calls.find(c => c[0]?.includes('with timestamp'));

      expect(noTsCall?.[0]).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(withTsCall?.[0]).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('log levels', () => {
    it('logs debug messages', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });
      logger.debug('debug message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
    });

    it('logs info messages', () => {
      const logger = new Logger({ level: LogLevel.INFO });
      logger.info('info message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'));
    });

    it('logs warn messages', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = new Logger({ level: LogLevel.WARN });
      logger.warn('warn message');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'));
      warnSpy.mockRestore();
    });

    it('logs error messages', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => '');
      const logger = new Logger({ level: LogLevel.ERROR });
      logger.error('error message');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
      errorSpy.mockRestore();
    });

    it('respects log level filtering', () => {
      const logger = new Logger({ level: LogLevel.WARN });
      logger.debug('debug');
      logger.info('info');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('formatMessage', () => {
    it('includes message in output', () => {
      const logger = new Logger();
      logger.info('my message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('my message'));
    });

    it('includes data object in output', () => {
      const logger = new Logger();
      logger.info('with data', { key: 'value' });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('{"key":"value"}'));
    });

    it('handles unserializable data', () => {
      const logger = new Logger();
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      logger.info('circular', circular);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[unserializable data]'));
    });
  });

  describe('setLevel', () => {
    it('changes log level', () => {
      const logger = new Logger({ level: LogLevel.DEBUG });
      logger.setLevel(LogLevel.ERROR);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => '');
      logger.warn('should not log');
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('LogLevel enum', () => {
    it('has correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });
});
