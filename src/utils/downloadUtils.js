import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

/**
 * 生成PDF文件
 * @param {string} content - 内容文本
 * @param {string} filename - 文件名
 * @param {string} title - 文档标题
 */
export const generatePDF = (content, filename, title = '') => {
  try {
    const doc = new jsPDF();
    
    // 设置字体和标题
    doc.setFontSize(16);
    if (title) {
      doc.text(title, 20, 20);
      doc.setFontSize(12);
      doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, 30);
      doc.line(20, 35, 190, 35); // 分割线
    }
    
    // 设置正文字体大小
    doc.setFontSize(10);
    
    // 处理长文本，支持中文换行
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    const maxLineWidth = pageWidth - 2 * margin;
    
    // 分割文本为行
    const lines = content.split('\n');
    let yPosition = title ? 45 : 20;
    
    lines.forEach(line => {
      if (!line.trim()) {
        // 空行
        yPosition += lineHeight;
        return;
      }
      
      // 处理长行，进行换行
      const wrappedLines = doc.splitTextToSize(line, maxLineWidth);
      
      wrappedLines.forEach(wrappedLine => {
        // 检查是否需要新页面
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(wrappedLine, margin, yPosition);
        yPosition += lineHeight;
      });
    });
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('生成PDF时发生错误:', error);
    throw new Error('PDF生成失败');
  }
};

/**
 * 下载Markdown文件
 * @param {string} content - 内容文本
 * @param {string} filename - 文件名
 */
export const downloadMarkdown = (content, filename) => {
  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('下载Markdown时发生错误:', error);
    throw new Error('Markdown下载失败');
  }
};

/**
 * 下载文本文件
 * @param {string} content - 内容文本
 * @param {string} filename - 文件名
 */
export const downloadText = (content, filename) => {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
    return true;
  } catch (error) {
    console.error('下载文本时发生错误:', error);
    throw new Error('文本下载失败');
  }
};

/**
 * 生成简历分析报告
 * @param {Object} data - 分析数据
 * @returns {string} - 报告内容
 */
export const generateAnalysisReport = (data) => {
  const { fileInfo, resumeText, optimizedResume, interviewQuestions } = data;
  
  const report = `# 简历分析报告

## 📋 文件信息
- **文件名**: ${fileInfo?.name || '未知'}
- **文件大小**: ${fileInfo ? (fileInfo.size / 1024 / 1024).toFixed(2) : '0'} MB
- **文件类型**: ${fileInfo?.type || '未知'}
- **分析时间**: ${new Date().toLocaleString()}

---

## 📄 简历文本

${resumeText || '暂无内容'}

---

## ✨ 优化建议

${optimizedResume || '暂无内容'}

---

## ❓ 面试题及答案

${interviewQuestions || '暂无内容'}

---

## 📊 分析统计

- 简历文本长度: ${resumeText ? resumeText.length : 0} 字符
- 优化建议长度: ${optimizedResume ? optimizedResume.length : 0} 字符  
- 面试题长度: ${interviewQuestions ? interviewQuestions.length : 0} 字符

---

*本报告由智能简历分析系统自动生成*

**系统版本**: v1.0.0
**生成时间**: ${new Date().toISOString()}
`;

  return report;
};

/**
 * 打包下载所有文件
 * @param {Object} data - 分析数据
 * @returns {Promise<boolean>} - 下载是否成功
 */
export const downloadAllFiles = async (data) => {
  try {
    const { fileInfo, resumeText, optimizedResume, interviewQuestions } = data;
    const zip = new JSZip();
    
    // 创建文件夹结构
    const folder = zip.folder('简历分析结果');
    
    // 添加简历文本
    if (resumeText) {
      folder.file('01_简历文本.md', `# 简历文本\n\n${resumeText}`);
      folder.file('01_简历文本.txt', resumeText);
    }
    
    // 添加优化建议
    if (optimizedResume) {
      folder.file('02_简历优化建议.md', `# 简历优化建议\n\n${optimizedResume}`);
      folder.file('02_简历优化建议.txt', optimizedResume);
    }
    
    // 添加面试题
    if (interviewQuestions) {
      folder.file('03_面试题及答案.md', `# 面试题及答案\n\n${interviewQuestions}`);
      folder.file('03_面试题及答案.txt', interviewQuestions);
    }
    
    // 添加汇总报告
    const summaryReport = generateAnalysisReport(data);
    folder.file('00_简历分析报告.md', summaryReport);
    folder.file('00_简历分析报告.txt', summaryReport);
    
    // 添加JSON格式的原始数据
    const jsonData = {
      fileInfo: {
        name: fileInfo?.name,
        size: fileInfo?.size,
        type: fileInfo?.type,
        analysisTime: new Date().toISOString()
      },
      resumeText,
      optimizedResume,
      interviewQuestions,
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString()
      }
    };
    
    folder.file('data.json', JSON.stringify(jsonData, null, 2));
    
    // 生成ZIP文件
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });
    
    const filename = `简历分析结果_${fileInfo?.name?.split('.')[0] || '未知'}_${new Date().toISOString().split('T')[0]}.zip`;
    saveAs(content, filename);
    
    return true;
  } catch (error) {
    console.error('打包下载时发生错误:', error);
    throw new Error('打包下载失败');
  }
};

/**
 * 复制内容到剪贴板
 * @param {string} content - 要复制的内容
 * @returns {Promise<boolean>} - 复制是否成功
 */
export const copyToClipboard = async (content) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的文件类型
 * @returns {boolean} - 是否为允许的类型
 */
export const validateFileType = (file, allowedTypes = ['.pdf', '.doc', '.docx', '.txt']) => {
  const fileName = file.name.toLowerCase();
  return allowedTypes.some(type => fileName.endsWith(type.toLowerCase()));
};

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean} - 是否超出大小限制
 */
export const validateFileSize = (file, maxSize = 10 * 1024 * 1024) => {
  return file.size <= maxSize;
}; 