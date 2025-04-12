/**
 * API服务封装
 * 用于与后端服务进行通信
 */
import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 由于简历处理可能需要较长时间，设置较长的超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 分析简历
 * @param {File} file - 简历文件
 * @returns {Promise} - 返回分析结果
 */
export const analyzeResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post('/analyze-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('简历分析请求失败:', error);
    throw error;
  }
};

/**
 * 获取分析状态
 * @param {string} jobId - 任务ID
 * @returns {Promise} - 返回任务状态
 */
export const getAnalysisStatus = async (jobId) => {
  try {
    const response = await api.get(`/analysis-status/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('获取分析状态失败:', error);
    throw error;
  }
};

export default api;