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
} from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { parseResume, generateOptimization, generateQuestions } from "../api";

const { Step } = Steps;
const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

const WebMode = ({ onBackToSelector }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [optimizedResume, setOptimizedResume] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");

  // 文件上传配置
  const uploadProps = {
    name: "file",
    multiple: false,
    accept: ".pdf,.doc,.docx,.txt",
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info) => {
      const { file } = info;
      if (file.status !== "uploading") {
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

  // 开始处理简历
  const handleStartProcess = async () => {
    if (!fileInfo) {
      message.error("请先上传简历文件");
      return;
    }

    try {
      setLoading(true);
      setCurrentStep(2);

      // 步骤1：解析简历文本
      setProcessingStatus("正在解析简历文本...");
      const parseResponse = await parseResume(fileInfo);

      if (parseResponse.success) {
        setResumeText(parseResponse.data.resumeText);
        setCurrentStep(3);
        message.success("简历解析完成");
      } else {
        throw new Error(parseResponse.message || "简历解析失败");
      }

      // 步骤2：生成优化建议
      setProcessingStatus("正在生成优化建议...");
      const optimizeResponse = await generateOptimization(
        parseResponse.data.resumeText
      );

      if (optimizeResponse.success) {
        setOptimizedResume(optimizeResponse.data.optimizedResume);
        message.success("优化建议生成完成");
      } else {
        console.warn("优化建议生成失败:", optimizeResponse.message);
      }

      // 步骤3：生成面试题
      setProcessingStatus("正在生成面试题...");
      const questionsResponse = await generateQuestions(
        parseResponse.data.resumeText
      );

      if (questionsResponse.success) {
        setInterviewQuestions(questionsResponse.data.interviewQuestions);
        setCurrentStep(4);
        message.success("面试题生成完成");
      } else {
        console.warn("面试题生成失败:", questionsResponse.message);
      }
    } catch (error) {
      console.error("处理简历时发生错误:", error);
      message.error(error.message || "处理简历时发生错误");
    } finally {
      setLoading(false);
      setProcessingStatus("");
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

      <Card style={{ marginBottom: "24px" }}>
        <Steps current={currentStep} style={{ marginBottom: "32px" }}>
          <Step title="上传简历" description="支持PDF、Word、TXT格式" />
          <Step title="确认信息" description="检查上传的文件信息" />
          <Step title="解析处理" description="AI解析简历内容" />
          <Step title="文本展示" description="显示解析的简历文本" />
          <Step title="生成结果" description="面试题和优化建议" />
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
            <Paragraph>
              <Text strong>文件名：</Text>
              {fileInfo.name}
              <br />
              <Text strong>文件大小：</Text>
              {(fileInfo.size / 1024 / 1024).toFixed(2)} MB
              <br />
              <Text strong>文件类型：</Text>
              {fileInfo.type}
            </Paragraph>
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
        {currentStep >= 3 && resumeText && (
          <div>
            <Title level={3}>
              <FileTextOutlined /> 简历文本
            </Title>
            <Card style={{ marginBottom: "24px" }}>
              <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                {resumeText}
              </Paragraph>
            </Card>
          </div>
        )}

        {/* 步骤5：显示处理结果 */}
        {currentStep >= 4 && (
          <div>
            {/* 优化建议 */}
            {optimizedResume && (
              <div style={{ marginBottom: "24px" }}>
                <Title level={3}>
                  <QuestionCircleOutlined /> 简历优化建议
                </Title>
                <Card>
                  <Paragraph
                    style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}
                  >
                    {optimizedResume}
                  </Paragraph>
                </Card>
              </div>
            )}

            {/* 面试题 */}
            {interviewQuestions && (
              <div style={{ marginBottom: "24px" }}>
                <Title level={3}>
                  <QuestionCircleOutlined /> 面试题及答案
                </Title>
                <Card>
                  <Paragraph
                    style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}
                  >
                    {interviewQuestions}
                  </Paragraph>
                </Card>
              </div>
            )}

            <Divider />
            <div style={{ textAlign: "center" }}>
              <Button type="primary" size="large" onClick={handleRestart}>
                分析新的简历
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WebMode;
