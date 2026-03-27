/**
 * Rate Limiter - RPM 滑动窗口限流器
 * 用于控制下载速率，防止被 YouTube 风控
 */
export class RateLimiter {
  private windowMs = 60000;
  private timestamps: number[] = [];

  /**
   * 构造函数
   * @param {number} rpm - 每分钟最大下载数
   * @param {number} minDelay - 最小随机延迟 (毫秒)
   * @param {number} maxDelay - 最大随机延迟 (毫秒)
   */
  constructor(
    private rpm = 5,
    private minDelay = 1000,
    private maxDelay = 5000,
  ) {}

  /**
   * 清理过期的时间戳
   */
  private cleanExpiredTimestamps(): void {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
  }

  /**
   * 计算下次可执行还需等待的时间 (毫秒)
   * @returns {number} 需要等待的毫秒数，0 表示立即可执行
   */
  getNextDelay(): number {
    this.cleanExpiredTimestamps();

    if (this.timestamps.length < this.rpm) {
      return 0;
    }

    const oldestTimestamp = this.timestamps[0]!;
    const waitTime = this.windowMs - (Date.now() - oldestTimestamp);

    const jitter = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;

    return Math.max(0, waitTime + jitter);
  }

  /**
   * 记录下载完成
   */
  recordSuccess(): void {
    this.timestamps.push(Date.now());
  }

  /**
   * 获取当前窗口内已执行的次数
   * @returns {number} 当前窗口内已执行的次数
   */
  getCurrentCount(): number {
    this.cleanExpiredTimestamps();
    return this.timestamps.length;
  }

  /**
   * 获取当前配置信息
   * @returns {object} 配置信息对象
   */
  getInfo(): { rpm: number; minDelay: number; maxDelay: number; currentCount: number } {
    this.cleanExpiredTimestamps();
    return {
      rpm: this.rpm,
      minDelay: this.minDelay,
      maxDelay: this.maxDelay,
      currentCount: this.timestamps.length,
    };
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.timestamps = [];
  }
}
