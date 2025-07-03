import React, { useState, useEffect } from "react";
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
  Select,
  Row,
  Col,
  Tooltip,
  Badge,
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
  RobotOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import {
  parseResume,
  generateOptimization,
  generateQuestions,
  getConfigurations,
  analyzeResumeIntelligently,
} from "../api";
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
const { Option } = Select;

const WebMode = ({ onBackToSelector }) => {
  const [loading, setLoading] = useState(false);

  const [fileInfo, setFileInfo] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [optimizedResume, setOptimizedResume] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState("");

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // 每个内容类型的独立状态
  const [contentStatus, setContentStatus] = useState({
    text: { loading: false, completed: false, error: null },
    optimization: { loading: false, completed: false, error: null },
    questions: { loading: false, completed: false, error: null },
  });

  // 配置相关状态
  const [configurations, setConfigurations] = useState({
    careers: {},
    levels: {},
  });
  const [selectedCareer, setSelectedCareer] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [isSmartMode, setIsSmartMode] = useState(true);
  const [intelligentAnalysis, setIntelligentAnalysis] = useState(null);

  // 生成内容控制
  const [generateOptions, setGenerateOptions] = useState({
    text: true, // 文本解析（必选）
    optimization: true, // 优化建议
    questions: true, // 面试题
  });

  // 组件挂载时获取配置
  useEffect(() => {
    loadConfigurations();
  }, []);

  // 加载配置数据
  const loadConfigurations = async () => {
    try {
      const response = await getConfigurations();
      if (response.success) {
        setConfigurations(response.data);
      }
    } catch (error) {
      console.error("加载配置失败:", error);
      message.error("加载配置失败");
    }
  };

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
        resetResults();
      }
    },
    onRemove: () => {
      setFileInfo(null);
      resetResults();
    },
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

      // 第1步：解析简历文本
      updateContentStatus("text", { loading: true, error: null });

      const parseResponse = await parseResume(fileInfo);

      if (parseResponse.success) {
        setResumeText(parseResponse.data.resumeText);
        updateContentStatus("text", { loading: false, completed: true });
        message.success("简历解析完成");

        // 如果启用智能模式，进行智能分析
        if (isSmartMode) {
          try {
            const analysisResponse = await analyzeResumeIntelligently(
              parseResponse.data.resumeText
            );
            if (analysisResponse.success) {
              setIntelligentAnalysis(analysisResponse.data);
              // 自动应用智能推荐
              setSelectedCareer(analysisResponse.data.career || "");
              setSelectedCategory(analysisResponse.data.category || "");
              setSelectedLevel(analysisResponse.data.level || "");
            }
          } catch (error) {
            console.warn("智能分析失败:", error);
          }
        }

        // 获取职业级别配置
        const options = {
          career: selectedCareer,
          level: selectedLevel,
          category: selectedCategory,
        };

        // 并行处理其他选中的内容
        const promises = [];

        if (generateOptions.optimization) {
          promises.push(
            handleGenerateOptimization(parseResponse.data.resumeText, options)
          );
        }

        if (generateOptions.questions) {
          promises.push(
            handleGenerateQuestions(parseResponse.data.resumeText, options)
          );
        }

        // 等待所有任务完成
        await Promise.all(promises);
        setLoading(false);
      } else {
        throw new Error(parseResponse.message || "简历解析失败");
      }
    } catch (error) {
      console.error("处理简历时发生错误:", error);
      message.error(error.message || "处理简历时发生错误");
      updateContentStatus("text", { loading: false, error: error.message });
      setLoading(false);
    }
  };

  // 生成优化建议
  const handleGenerateOptimization = async (text, options) => {
    try {
      updateContentStatus("optimization", { loading: true, error: null });

      const optimizeResponse = await generateOptimization(text, options);

      if (optimizeResponse.success) {
        setOptimizedResume(optimizeResponse.data.optimizedResume);
        updateContentStatus("optimization", {
          loading: false,
          completed: true,
        });
        message.success("优化建议生成完成");
      } else {
        const errorMsg = optimizeResponse.message || "优化建议生成失败";
        console.warn("优化建议生成失败:", errorMsg);
        updateContentStatus("optimization", {
          loading: false,
          error: errorMsg,
        });
      }
    } catch (error) {
      console.error("生成优化建议时发生错误:", error);
      updateContentStatus("optimization", {
        loading: false,
        error: error.message,
      });
    }
  };

  // 生成面试题
  const handleGenerateQuestions = async (text, options) => {
    try {
      updateContentStatus("questions", { loading: true, error: null });

      const questionsResponse = await generateQuestions(text, options);

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

  // 预览Markdown内容
  const handlePreview = (content, title) => {
    setPreviewContent(content);
    setPreviewTitle(title);
    setPreviewVisible(true);
  };

  // 下载单个文件
  const handleSingleDownload = async (content, filename, type) => {
    const hideLoading = message.loading(
      type === "pdf" ? "正在生成PDF文件..." : "正在下载文件...",
      0
    );

    try {
      if (type === "pdf") {
        await generatePDF(content, filename, filename.replace(".pdf", ""));
        hideLoading();
        message.success("PDF下载成功");
      } else if (type === "md") {
        await downloadMarkdown(content, filename);
        hideLoading();
        message.success("Markdown文件下载成功");
      }
    } catch (error) {
      hideLoading();
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
    const hideLoading = message.loading("正在生成文件包，包含PDF文件...", 0);

    try {
      const data = {
        fileInfo,
        resumeText,
        optimizedResume,
        interviewQuestions,
      };

      await downloadAllFiles(data);
      hideLoading();
      message.success("文件打包下载成功，包含PDF、Markdown、TXT等格式");
    } catch (error) {
      hideLoading();
      console.error("打包下载时发生错误:", error);
      message.error(error.message || "打包下载失败");
    }
  };

  // 重新开始
  const resetResults = () => {
    setResumeText("");
    setOptimizedResume("");
    setInterviewQuestions("");
    setIntelligentAnalysis(null);
    setContentStatus({
      text: { loading: false, completed: false, error: null },
      optimization: { loading: false, completed: false, error: null },
      questions: { loading: false, completed: false, error: null },
    });
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

  // 获取当前选择的职业分类
  const getCurrentCategories = () => {
    if (!selectedCareer || !configurations.careers[selectedCareer]) {
      return [];
    }
    return configurations.careers[selectedCareer].categories || [];
  };

  // 渲染左侧配置面板
  const renderLeftPanel = () => (
    <Card
      title={
        <Space>
          <SettingOutlined style={{ color: "#1890ff" }} />
          <span
            style={{ fontSize: "16px", fontWeight: "600", color: "#1890ff" }}
          >
            分析配置
          </span>
        </Space>
      }
      style={{
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        backgroundColor: "#ffffff",
        border: "1px solid #e6f7ff",
      }}
      bodyStyle={{ padding: "20px" }}
    >
      {/* 文件上传区域 */}
      <div style={{ marginBottom: 28 }}>
        <Title
          level={5}
          style={{
            color: "#1890ff",
            fontWeight: "600",
            marginBottom: 16,
            fontSize: "15px",
          }}
        >
          📁 1. 上传简历文件
        </Title>
        <Dragger
          {...uploadProps}
          style={{
            marginBottom: 16,
            borderRadius: "8px",
            border: "2px dashed #1890ff",
            backgroundColor: "#f6ffed",
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#1890ff", fontSize: "48px" }} />
          </p>
          <p
            className="ant-upload-text"
            style={{ color: "#1890ff", fontWeight: "600" }}
          >
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint" style={{ color: "#52c41a" }}>
            支持 PDF、Word、TXT 格式，文件大小不超过10MB
          </p>
        </Dragger>

        {fileInfo && (
          <Alert
            message={`已选择文件: ${fileInfo.name}`}
            description={`文件大小: ${formatFileSize(fileInfo.size)}`}
            type="success"
            showIcon
            style={{ borderRadius: "8px" }}
          />
        )}
      </div>

      {/* 智能分析开关 */}
      <div style={{ marginBottom: 28 }}>
        <Title
          level={5}
          style={{
            color: "#1890ff",
            fontWeight: "600",
            marginBottom: 16,
            fontSize: "15px",
          }}
        >
          🤖 2. 分析模式
        </Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button
            type={isSmartMode ? "primary" : "default"}
            icon={<RobotOutlined />}
            onClick={() => setIsSmartMode(true)}
            block
            size="large"
            style={{
              height: "50px",
              borderRadius: "8px",
              fontWeight: "600",
              backgroundColor: isSmartMode ? "#1890ff" : "#f8f9fa",
              borderColor: isSmartMode ? "#1890ff" : "#d9d9d9",
              color: isSmartMode ? "#ffffff" : "#595959",
            }}
          >
            智能模式（AI推荐）
          </Button>
          <Button
            type={!isSmartMode ? "primary" : "default"}
            icon={<SettingOutlined />}
            onClick={() => setIsSmartMode(false)}
            block
            size="large"
            style={{
              height: "50px",
              borderRadius: "8px",
              fontWeight: "600",
              backgroundColor: !isSmartMode ? "#1890ff" : "#f8f9fa",
              borderColor: !isSmartMode ? "#1890ff" : "#d9d9d9",
              color: !isSmartMode ? "#ffffff" : "#595959",
            }}
          >
            手动配置
          </Button>
        </Space>

        {intelligentAnalysis && isSmartMode && (
          <Alert
            style={{
              marginTop: 16,
              borderRadius: "8px",
              backgroundColor: "#f6ffed",
              border: "1px solid #b7eb8f",
            }}
            message={
              <span style={{ color: "#52c41a", fontWeight: "600" }}>
                🎯 智能分析结果
              </span>
            }
            description={
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: "4px 0", color: "#434343" }}>
                  <strong>推荐职业:</strong>{" "}
                  {configurations.careers[intelligentAnalysis.career]?.name}
                </p>
                <p style={{ margin: "4px 0", color: "#434343" }}>
                  <strong>推荐级别:</strong>{" "}
                  {configurations.levels[intelligentAnalysis.level]?.name}
                </p>
                <p style={{ margin: "4px 0", color: "#434343" }}>
                  <strong>置信度:</strong>{" "}
                  {Math.round(intelligentAnalysis.confidence * 100)}%
                </p>
              </div>
            }
            type="success"
            showIcon
          />
        )}
      </div>

      {/* 职业和级别选择 */}
      {!isSmartMode && (
        <div style={{ marginBottom: 28 }}>
          <Title
            level={5}
            style={{
              color: "#1890ff",
              fontWeight: "600",
              marginBottom: 16,
              fontSize: "15px",
            }}
          >
            🎯 3. 职业配置
          </Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            <div>
              <Text strong style={{ color: "#434343", fontSize: "14px" }}>
                职业类型:
              </Text>
              <Select
                style={{
                  width: "100%",
                  marginTop: 8,
                }}
                size="large"
                placeholder="选择职业类型"
                value={selectedCareer}
                onChange={(value) => {
                  setSelectedCareer(value);
                  setSelectedCategory(""); // 重置分类
                }}
              >
                {Object.entries(configurations.careers).map(([key, career]) => (
                  <Option key={key} value={key}>
                    {career.name} - {career.description}
                  </Option>
                ))}
              </Select>
            </div>

            {selectedCareer && (
              <div>
                <Text strong style={{ color: "#434343", fontSize: "14px" }}>
                  具体分类:
                </Text>
                <Select
                  style={{
                    width: "100%",
                    marginTop: 8,
                  }}
                  size="large"
                  placeholder="选择具体分类"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                >
                  {getCurrentCategories().map((category) => (
                    <Option key={category.key} value={category.key}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Text strong style={{ color: "#434343", fontSize: "14px" }}>
                经验级别:
              </Text>
              <Select
                style={{
                  width: "100%",
                  marginTop: 8,
                }}
                size="large"
                placeholder="选择经验级别"
                value={selectedLevel}
                onChange={setSelectedLevel}
              >
                {Object.entries(configurations.levels).map(([key, level]) => (
                  <Option key={key} value={key}>
                    {level.name} - {level.description}
                  </Option>
                ))}
              </Select>
            </div>
          </Space>
        </div>
      )}

      {/* 生成内容选择 */}
      <div style={{ marginBottom: 32 }}>
        <Title
          level={5}
          style={{
            color: "#1890ff",
            fontWeight: "600",
            marginBottom: 16,
            fontSize: "15px",
          }}
        >
          📝 4. 生成内容
        </Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f6ffed",
              borderRadius: "8px",
              border: "1px solid #b7eb8f",
            }}
          >
            <input
              type="checkbox"
              checked={generateOptions.text}
              disabled={true}
              style={{ marginRight: 12, transform: "scale(1.2)" }}
            />
            <Text style={{ color: "#52c41a", fontWeight: "600" }}>
              简历文本解析 (必选)
            </Text>
          </div>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#f0f8ff",
              borderRadius: "8px",
              border: "1px solid #91d5ff",
            }}
          >
            <input
              type="checkbox"
              checked={generateOptions.optimization}
              onChange={(e) =>
                setGenerateOptions((prev) => ({
                  ...prev,
                  optimization: e.target.checked,
                }))
              }
              style={{ marginRight: 12, transform: "scale(1.2)" }}
            />
            <Text style={{ color: "#1890ff", fontWeight: "500" }}>
              优化建议
            </Text>
          </div>
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fff7e6",
              borderRadius: "8px",
              border: "1px solid #ffd591",
            }}
          >
            <input
              type="checkbox"
              checked={generateOptions.questions}
              onChange={(e) =>
                setGenerateOptions((prev) => ({
                  ...prev,
                  questions: e.target.checked,
                }))
              }
              style={{ marginRight: 12, transform: "scale(1.2)" }}
            />
            <Text style={{ color: "#fa8c16", fontWeight: "500" }}>
              面试题生成
            </Text>
          </div>
        </Space>
      </div>

      {/* 开始分析按钮 */}
      <Button
        type="primary"
        icon={<RobotOutlined />}
        loading={loading}
        onClick={handleStartProcess}
        disabled={!fileInfo}
        block
        size="large"
        style={{
          height: "60px",
          fontSize: "18px",
          fontWeight: "700",
          borderRadius: "12px",
          backgroundColor: fileInfo ? "#1890ff" : "#d9d9d9",
          borderColor: fileInfo ? "#1890ff" : "#d9d9d9",
          boxShadow: fileInfo ? "0 4px 12px rgba(24, 144, 255, 0.3)" : "none",
          transform: loading ? "scale(0.98)" : "scale(1)",
          transition: "all 0.3s ease",
        }}
      >
        {loading ? "🚀 AI分析中..." : "🎯 开始智能分析"}
      </Button>
    </Card>
  );

  // 渲染右侧内容面板
  const renderRightPanel = () => (
    <div style={{ width: "100%" }}>
      {/* 简历文本解析 */}
      {renderContentCardWithStatus(
        "简历文本",
        resumeText,
        <FileTextOutlined />,
        "text",
        contentStatus.text,
        true
      )}

      {/* 优化建议 */}
      {renderContentCardWithStatus(
        "优化建议",
        optimizedResume,
        <BulbOutlined />,
        "optimization",
        contentStatus.optimization,
        generateOptions.optimization
      )}

      {/* 面试题 */}
      {renderContentCardWithStatus(
        "面试题及答案",
        interviewQuestions,
        <QuestionCircleOutlined />,
        "questions",
        contentStatus.questions,
        generateOptions.questions
      )}

      {/* 批量下载 */}
      {(resumeText || optimizedResume || interviewQuestions) && (
        <Card
          style={{
            marginBottom: "24px",
            backgroundColor: "#f8f9fa",
            borderColor: "#52c41a",
          }}
        >
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Title level={4} style={{ marginBottom: 16, color: "#52c41a" }}>
              📥 下载中心
            </Title>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadAllFiles}
              size="large"
              style={{
                height: "50px",
                fontSize: "16px",
                fontWeight: "600",
                borderRadius: "8px",
                backgroundColor: "#52c41a",
                borderColor: "#52c41a",
              }}
            >
              下载全部文件 (ZIP包)
            </Button>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: "13px" }}>
                包含所有生成的内容，支持多种格式 (PDF、Markdown、TXT)
              </Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  // 渲染状态图标
  const renderStatusIcon = (status) => {
    if (!status) {
      return <span style={{ color: "#d9d9d9" }}>等待中</span>;
    }
    if (status.loading) {
      return <Spin indicator={<LoadingOutlined />} />;
    } else if (status.completed) {
      return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
    } else if (status.error) {
      return <ExclamationCircleOutlined style={{ color: "#f5222d" }} />;
    } else {
      return <span style={{ color: "#d9d9d9" }}>等待中</span>;
    }
  };

  // 渲染内容操作按钮
  const renderContentActions = (content, title) => (
    <Space>
      <Tooltip title="预览">
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handlePreview(content, title)}
        />
      </Tooltip>
      <Tooltip title="复制">
        <Button
          type="text"
          icon={<CopyOutlined />}
          onClick={() => handleCopyContent(content, title)}
        />
      </Tooltip>
      <Tooltip title="下载 Markdown">
        <Button
          type="text"
          icon={<FileMarkdownOutlined />}
          onClick={() => handleSingleDownload(content, `${title}.md`, "md")}
        />
      </Tooltip>
      <Tooltip title="下载 PDF">
        <Button
          type="text"
          icon={<FilePdfOutlined />}
          onClick={() => handleSingleDownload(content, `${title}.pdf`, "pdf")}
        />
      </Tooltip>
    </Space>
  );

  return (
    <div
      style={{
        padding: 24,
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title
            level={1}
            style={{
              color: "#ffffff",
              marginBottom: 8,
              fontSize: "42px",
              fontWeight: "700",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            🚀 智能简历分析系统
          </Title>
          <Text
            style={{
              color: "#ffffff",
              fontSize: "18px",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            AI驱动的专业简历分析与优化平台
          </Text>
        </div>

        {/* 返回按钮在标题下边 */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBackToSelector}
            style={{
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            ← 返回模式选择
          </Button>
        </div>

        <Row gutter={32}>
          {/* 左侧配置面板 */}
          <Col xs={24} lg={8}>
            {renderLeftPanel()}
          </Col>

          {/* 右侧内容面板 */}
          <Col xs={24} lg={16}>
            {renderRightPanel()}
          </Col>
        </Row>
      </div>

      {/* 预览Modal */}
      <Modal
        title={`预览 - ${previewTitle}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 600, overflow: "auto" }}>
          <ReactMarkdown>{previewContent}</ReactMarkdown>
        </div>
      </Modal>
    </div>
  );
};

export default WebMode;
