import { createApp, App } from 'vue';
import ThematicToast from '@/components/common/ThematicToast.vue';

type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastInstance {
  close: () => void;
}

// 管理活跃的toast实例
const activeToasts: Set<ToastInstance> = new Set();
let loadingInstance: ToastInstance | null = null;

// 消息防重复机制
const recentMessages = new Map<string, number>();
const MESSAGE_THROTTLE_TIME = 2000; // 2秒内相同消息只显示一次

/**
 * 检查消息是否应该被限制
 */
function shouldThrottleMessage(message: string): boolean {
  const now = Date.now();
  const lastShown = recentMessages.get(message);
  
  if (lastShown && (now - lastShown) < MESSAGE_THROTTLE_TIME) {
    return true; // 限制显示
  }
  
  recentMessages.set(message, now);
  
  // 清理过期的消息记录
  for (const [msg, time] of recentMessages.entries()) {
    if (now - time > MESSAGE_THROTTLE_TIME) {
      recentMessages.delete(msg);
    }
  }
  
  return false;
}

/**
 * @description 自定义 Toast 管理器，使用 ThematicToast.vue 组件
 */
class ToastManager {
  /**
   * 内部核心方法，用于创建和挂载 Toast 组件
   * @param type - 消息类型
   * @param content - 消息内容
   * @param duration - 显示时长（秒），loading 类型下此参数无效
   */
  private show(type: MessageType, content: string, duration: number = 3): ToastInstance | void {
    // 检查是否应该限制消息显示（loading类型不限制）
    if (type !== 'loading' && shouldThrottleMessage(content)) {
      console.log(`[Toast] 消息被限制显示: ${content}`);
      return;
    }

    // 限制同时显示的普通消息数量（最多3个）
    if (type !== 'loading' && activeToasts.size >= 3) {
      console.log(`[Toast] 消息数量已达上限，跳过: ${content}`);
      return;
    }

    // 如果是 loading 类型，且已有一个 loading 实例存在，则先销毁旧的
    if (type === 'loading' && loadingInstance) {
      this.hideLoading();
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const toastIndex = Array.from(activeToasts).length;

    const app = createApp(ThematicToast, {
      type,
      message: content,
      duration: duration * 1000,
      index: toastIndex,
      onDestroy: () => {
        app.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        if (type === 'loading') {
          loadingInstance = null;
        }
        activeToasts.delete(toastInstance);
      },
    });

    const instance = app.mount(container) as any;

    const toastInstance = {
      close: () => {
        instance.close();
      },
    };

    activeToasts.add(toastInstance);

    if (type === 'loading') {
      loadingInstance = toastInstance;
      return toastInstance;
    }
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  /**
   * 显示一个持续的 loading 提示，需要手动关闭
   * @param message - 消息内容
   * @returns 返回一个包含 close 方法的对象，用于关闭提示
   */
  loading(message: string): ToastInstance {
    return this.show('loading', message) as ToastInstance;
  }

  /**
   * 隐藏 loading 提示
   */
  hideLoading() {
    if (loadingInstance) {
      loadingInstance.close();
      // loadingInstance will be set to null by the onDestroy callback
    }
  }
}

// 导出单例，供全局使用
export const toast = new ToastManager();