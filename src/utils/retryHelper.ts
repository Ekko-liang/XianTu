/**
 * 重试辅助工具
 * 提供智能重试、指数退避等功能
 */

import { toast } from './toast';

export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 初始延迟（毫秒） */
  initialDelay?: number;
  /** 最大延迟（毫秒） */
  maxDelay?: number;
  /** 延迟倍增因子 */
  backoffFactor?: number;
  /** 是否显示提示 */
  showToast?: boolean;
  /** 重试前的回调 */
  onRetry?: (attempt: number, error: Error) => void;
  /** 是否应该重试的判断函数 */
  shouldRetry?: (error: Error) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  showToast: true,
  onRetry: () => {},
  shouldRetry: () => true,
};

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算下次重试的延迟时间（指数退避）
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(exponentialDelay, options.maxDelay);
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      console.log(`[重试助手] 尝试执行 (第${attempt}/${opts.maxRetries}次)`);
      const result = await fn();

      if (attempt > 1 && opts.showToast) {
        toast.success(`操作成功 (重试${attempt - 1}次后)`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`[重试助手] 第${attempt}次尝试失败:`, error);

      // 检查是否应该重试
      if (!opts.shouldRetry(lastError)) {
        console.log(`[重试助手] 错误不可重试，停止`);
        break;
      }

      // 如果还有重试次数
      if (attempt < opts.maxRetries) {
        const delayMs = calculateDelay(attempt, opts);
        console.log(`[重试助手] 将在${delayMs}ms后重试...`);

        if (opts.showToast) {
          toast.warning(`操作失败，${delayMs / 1000}秒后重试 (${attempt}/${opts.maxRetries})`);
        }

        opts.onRetry(attempt, lastError);
        await delay(delayMs);
      }
    }
  }

  // 所有重试都失败了
  console.error(`[重试助手] 所有重试都失败了，最后错误:`, lastError);

  if (opts.showToast) {
    toast.error(`操作失败: ${lastError?.message || '未知错误'}`);
  }

  throw lastError || new Error('操作失败');
}

/**
 * 带超时的Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

/**
 * 批量重试操作
 */
export async function batchWithRetry<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  options: RetryOptions & {
    /** 并发数 */
    concurrency?: number;
    /** 失败后是否继续 */
    continueOnError?: boolean;
  } = {}
): Promise<{ success: any[], failed: { item: T, error: Error }[] }> {
  const concurrency = options.concurrency || 3;
  const continueOnError = options.continueOnError !== false;

  const success: any[] = [];
  const failed: { item: T, error: Error }[] = [];

  // 分批处理
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(item =>
        withRetry(() => fn(item), options)
          .then(result => ({ item, result }))
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success.push(result.value.result);
      } else {
        const error = result.reason as Error;
        failed.push({
          item: batch[results.indexOf(result)],
          error
        });

        if (!continueOnError) {
          console.error('[批量重试] 遇到错误，停止处理');
          return { success, failed };
        }
      }
    }
  }

  console.log(`[批量重试] 完成: 成功${success.length}个, 失败${failed.length}个`);
  return { success, failed };
}

/**
 * 创建可取消的Promise
 */
export function makeCancellable<T>(promise: Promise<T>): {
  promise: Promise<T>;
  cancel: () => void;
} {
  let cancelled = false;
  let rejectFn: ((reason?: any) => void) | null = null;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;

    promise
      .then(value => {
        if (!cancelled) {
          resolve(value);
        }
      })
      .catch(error => {
        if (!cancelled) {
          reject(error);
        }
      });
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      cancelled = true;
      if (rejectFn) {
        rejectFn(new Error('操作已取消'));
      }
    }
  };
}

/**
 * 常见的重试判断条件
 */
export const RetryConditions = {
  /** 网络错误应该重试 */
  networkError: (error: Error): boolean => {
    return error.message.includes('网络') ||
           error.message.includes('timeout') ||
           error.message.includes('连接');
  },

  /** 服务器错误应该重试（5xx） */
  serverError: (error: Error): boolean => {
    return error.message.includes('5') &&
           error.message.match(/5\d{2}/) !== null;
  },

  /** 临时错误应该重试 */
  temporaryError: (error: Error): boolean => {
    const temporaryMessages = [
      '临时',
      '繁忙',
      '稍后',
      'temporary',
      'busy',
      'throttle'
    ];

    const msg = error.message.toLowerCase();
    return temporaryMessages.some(keyword => msg.includes(keyword));
  },

  /** AI生成错误应该重试 */
  aiGenerationError: (error: Error): boolean => {
    return error.message.includes('JSON') ||
           error.message.includes('解析') ||
           error.message.includes('格式') ||
           error.message.includes('响应为空');
  },

  /** 组合多个条件（任一满足即重试） */
  any: (...conditions: Array<(error: Error) => boolean>) => {
    return (error: Error): boolean => {
      return conditions.some(condition => condition(error));
    };
  },

  /** 组合多个条件（全部满足才重试） */
  all: (...conditions: Array<(error: Error) => boolean>) => {
    return (error: Error): boolean => {
      return conditions.every(condition => condition(error));
    };
  },
};
