import { createApp, App } from 'vue';
import ThematicToast from '@/components/common/ThematicToast.vue';

type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastInstance {
  close: () => void;
}

// 用于追踪 loading 实例
let loadingInstance: ToastInstance | null = null;

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
    // 如果是 loading 类型，且已有一个 loading 实例存在，则先销毁旧的
    if (type === 'loading' && loadingInstance) {
      this.hideLoading();
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp(ThematicToast, {
      type,
      message: content,
      duration: duration * 1000, // 组件内部使用毫秒
      onDestroy: () => {
        app.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        if (type === 'loading') {
          loadingInstance = null;
        }
      },
    });

    const instance = app.mount(container) as any;

    if (type === 'loading') {
      const toastInstance = {
        close: () => {
          instance.close();
        },
      };
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