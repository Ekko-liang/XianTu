/**
 * API基础配置
 * 统一管理后端服务器地址
 */

// 后端API服务器地址
export const API_BASE_URL = 'http://127.0.0.1:12345';

// 如果需要在不同环境使用不同的地址，可以这样配置：
// export const API_BASE_URL = process.env.NODE_ENV === 'production' 
//   ? 'https://production-server.com:8080'  // 生产环境
//   : 'http://127.0.0.1:12345';              // 开发环境

export default API_BASE_URL;