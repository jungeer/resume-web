/**
 * API服务封装
 * 用于与后端服务进行通信
 */
import axios from 'axios';

// 配置基础URL - 使用环境变量或默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// 创建axios实例
const api = axios.create({
  baseURL: "/api",
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('发送API请求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('API响应成功:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API请求失败:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

/**
 * 解析简历文件
 * @param {File} file - 简历文件
 * @returns {Promise} API响应
 */
export const parseResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  
  try {
    const response = await api.post('/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '简历解析失败');
  }
};

/**
 * 生成简历优化建议
 * @param {string} resumeText - 简历文本
 * @param {Object} options - 职业和级别选项
 * @returns {Promise} API响应
 */
export const generateOptimization = async (resumeText, options = {}) => {
  try {
    const response = await api.post('/optimize', {
      resumeText,
      ...options
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '优化建议生成失败');
  }
};

/**
 * 生成面试题和答案
 * @param {string} resumeText - 简历文本
 * @param {Object} options - 职业和级别选项
 * @returns {Promise} API响应
 */
export const generateQuestions = async (resumeText, options = {}) => {
  try {
    const response = await api.post('/questions', {
      resumeText,
      ...options
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '面试题生成失败');
  }
};

/**
 * 获取职业和级别配置
 * @returns {Promise} API响应
 */
export const getConfigurations = async () => {
  try {
    const response = await api.get('/configurations');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '获取配置失败');
  }
};

/**
 * 智能分析简历，自动推荐职业和级别
 * @param {string} resumeText - 简历文本
 * @returns {Promise} API响应
 */
export const analyzeResumeIntelligently = async (resumeText) => {
  try {
    const response = await api.post('/analyze', {
      resumeText
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '智能分析失败');
  }
};

export default api; 