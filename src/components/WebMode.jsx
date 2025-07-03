import React, { useState } from "react";
import {
  Upload,
  Button,
  Card,
  Steps,
  message,
  Spin,
  Typography,
  Divider,
  Space,
  Tabs,
  Modal,
  Collapse,
  Checkbox,
  Alert,
} from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileMarkdownOutlined,
  CopyOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { parseResume, generateOptimization, generateQuestions } from "../api";
import {
  generatePDF,
  downloadMarkdown,
  downloadAllFiles,
  copyToClipboard,
  formatFileSize,
  validateFileType,
  validateFileSize,
} from "../utils/downloadUtils";

const { Step } = Steps;
const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

const WebMode = ({ onBackToSelector }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [optimizedResume, setOptimizedResume] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // 用户选择的生成内容配置
  const [selectedOptions, setSelectedOptions] = useState({
    generateText: true, // 生成文本（必选，不可更改）
    generateSuggestions: true, // 生成建议（默认选中）
    generateQuestions: true, // 生成面试题（默认选中）
  });

  // 每个内容类型的独立状态
  const [contentStatus, setContentStatus] = useState({
    text: { loading: false, completed: false, error: null },
    suggestions: { loading: false, completed: false, error: null },
    questions: { loading: false, completed: false, error: null },
  });

  // 是否显示配置面板
  const [showConfig, setShowConfig] = useState(false);

  // 文件上传配置
  const uploadProps = {
    name: "file",
    multiple: false,
    accept: ".pdf,.doc,.docx,.txt",
    beforeUpload: (file) => {
      // 验证文件类型
      if (!validateFileType(file)) {
        message.error("不支持的文件类型，请上传 PDF、Word 或 TXT 文件");
        return Upload.LIST_IGNORE;
      }

      // 验证文件大小
      if (!validateFileSize(file)) {
        message.error("文件大小超过 10MB 限制");
        return Upload.LIST_IGNORE;
      }

      return false; // 阻止自动上传
    },
    onChange: (info) => {
      const { file } = info;
      if (file.status !== "uploading" && file.status !== "error") {
        setFileInfo(file);
        setCurrentStep(1);
      }
    },
    onRemove: () => {
      setFileInfo(null);
      setCurrentStep(0);
      setResumeText("");
      setOptimizedResume("");
      setInterviewQuestions("");
    },
  };

  // 处理选项变化
  const handleOptionChange = (option, checked) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [option]: checked,
    }));
  };

  // 更新内容状态的辅助函数
  const updateContentStatus = (type, status) => {
    setContentStatus((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...status },
    }));
  };

  // 开始处理简历
  const handleStartProcess = async () => {
    if (!fileInfo) {
      message.error("请先上传简历文件");
      return;
    }

    try {
      setLoading(true);
      setCurrentStep(2);

      // 步骤1：解析简历文本（必须执行）
      setProcessingStatus("正在解析简历文本...");
      updateContentStatus("text", { loading: true, error: null });

      const parseResponse = await parseResume(fileInfo);

      if (parseResponse.success) {
        setResumeText(parseResponse.data.resumeText);
        updateContentStatus("text", { loading: false, completed: true });
        setCurrentStep(3);
        message.success("简历解析完成");

        // 并行处理其他选中的内容
        const promises = [];

        if (selectedOptions.generateSuggestions) {
          promises.push(
            handleGenerateOptimization(parseResponse.data.resumeText)
          );
        }

        if (selectedOptions.generateQuestions) {
          promises.push(handleGenerateQuestions(parseResponse.data.resumeText));
        }

        // 等待所有任务完成
        await Promise.all(promises);

        setCurrentStep(getCompletedStep());
        setLoading(false);
        setProcessingStatus("");
      } else {
        throw new Error(parseResponse.message || "简历解析失败");
      }
    } catch (error) {
      console.error("处理简历时发生错误:", error);
      message.error(error.message || "处理简历时发生错误");
      updateContentStatus("text", { loading: false, error: error.message });
      setLoading(false);
      setProcessingStatus("");
    }
  };

  // 生成优化建议
  const handleGenerateOptimization = async (text) => {
    try {
      updateContentStatus("suggestions", { loading: true, error: null });

      const optimizeResponse = await generateOptimization(text);

      if (optimizeResponse.success) {
        setOptimizedResume(optimizeResponse.data.optimizedResume);
        updateContentStatus("suggestions", { loading: false, completed: true });
        message.success("优化建议生成完成");
      } else {
        const errorMsg = optimizeResponse.message || "优化建议生成失败";
        console.warn("优化建议生成失败:", errorMsg);
        updateContentStatus("suggestions", { loading: false, error: errorMsg });
      }
    } catch (error) {
      console.error("生成优化建议时发生错误:", error);
      updateContentStatus("suggestions", {
        loading: false,
        error: error.message,
      });
    }
  };

  // 生成面试题
  const handleGenerateQuestions = async (text) => {
    try {
      updateContentStatus("questions", { loading: true, error: null });

      const questionsResponse = await generateQuestions(text);

      if (questionsResponse.success) {
        setInterviewQuestions(questionsResponse.data.interviewQuestions);
        updateContentStatus("questions", { loading: false, completed: true });
        message.success("面试题生成完成");
      } else {
        const errorMsg = questionsResponse.message || "面试题生成失败";
        console.warn("面试题生成失败:", errorMsg);
        updateContentStatus("questions", { loading: false, error: errorMsg });
      }
    } catch (error) {
      console.error("生成面试题时发生错误:", error);
      updateContentStatus("questions", {
        loading: false,
        error: error.message,
      });
    }
  };

  // 获取完成步骤的索引
  const getCompletedStep = () => {
    // 计算应该跳转到哪个步骤
    let step = 3; // 基础步骤（上传、确认、处理、文本）
    if (selectedOptions.generateSuggestions) step++; // 优化建议
    if (selectedOptions.generateQuestions) step++; // 面试题
    step++; // 完成下载
    return step;
  };

  // 预览Markdown内容
  const handlePreview = (content, title) => {
    setPreviewContent(content);
    setPreviewTitle(title);
    setPreviewVisible(true);
  };

  // 下载单个文件
  const handleSingleDownload = async (content, filename, type) => {
    try {
      if (type === "pdf") {
        await generatePDF(content, filename, filename.replace(".pdf", ""));
        message.success("PDF下载成功");
      } else if (type === "md") {
        await downloadMarkdown(content, filename);
        message.success("Markdown文件下载成功");
      }
    } catch (error) {
      message.error(error.message || "下载失败");
    }
  };

  // 复制内容到剪贴板
  const handleCopyContent = async (content, title) => {
    try {
      const success = await copyToClipboard(content);
      if (success) {
        message.success(`${title}已复制到剪贴板`);
      } else {
        message.error("复制失败，请手动选择文本复制");
      }
    } catch (error) {
      message.error("复制失败");
    }
  };

  // 下载全部文件（ZIP）
  const handleDownloadAllFiles = async () => {
    try {
      const data = {
        fileInfo,
        resumeText,
        optimizedResume,
        interviewQuestions,
      };

      await downloadAllFiles(data);
      message.success("文件打包下载成功");
    } catch (error) {
      console.error("打包下载时发生错误:", error);
      message.error(error.message || "打包下载失败");
    }
  };

  // 重新开始
  const handleRestart = () => {
    setFileInfo(null);
    setCurrentStep(0);
    setResumeText("");
    setOptimizedResume("");
    setInterviewQuestions("");
    setProcessingStatus("");
    setLoading(false);
    setShowConfig(false);

    // 重置内容状态
    setContentStatus({
      text: { loading: false, completed: false, error: null },
      suggestions: { loading: false, completed: false, error: null },
      questions: { loading: false, completed: false, error: null },
    });
  };

  // 生成动态步骤配置
  const getDynamicSteps = () => {
    const steps = [
      { title: "上传简历", description: "支持PDF、Word、TXT格式" },
      { title: "确认信息", description: "检查上传的文件信息" },
      { title: "解析处理", description: "AI解析简历内容" },
      { title: "简历文本", description: "显示解析的文本内容" },
    ];

    if (selectedOptions.generateSuggestions) {
      steps.push({ title: "优化建议", description: "生成个性化建议" });
    }

    if (selectedOptions.generateQuestions) {
      steps.push({ title: "面试题库", description: "生成相关面试题" });
    }

    steps.push({ title: "完成下载", description: "查看结果并下载" });

    return steps;
  };

  // 渲染内容卡片
  const renderContentCard = (title, content, icon, type) => {
    if (!content) return null;

    const contentLength = content.length;
    const wordCount = content.split(/\s+/).length;

    return (
      <Card
        title={
          <Space>
            {icon}
            <span>{title}</span>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              ({contentLength} 字符, {wordCount} 词)
            </Text>
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(content, title)}
              size="small"
            >
              预览
            </Button>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopyContent(content, title)}
              size="small"
            >
              复制
            </Button>
            <Button
              type="text"
              icon={<FileMarkdownOutlined />}
              onClick={() => handleSingleDownload(content, `${title}.md`, "md")}
              size="small"
            >
              下载MD
            </Button>
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={() =>
                handleSingleDownload(content, `${title}.pdf`, "pdf")
              }
              size="small"
            >
              下载PDF
            </Button>
          </Space>
        }
        style={{ marginBottom: "24px" }}
      >
        <Collapse
          ghost
          items={[
            {
              key: "1",
              label: (
                <Space>
                  <span>点击展开查看详细内容</span>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    预览前 {Math.min(contentLength, 200)} 字符
                  </Text>
                </Space>
              ),
              children: (
                <div
                  style={{
                    maxHeight: "500px",
                    overflowY: "auto",
                    padding: "20px",
                    backgroundColor: "#fafafa",
                    borderRadius: "8px",
                    border: "1px solid #f0f0f0",
                    whiteSpace: "pre-wrap",
                    fontFamily: "'Source Code Pro', 'Consolas', monospace",
                    fontSize: "14px",
                    lineHeight: "1.8",
                    color: "#2c3e50",
                  }}
                >
                  {content}
                </div>
              ),
            },
          ]}
        />

        {/* 内容预览片段 */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#f9f9f9",
            borderRadius: "6px",
            borderLeft: "4px solid #1890ff",
          }}
        >
          <Text
            type="secondary"
            style={{ fontSize: "12px", display: "block", marginBottom: "8px" }}
          >
            内容预览:
          </Text>
          <div
            style={{
              fontSize: "13px",
              lineHeight: "1.6",
              color: "#666",
              whiteSpace: "pre-wrap",
            }}
          >
            {content.substring(0, 150)}
            {content.length > 150 && "..."}
          </div>
        </div>
      </Card>
    );
  };

  // 根据状态渲染内容卡片
  const renderContentCardWithStatus = (
    title,
    content,
    icon,
    type,
    status,
    shouldShow
  ) => {
    if (!shouldShow) return null;

    // 如果正在加载中
    if (status.loading) {
      return (
        <Card
          key={type}
          style={{
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          title={
            <Space>
              {icon}
              <span style={{ fontSize: "16px", fontWeight: "600" }}>
                {title}
              </span>
            </Space>
          }
        >
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: "16px", color: "#666" }}>
              AI正在生成{title}，请稍候...
            </Paragraph>
          </div>
        </Card>
      );
    }

    // 如果有错误
    if (status.error) {
      return (
        <Card
          key={type}
          style={{
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            borderColor: "#ff4d4f",
          }}
          title={
            <Space>
              {icon}
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#ff4d4f",
                }}
              >
                {title} (生成失败)
              </span>
            </Space>
          }
        >
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Text type="danger" style={{ fontSize: "14px" }}>
              ⚠️ 生成失败：{status.error}
            </Text>
          </div>
        </Card>
      );
    }

    // 如果已完成且有内容
    if (status.completed && content) {
      const contentLength = content.length;
      const wordCount = content.split(/\s+/).length;

      return (
        <Card
          key={type}
          title={
            <Space>
              {icon}
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#52c41a",
                }}
              >
                {title} ✅
              </span>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                ({contentLength} 字符, {wordCount} 词)
              </Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handlePreview(content, title)}
                size="small"
              >
                预览
              </Button>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopyContent(content, title)}
                size="small"
              >
                复制
              </Button>
              <Button
                type="text"
                icon={<FileMarkdownOutlined />}
                onClick={() =>
                  handleSingleDownload(content, `${title}.md`, "md")
                }
                size="small"
              >
                下载MD
              </Button>
              <Button
                type="text"
                icon={<FilePdfOutlined />}
                onClick={() =>
                  handleSingleDownload(content, `${title}.pdf`, "pdf")
                }
                size="small"
              >
                下载PDF
              </Button>
            </Space>
          }
          style={{
            marginBottom: "24px",
            borderColor: "#52c41a",
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <Collapse
            ghost
            items={[
              {
                key: "1",
                label: (
                  <Space>
                    <span>点击展开查看详细内容</span>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      预览前 {Math.min(contentLength, 200)} 字符
                    </Text>
                  </Space>
                ),
                children: (
                  <div
                    style={{
                      maxHeight: "500px",
                      overflowY: "auto",
                      padding: "20px",
                      backgroundColor: "#fafafa",
                      borderRadius: "8px",
                      border: "1px solid #f0f0f0",
                      whiteSpace: "pre-wrap",
                      fontFamily: "'Source Code Pro', 'Consolas', monospace",
                      fontSize: "14px",
                      lineHeight: "1.8",
                      color: "#2c3e50",
                    }}
                  >
                    {content}
                  </div>
                ),
              },
            ]}
          />

          {/* 内容预览片段 */}
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#f9f9f9",
              borderRadius: "6px",
              borderLeft: "4px solid #52c41a",
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: "12px",
                display: "block",
                marginBottom: "8px",
              }}
            >
              内容预览:
            </Text>
            <div
              style={{
                fontSize: "13px",
                lineHeight: "1.6",
                color: "#666",
                whiteSpace: "pre-wrap",
              }}
            >
              {content.substring(0, 150)}
              {content.length > 150 && "..."}
            </div>
          </div>
        </Card>
      );
    }

    // 如果未开始或等待中
    return (
      <Card
        key={type}
        style={{
          marginBottom: "24px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          backgroundColor: "#fafafa",
        }}
        title={
          <Space>
            {icon}
            <span
              style={{ fontSize: "16px", fontWeight: "600", color: "#999" }}
            >
              {title} (等待中)
            </span>
          </Space>
        }
      >
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Text type="secondary" style={{ fontSize: "14px" }}>
            🔄 等待简历文本解析完成后开始生成...
          </Text>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* 顶部导航 */}
      <div style={{ marginBottom: "24px" }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBackToSelector}
          style={{ marginBottom: "16px" }}
        >
          返回模式选择
        </Button>
      </div>

      <Title level={2} style={{ textAlign: "center", marginBottom: "32px" }}>
        智能简历分析系统
      </Title>

      {/* 生成内容配置 - 精简版 */}
      <Card style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            minHeight: "36px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
              fontSize: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <SettingOutlined style={{ color: "#1890ff" }} />
              <Typography.Text strong>生成内容：</Typography.Text>
            </div>

            <Checkbox
              checked={selectedOptions.generateText}
              disabled={true}
              style={{ fontSize: "14px" }}
            >
              📄 简历文本
            </Checkbox>

            <Checkbox
              checked={selectedOptions.generateSuggestions}
              onChange={(e) =>
                handleOptionChange("generateSuggestions", e.target.checked)
              }
              style={{ fontSize: "14px" }}
              disabled={currentStep > 1}
            >
              💡 优化建议
            </Checkbox>

            <Checkbox
              checked={selectedOptions.generateQuestions}
              onChange={(e) =>
                handleOptionChange("generateQuestions", e.target.checked)
              }
              style={{ fontSize: "14px" }}
              disabled={currentStep > 1}
            >
              ❓ 面试题库
            </Checkbox>
          </div>

          {currentStep > 1 && (
            <Typography.Text type="warning" style={{ fontSize: "12px" }}>
              🔒 配置已锁定
            </Typography.Text>
          )}
        </div>
      </Card>

      <Card style={{ marginBottom: "24px" }}>
        <Steps current={currentStep} style={{ marginBottom: "32px" }}>
          {getDynamicSteps().map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
            />
          ))}
        </Steps>

        {/* 步骤1：上传文件 */}
        {currentStep === 0 && (
          <div style={{ textAlign: "center" }}>
            <Dragger {...uploadProps} style={{ padding: "40px" }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: "48px", color: "#1890ff" }} />
              </p>
              <p className="ant-upload-text">点击或拖拽简历文件到这里上传</p>
              <p className="ant-upload-hint">
                支持 PDF、Word 文档和 TXT 文件，文件大小不超过 10MB
              </p>
            </Dragger>
          </div>
        )}

        {/* 步骤2：确认文件信息 */}
        {currentStep === 1 && fileInfo && (
          <div style={{ textAlign: "center" }}>
            <FileTextOutlined
              style={{
                fontSize: "48px",
                color: "#52c41a",
                marginBottom: "16px",
              }}
            />
            <Title level={4}>文件上传成功</Title>
            <Card
              style={{
                maxWidth: "400px",
                margin: "0 auto",
                marginBottom: "24px",
              }}
            >
              <Paragraph>
                <Text strong>文件名：</Text>
                {fileInfo.name}
                <br />
                <Text strong>文件大小：</Text>
                {formatFileSize(fileInfo.size)}
                <br />
                <Text strong>文件类型：</Text>
                {fileInfo.type || "未知"}
                <br />
                <Text strong>上传时间：</Text>
                {new Date().toLocaleString()}
                <br />
                <Text strong>文件状态：</Text>
                <Text type="success">✓ 验证通过</Text>
              </Paragraph>
            </Card>

            <Space size="large">
              <Button type="primary" size="large" onClick={handleStartProcess}>
                开始分析
              </Button>
              <Button onClick={handleRestart}>重新上传</Button>
            </Space>
          </div>
        )}

        {/* 步骤3：处理中 */}
        {currentStep === 2 && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <Title level={4} style={{ marginTop: "16px" }}>
              {processingStatus}
            </Title>
            <Paragraph type="secondary">
              AI正在分析您的简历，请耐心等待...
            </Paragraph>
          </div>
        )}

        {/* 步骤4及之后：实时结果展示 */}
        {currentStep >= 3 && (
          <div>
            {/* 顶部状态和下载按钮 */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Title level={3}>
                {!loading &&
                contentStatus.text.completed &&
                (!selectedOptions.generateSuggestions ||
                  contentStatus.suggestions.completed) &&
                (!selectedOptions.generateQuestions ||
                  contentStatus.questions.completed)
                  ? "🎉 分析完成！"
                  : "📊 分析进行中..."}
              </Title>
              <Paragraph type="secondary">
                {!loading &&
                contentStatus.text.completed &&
                (!selectedOptions.generateSuggestions ||
                  contentStatus.suggestions.completed) &&
                (!selectedOptions.generateQuestions ||
                  contentStatus.questions.completed)
                  ? "您的简历分析已完成，您可以查看结果并下载相关文件"
                  : "AI正在分析您的简历，已完成的内容会实时显示"}
              </Paragraph>

              {/* 只有在所有任务完成后才显示下载按钮 */}
              {!loading &&
                contentStatus.text.completed &&
                (!selectedOptions.generateSuggestions ||
                  contentStatus.suggestions.completed) &&
                (!selectedOptions.generateQuestions ||
                  contentStatus.questions.completed) && (
                  <Space size="large" style={{ marginTop: "16px" }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadAllFiles}
                    >
                      下载全部文件 (ZIP)
                    </Button>
                    <Button size="large" onClick={handleRestart}>
                      分析新的简历
                    </Button>
                  </Space>
                )}
            </div>

            <Divider />

            {/* 实时展示各个内容区域 */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* 简历文本区域 */}
              {renderContentCardWithStatus(
                "简历文本",
                resumeText,
                <FileTextOutlined />,
                "resume",
                contentStatus.text,
                true // 始终显示
              )}

              {/* 优化建议区域 */}
              {selectedOptions.generateSuggestions &&
                renderContentCardWithStatus(
                  "优化建议",
                  optimizedResume,
                  <BulbOutlined />,
                  "optimization",
                  contentStatus.suggestions,
                  contentStatus.text.completed // 只有在文本完成后才显示
                )}

              {/* 面试题区域 */}
              {selectedOptions.generateQuestions &&
                renderContentCardWithStatus(
                  "面试题及答案",
                  interviewQuestions,
                  <QuestionCircleOutlined />,
                  "questions",
                  contentStatus.questions,
                  contentStatus.text.completed // 只有在文本完成后才显示
                )}
            </div>
          </div>
        )}
      </Card>

      {/* Markdown预览弹窗 */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <div
          style={{
            maxHeight: "500px",
            overflowY: "auto",
            padding: "16px",
            backgroundColor: "#fafafa",
            borderRadius: "6px",
          }}
        >
          <ReactMarkdown>{previewContent}</ReactMarkdown>
        </div>
      </Modal>
    </div>
  );
};

export default WebMode;
