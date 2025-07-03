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
      const parseResponse = await parseResume(fileInfo);

      if (parseResponse.success) {
        setResumeText(parseResponse.data.resumeText);
        setCurrentStep(3);
        message.success("简历解析完成");

        // 根据用户选择决定下一步
        if (selectedOptions.generateSuggestions) {
          setTimeout(() => {
            handleGenerateOptimization(parseResponse.data.resumeText);
          }, 2000);
        } else if (selectedOptions.generateQuestions) {
          // 如果不生成建议但要生成面试题，直接跳转到面试题生成
          setTimeout(() => {
            handleGenerateQuestions(parseResponse.data.resumeText);
          }, 2000);
        } else {
          // 如果只选择了文本生成，直接跳转到完成页面
          setTimeout(() => {
            setCurrentStep(getCompletedStep());
            setLoading(false);
            setProcessingStatus("");
          }, 2000);
        }
      } else {
        throw new Error(parseResponse.message || "简历解析失败");
      }
    } catch (error) {
      console.error("处理简历时发生错误:", error);
      message.error(error.message || "处理简历时发生错误");
      setLoading(false);
      setProcessingStatus("");
    }
  };

  // 生成优化建议
  const handleGenerateOptimization = async (text) => {
    try {
      setCurrentStep(4);
      setProcessingStatus("正在生成优化建议...");

      const optimizeResponse = await generateOptimization(text);

      if (optimizeResponse.success) {
        setOptimizedResume(optimizeResponse.data.optimizedResume);
        message.success("优化建议生成完成");

        // 根据用户选择决定下一步
        if (selectedOptions.generateQuestions) {
          setTimeout(() => {
            handleGenerateQuestions(text);
          }, 2000);
        } else {
          // 如果不生成面试题，直接跳转到完成页面
          setTimeout(() => {
            setCurrentStep(getCompletedStep());
            setLoading(false);
            setProcessingStatus("");
          }, 2000);
        }
      } else {
        console.warn("优化建议生成失败:", optimizeResponse.message);
        // 即使优化失败，如果用户选择了面试题，继续生成
        if (selectedOptions.generateQuestions) {
          setTimeout(() => {
            handleGenerateQuestions(text);
          }, 1000);
        } else {
          setTimeout(() => {
            setCurrentStep(getCompletedStep());
            setLoading(false);
            setProcessingStatus("");
          }, 1000);
        }
      }
    } catch (error) {
      console.error("生成优化建议时发生错误:", error);
      // 即使优化失败，如果用户选择了面试题，继续生成
      if (selectedOptions.generateQuestions) {
        setTimeout(() => {
          handleGenerateQuestions(text);
        }, 1000);
      } else {
        setTimeout(() => {
          setCurrentStep(getCompletedStep());
          setLoading(false);
          setProcessingStatus("");
        }, 1000);
      }
    }
  };

  // 生成面试题
  const handleGenerateQuestions = async (text) => {
    try {
      setCurrentStep(selectedOptions.generateSuggestions ? 5 : 4);
      setProcessingStatus("正在生成面试题...");

      const questionsResponse = await generateQuestions(text);

      if (questionsResponse.success) {
        setInterviewQuestions(questionsResponse.data.interviewQuestions);
        setCurrentStep(getCompletedStep());
        message.success("面试题生成完成");
      } else {
        console.warn("面试题生成失败:", questionsResponse.message);
        setCurrentStep(getCompletedStep());
      }
    } catch (error) {
      console.error("生成面试题时发生错误:", error);
      setCurrentStep(getCompletedStep());
    } finally {
      setLoading(false);
      setProcessingStatus("");
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

      {/* 生成内容配置 - 前置到顶部 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>生成内容配置</span>
          </Space>
        }
        style={{ marginBottom: "24px" }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Alert
            message="请选择您希望生成的内容类型"
            description="简历文本解析是必需的，优化建议和面试题可根据需要选择"
            type="info"
            showIcon
            style={{ marginBottom: "16px" }}
          />

          <div>
            <Checkbox
              checked={selectedOptions.generateText}
              disabled={true}
              style={{ fontSize: "16px" }}
            >
              <span style={{ fontWeight: "500" }}>📄 生成简历文本</span>
            </Checkbox>
            <div style={{ marginLeft: "24px", marginTop: "4px" }}>
              <Typography.Text type="secondary" style={{ fontSize: "14px" }}>
                提取并结构化简历内容（必选项）
              </Typography.Text>
            </div>
          </div>

          <div>
            <Checkbox
              checked={selectedOptions.generateSuggestions}
              onChange={(e) =>
                handleOptionChange("generateSuggestions", e.target.checked)
              }
              style={{ fontSize: "16px" }}
              disabled={currentStep > 1} // 开始处理后禁用修改
            >
              <span style={{ fontWeight: "500" }}>💡 生成优化建议</span>
            </Checkbox>
            <div style={{ marginLeft: "24px", marginTop: "4px" }}>
              <Typography.Text type="secondary" style={{ fontSize: "14px" }}>
                AI分析简历并提供个性化的改进建议
              </Typography.Text>
            </div>
          </div>

          <div>
            <Checkbox
              checked={selectedOptions.generateQuestions}
              onChange={(e) =>
                handleOptionChange("generateQuestions", e.target.checked)
              }
              style={{ fontSize: "16px" }}
              disabled={currentStep > 1} // 开始处理后禁用修改
            >
              <span style={{ fontWeight: "500" }}>❓ 生成面试题库</span>
            </Checkbox>
            <div style={{ marginLeft: "24px", marginTop: "4px" }}>
              <Typography.Text type="secondary" style={{ fontSize: "14px" }}>
                根据简历内容生成相关的面试题和参考答案
              </Typography.Text>
            </div>
          </div>

          {/* 选择总结 */}
          <div
            style={{
              backgroundColor: "#f6f8fa",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #e1e5e9",
              marginTop: "16px",
            }}
          >
            <Typography.Text
              strong
              style={{ fontSize: "14px", color: "#1890ff" }}
            >
              当前选择：
            </Typography.Text>
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span
                style={{
                  backgroundColor: "#e6f7ff",
                  color: "#1890ff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  border: "1px solid #91d5ff",
                }}
              >
                📄 简历文本
              </span>
              {selectedOptions.generateSuggestions && (
                <span
                  style={{
                    backgroundColor: "#fff7e6",
                    color: "#fa8c16",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "1px solid #ffd591",
                  }}
                >
                  💡 优化建议
                </span>
              )}
              {selectedOptions.generateQuestions && (
                <span
                  style={{
                    backgroundColor: "#f6f0ff",
                    color: "#722ed1",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "1px solid #d3adf7",
                  }}
                >
                  ❓ 面试题库
                </span>
              )}
            </div>
          </div>

          {currentStep > 1 && (
            <Alert
              message="配置已锁定"
              description="处理过程中无法修改生成内容配置，如需更改请重新开始"
              type="warning"
              showIcon
              style={{ marginTop: "16px" }}
            />
          )}
        </Space>
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

        {/* 步骤4：显示简历文本 */}
        {currentStep === 3 && resumeText && (
          <div style={{ textAlign: "center" }}>
            <Title level={3}>
              <FileTextOutlined /> 简历文本解析完成
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: "24px" }}>
              {selectedOptions.generateSuggestions ||
              selectedOptions.generateQuestions
                ? `系统已成功提取您的简历文本内容，正在准备${
                    selectedOptions.generateSuggestions
                      ? "生成优化建议"
                      : "生成面试题"
                  }...`
                : "系统已成功提取您的简历文本内容，分析已完成！"}
            </Paragraph>
            {renderContentCard(
              "简历文本",
              resumeText,
              <FileTextOutlined />,
              "resume"
            )}
            {(selectedOptions.generateSuggestions ||
              selectedOptions.generateQuestions) && (
              <>
                <Spin size="large" />
                <Paragraph style={{ marginTop: "16px" }}>
                  正在准备
                  {selectedOptions.generateSuggestions
                    ? "生成优化建议"
                    : "生成面试题"}
                  ...
                </Paragraph>
              </>
            )}
          </div>
        )}

        {/* 步骤5：生成优化建议中 */}
        {selectedOptions.generateSuggestions && currentStep === 4 && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <BulbOutlined
              style={{
                fontSize: "48px",
                color: "#faad14",
                marginBottom: "16px",
              }}
            />
            <Title level={4}>正在生成优化建议</Title>
            <Spin size="large" />
            <Paragraph style={{ marginTop: "16px" }}>
              AI正在分析您的简历并生成个性化优化建议...
            </Paragraph>
          </div>
        )}

        {/* 步骤6：生成面试题中 */}
        {selectedOptions.generateQuestions &&
          ((selectedOptions.generateSuggestions && currentStep === 5) ||
            (!selectedOptions.generateSuggestions && currentStep === 4)) && (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <QuestionCircleOutlined
                style={{
                  fontSize: "48px",
                  color: "#722ed1",
                  marginBottom: "16px",
                }}
              />
              <Title level={4}>正在生成面试题</Title>
              <Spin size="large" />
              <Paragraph style={{ marginTop: "16px" }}>
                AI正在根据您的简历生成相关面试题和答案...
              </Paragraph>
            </div>
          )}

        {/* 完成步骤：根据动态配置显示 */}
        {currentStep === getCompletedStep() && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Title level={3}>🎉 分析完成！</Title>
              <Paragraph type="secondary">
                您的简历分析已完成，您可以查看结果并下载相关文件
              </Paragraph>
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
            </div>

            <Divider />

            {/* 显示分析结果 */}
            {renderContentCard(
              "简历文本",
              resumeText,
              <FileTextOutlined />,
              "resume"
            )}
            {selectedOptions.generateSuggestions &&
              renderContentCard(
                "优化建议",
                optimizedResume,
                <BulbOutlined />,
                "optimization"
              )}
            {selectedOptions.generateQuestions &&
              renderContentCard(
                "面试题及答案",
                interviewQuestions,
                <QuestionCircleOutlined />,
                "questions"
              )}
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
