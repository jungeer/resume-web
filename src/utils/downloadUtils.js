import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 生成PDF文件
 * @param {string} content - 内容文本
 * @param {string} filename - 文件名
 * @param {string} title - 文档标题
 */
export const generatePDF = async (content, filename, title = '') => {
  try {
    // 创建临时容器来渲染内容
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 800px;
      padding: 60px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      word-wrap: break-word;
      white-space: pre-wrap;
      box-sizing: border-box;
    `;

    // 创建标题和内容HTML
    let htmlContent = '';
    if (title) {
      htmlContent += `
        <div style="margin-bottom: 40px; border-bottom: 3px solid #1890ff; padding-bottom: 20px;">
          <h1 style="margin: 0 0 15px 0; font-size: 28px; color: #1890ff; font-weight: 600; text-align: center;">${title}</h1>
          <p style="margin: 0; color: #666; font-size: 14px; text-align: center;">生成时间: ${new Date().toLocaleString()}</p>
        </div>
      `;
    }
    
    // 将 Markdown 格式转换为 HTML，优化样式
    const htmlContentFormatted = content
      .replace(/^# (.*$)/gm, '<h1 style="color: #1890ff; margin: 30px 0 20px 0; font-size: 24px; font-weight: 600; border-bottom: 2px solid #1890ff; padding-bottom: 10px;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 style="color: #52c41a; margin: 25px 0 15px 0; font-size: 20px; font-weight: 600;">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 style="color: #722ed1; margin: 20px 0 12px 0; font-size: 18px; font-weight: 600;">$1</h3>')
      .replace(/^\* (.*$)/gm, '<li style="margin: 8px 0; padding-left: 5px;">$1</li>')
      .replace(/^- (.*$)/gm, '<li style="margin: 8px 0; padding-left: 5px;">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1890ff; font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #fa8c16;">$1</em>')
      .replace(/---/g, '<hr style="border: none; border-top: 2px solid #f0f0f0; margin: 30px 0;">')
      .replace(/\n\n/g, '</p><p style="margin: 12px 0; text-indent: 0;">')
      .replace(/\n/g, '<br>');

    // 添加内容容器
    htmlContent += `
      <div style="font-size: 16px; line-height: 1.8; color: #333;">
        <p style="margin: 12px 0; text-indent: 0;">${htmlContentFormatted}</p>
      </div>
    `;
    
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // 等待字体和样式加载
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用 html2canvas 渲染，优化参数
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: 1.5, // 降低scale避免过度压缩
      backgroundColor: '#ffffff',
      width: 800,
      height: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
      windowHeight: container.scrollHeight
    });

    // 清理临时容器
    document.body.removeChild(container);

    // 创建PDF，使用A4尺寸
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 计算PDF页面尺寸
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // 计算图片尺寸以适应页面
    const imgWidth = pageWidth - 20; // 留出边距
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 如果内容超过一页，需要分页处理
    if (imgHeight > pageHeight - 20) {
      const totalPages = Math.ceil(imgHeight / (pageHeight - 20));
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          doc.addPage();
        }
        
        const yOffset = i * (pageHeight - 20);
        const remainingHeight = Math.min(pageHeight - 20, imgHeight - yOffset);
        
        // 创建裁剪后的canvas
        const clippedCanvas = document.createElement('canvas');
        const clippedCtx = clippedCanvas.getContext('2d');
        
        clippedCanvas.width = canvas.width;
        clippedCanvas.height = (remainingHeight * canvas.width) / imgWidth;
        
        clippedCtx.drawImage(
          canvas,
          0, (yOffset * canvas.width) / imgWidth,
          canvas.width, clippedCanvas.height,
          0, 0,
          canvas.width, clippedCanvas.height
        );
        
        const clippedImgData = clippedCanvas.toDataURL('image/png');
        doc.addImage(clippedImgData, 'PNG', 10, 10, imgWidth, remainingHeight);
      }
    } else {
      // 内容适合一页
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    }

    doc.save(filename);
    return true;
  } catch (error) {
    console.error('生成PDF时发生错误:', error);
    throw new Error('PDF生成失败: ' + error.message);
  }
};

/**
 * 生成分页PDF（处理长内容）- 废弃，统一使用上面的方法
 * @param {string} content - 内容文本
 * @param {string} filename - 文件名
 * @param {string} title - 文档标题
 */
const generatePaginatedPDF = async (content, filename, title = '') => {
  // 直接调用主方法，保持一致性
  return await generatePDF(content, filename, title);
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
 * 生成PDF内容（内部辅助函数）
 * @param {string} content - 内容文本  
 * @param {string} title - 文档标题
 * @returns {Promise<Blob>} - PDF文件的Blob
 */
const generatePDFBlob = async (content, title = '') => {
  try {
    // 创建临时容器来渲染内容
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 800px;
      padding: 60px;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      word-wrap: break-word;
      white-space: pre-wrap;
      box-sizing: border-box;
    `;

    // 创建标题和内容HTML
    let htmlContent = '';
    if (title) {
      htmlContent += `
        <div style="margin-bottom: 40px; border-bottom: 3px solid #1890ff; padding-bottom: 20px;">
          <h1 style="margin: 0 0 15px 0; font-size: 28px; color: #1890ff; font-weight: 600; text-align: center;">${title}</h1>
          <p style="margin: 0; color: #666; font-size: 14px; text-align: center;">生成时间: ${new Date().toLocaleString()}</p>
        </div>
      `;
    }
    
    // 将 Markdown 格式转换为 HTML，优化样式
    const htmlContentFormatted = content
      .replace(/^# (.*$)/gm, '<h1 style="color: #1890ff; margin: 30px 0 20px 0; font-size: 24px; font-weight: 600; border-bottom: 2px solid #1890ff; padding-bottom: 10px;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 style="color: #52c41a; margin: 25px 0 15px 0; font-size: 20px; font-weight: 600;">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 style="color: #722ed1; margin: 20px 0 12px 0; font-size: 18px; font-weight: 600;">$1</h3>')
      .replace(/^\* (.*$)/gm, '<li style="margin: 8px 0; padding-left: 5px;">$1</li>')
      .replace(/^- (.*$)/gm, '<li style="margin: 8px 0; padding-left: 5px;">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1890ff; font-weight: 600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #fa8c16;">$1</em>')
      .replace(/---/g, '<hr style="border: none; border-top: 2px solid #f0f0f0; margin: 30px 0;">')
      .replace(/\n\n/g, '</p><p style="margin: 12px 0; text-indent: 0;">')
      .replace(/\n/g, '<br>');

    // 添加内容容器
    htmlContent += `
      <div style="font-size: 16px; line-height: 1.8; color: #333;">
        <p style="margin: 12px 0; text-indent: 0;">${htmlContentFormatted}</p>
      </div>
    `;
    
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // 等待字体和样式加载
    await new Promise(resolve => setTimeout(resolve, 100));

    // 使用 html2canvas 渲染，优化参数
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale: 1.5, // 降低scale避免过度压缩
      backgroundColor: '#ffffff',
      width: 800,
      height: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
      windowHeight: container.scrollHeight
    });

    // 清理临时容器
    document.body.removeChild(container);

    // 创建PDF，使用A4尺寸
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 计算PDF页面尺寸
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // 计算图片尺寸以适应页面
    const imgWidth = pageWidth - 20; // 留出边距
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 如果内容超过一页，需要分页处理
    if (imgHeight > pageHeight - 20) {
      const totalPages = Math.ceil(imgHeight / (pageHeight - 20));
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          doc.addPage();
        }
        
        const yOffset = i * (pageHeight - 20);
        const remainingHeight = Math.min(pageHeight - 20, imgHeight - yOffset);
        
        // 创建裁剪后的canvas
        const clippedCanvas = document.createElement('canvas');
        const clippedCtx = clippedCanvas.getContext('2d');
        
        clippedCanvas.width = canvas.width;
        clippedCanvas.height = (remainingHeight * canvas.width) / imgWidth;
        
        clippedCtx.drawImage(
          canvas,
          0, (yOffset * canvas.width) / imgWidth,
          canvas.width, clippedCanvas.height,
          0, 0,
          canvas.width, clippedCanvas.height
        );
        
        const clippedImgData = clippedCanvas.toDataURL('image/png');
        doc.addImage(clippedImgData, 'PNG', 10, 10, imgWidth, remainingHeight);
      }
    } else {
      // 内容适合一页
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    }

    // 返回PDF的Blob
    return doc.output('blob');
  } catch (error) {
    console.error('生成PDF Blob时发生错误:', error);
    throw new Error('PDF生成失败: ' + error.message);
  }
};

/**
 * 打包下载所有文件（包含PDF文件）
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
      
      // 生成PDF文件
      try {
        const pdfBlob = await generatePDFBlob(resumeText, '简历文本');
        folder.file('01_简历文本.pdf', pdfBlob);
      } catch (error) {
        console.warn('简历文本PDF生成失败:', error);
      }
    }
    
    // 添加优化建议
    if (optimizedResume) {
      folder.file('02_简历优化建议.md', `# 简历优化建议\n\n${optimizedResume}`);
      folder.file('02_简历优化建议.txt', optimizedResume);
      
      // 生成PDF文件
      try {
        const pdfBlob = await generatePDFBlob(optimizedResume, '简历优化建议');
        folder.file('02_简历优化建议.pdf', pdfBlob);
      } catch (error) {
        console.warn('优化建议PDF生成失败:', error);
      }
    }
    
    // 添加面试题
    if (interviewQuestions) {
      folder.file('03_面试题及答案.md', `# 面试题及答案\n\n${interviewQuestions}`);
      folder.file('03_面试题及答案.txt', interviewQuestions);
      
      // 生成PDF文件
      try {
        const pdfBlob = await generatePDFBlob(interviewQuestions, '面试题及答案');
        folder.file('03_面试题及答案.pdf', pdfBlob);
      } catch (error) {
        console.warn('面试题PDF生成失败:', error);
      }
    }
    
    // 添加汇总报告
    const summaryReport = generateAnalysisReport(data);
    folder.file('00_简历分析报告.md', summaryReport);
    folder.file('00_简历分析报告.txt', summaryReport);
    
    // 生成汇总报告PDF
    try {
      const summaryPdfBlob = await generatePDFBlob(summaryReport, '简历分析报告');
      folder.file('00_简历分析报告.pdf', summaryPdfBlob);
    } catch (error) {
      console.warn('汇总报告PDF生成失败:', error);
    }
    
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