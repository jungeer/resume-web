import React, { useState, useEffect } from "react";
import {
  Select,
  Button,
  message,
  Spin,
  Card,
  Typography,
  Space,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { parseResume, generateOptimization, generateQuestions } from "../api";

// 飞书侧边栏SDK
import { bitable } from "@lark-base-open/js-sdk";

const { Title, Paragraph } = Typography;

const FeishuMode = ({ onBackToSelector }) => {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [status, setStatus] = useState(null); // null, 'processing', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState("");

  // 初始化获取表格数据
  useEffect(() => {
    fetchCandidates();
  }, []);

  // 使用飞书Base JS SDK，不需要获取访问令牌
  // 飞书侧边栏应用可以直接使用SDK进行交互，无需appid和appsecret

  // 获取表格中的候选人列表
  const fetchCandidates = async () => {
    try {
      setLoading(true);

      // 获取当前活动的表格
      const table = await bitable.base.getActiveTable();
      if (!table) {
        message.error("请先选择一个表格");
        setLoading(false);
        return;
      }

      // 获取表头信息，找到姓名列
      const fields = await table.getFieldMetaList();
      const nameField = fields.find((field) => field.name === "姓名");

      if (!nameField) {
        message.error("未找到姓名列，请确保表格中有名为「姓名」的列");
        setLoading(false);
        return;
      }

      // 获取所有记录
      const records = await table.getRecordList();
      const candidateList = [];

      for (const record of records) {
        const recordId = record.id;
        const nameCell = await table.getCellValue(nameField.id, recordId);

        if (nameCell) {
          // 正确处理飞书单元格值，确保获取文本内容
          let nameText = "";
          if (typeof nameCell === "string") {
            // 如果是字符串，直接使用
            nameText = nameCell;
          } else if (nameCell && typeof nameCell === "object") {
            // 如果是对象，尝试获取text属性
            if (nameCell.text) {
              nameText = nameCell.text;
            } else if (nameCell.value) {
              // 有些字段可能使用value属性
              nameText = nameCell.value;
            } else if (Array.isArray(nameCell)) {
              // 如果是数组，尝试获取第一个元素
              nameText =
                nameCell[0]?.text ||
                nameCell[0]?.value ||
                JSON.stringify(nameCell);
            } else {
              // 其他情况，尝试转换为字符串
              nameText = JSON.stringify(nameCell);
            }
          }

          candidateList.push({
            recordId,
            name: nameText,
          });
        }
      }

      setCandidates(candidateList);
      setLoading(false);
    } catch (error) {
      console.error("获取候选人列表失败:", error);
      message.error("获取候选人列表失败");
      setLoading(false);
    }
  };

  // 处理简历优化
  const handleResumeOptimization = async () => {
    if (!selectedCandidate) {
      message.warning("请先选择一个候选人");
      return;
    }

    try {
      setLoading(true);
      setStatus("processing");
      setStatusMessage("正在处理简历，请稍候...");

      // 获取当前活动的表格
      const table = await bitable.base.getActiveTable();

      // 获取表头信息
      const fields = await table.getFieldMetaList();
      const resumeField = fields.find((field) => field.name === "个人简历");
      const resumeTextField = fields.find((field) => field.name === "简历文本");
      const optimizedResumeField = fields.find(
        (field) => field.name === "简历优化"
      );
      const interviewQuestionsField = fields.find(
        (field) => field.name === "面试题及答案"
      );
      const statusField = fields.find((field) => field.name === "状态");

      if (
        !resumeField ||
        !resumeTextField ||
        !optimizedResumeField ||
        !interviewQuestionsField ||
        !statusField
      ) {
        throw new Error(
          "表格缺少必要的列，请确保表格中有「个人简历」、「简历文本」、「简历优化」、「面试题及答案」和「状态」列"
        );
      }

      // 获取简历文件信息
      const resumeCell = await table.getCellValue(
        resumeField.id,
        selectedCandidate.recordId
      );

      if (!resumeCell || !resumeCell.length) {
        throw new Error("未找到简历文件，请确保已上传简历");
      }

      // 更新状态为处理中
      await table.setCellValue(
        statusField.id,
        selectedCandidate.recordId,
        "处理中"
      );

      try {
        // 获取文件URL并下载文件
        const fileUrl = await table.getAttachmentUrl(resumeCell[0].token);
        const fileResponse = await fetch(fileUrl);
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], resumeCell[0].name);

        // 1. 解析简历文本
        setStatusMessage("正在解析简历文本...");
        const parseResponse = await parseResume(file);
        const resumeText = parseResponse.data.resumeText;

        // 更新简历文本
        await table.setCellValue(
          resumeTextField.id,
          selectedCandidate.recordId,
          resumeText
        );

        // 2. 生成优化建议
        setStatusMessage("正在生成优化建议...");
        const optimizeResponse = await generateOptimization(resumeText);
        const optimizedResume = optimizeResponse.data.optimizedResume;

        // 更新优化建议
        await table.setCellValue(
          optimizedResumeField.id,
          selectedCandidate.recordId,
          optimizedResume
        );

        // 3. 生成面试题
        setStatusMessage("正在生成面试题...");
        const questionsResponse = await generateQuestions(resumeText);
        const interviewQuestions = questionsResponse.data.interviewQuestions;

        // 更新面试题
        await table.setCellValue(
          interviewQuestionsField.id,
          selectedCandidate.recordId,
          interviewQuestions
        );

        // 更新状态为已完成
        await table.setCellValue(
          statusField.id,
          selectedCandidate.recordId,
          "已完成"
        );

        setStatus("success");
        setStatusMessage("简历分析完成！");
        message.success("简历分析完成！");
      } catch (error) {
        console.error("处理简历时发生错误:", error);

        // 更新状态为错误
        await table.setCellValue(
          statusField.id,
          selectedCandidate.recordId,
          "处理失败"
        );

        setStatus("error");
        setStatusMessage(error.message || "处理失败");
        message.error(error.message || "处理失败");
      }
    } catch (error) {
      console.error("处理简历时发生错误:", error);
      setStatus("error");
      setStatusMessage(error.message || "处理失败");
      message.error(error.message || "处理失败");
    } finally {
      setLoading(false);
    }
  };

  // 渲染状态指示器
  const renderStatus = () => {
    if (status === "processing") {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: "16px", color: "#1890ff" }}>
            {statusMessage}
          </Paragraph>
        </div>
      );
    } else if (status === "success") {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div
            style={{ fontSize: "48px", color: "#52c41a", marginBottom: "16px" }}
          >
            ✓
          </div>
          <Title level={4} style={{ color: "#52c41a" }}>
            {statusMessage}
          </Title>
          <Paragraph type="secondary">
            简历文本、优化建议和面试题已更新到表格中
          </Paragraph>
        </div>
      );
    } else if (status === "error") {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div
            style={{ fontSize: "48px", color: "#ff4d4f", marginBottom: "16px" }}
          >
            ✗
          </div>
          <Title level={4} style={{ color: "#ff4d4f" }}>
            处理失败
          </Title>
          <Paragraph type="danger">{statusMessage}</Paragraph>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
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
        <Title level={2} style={{ textAlign: "center", marginBottom: "8px" }}>
          飞书插件模式
        </Title>
        <Paragraph type="secondary" style={{ textAlign: "center" }}>
          集成飞书多维表格，批量处理简历数据
        </Paragraph>
      </div>

      <Card>
        <Title level={3} style={{ marginBottom: "24px" }}>
          <UserOutlined /> 选择候选人
        </Title>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: "16px" }}>
              正在加载候选人数据...
            </Paragraph>
          </div>
        ) : (
          <div>
            <Select
              placeholder="选择要处理的候选人"
              style={{ width: "100%", marginBottom: "24px" }}
              value={selectedCandidate?.recordId}
              onChange={(value) => {
                const candidate = candidates.find((c) => c.recordId === value);
                setSelectedCandidate(candidate);
                setStatus(null);
              }}
              size="large"
            >
              {candidates.map((candidate) => (
                <Select.Option
                  key={candidate.recordId}
                  value={candidate.recordId}
                >
                  {candidate.name}
                </Select.Option>
              ))}
            </Select>

            {selectedCandidate && (
              <div style={{ marginBottom: "24px" }}>
                <Paragraph>
                  <strong>已选择：</strong>
                  {selectedCandidate.name}
                </Paragraph>
              </div>
            )}

            <Space size="middle" style={{ width: "100%" }}>
              <Button
                type="primary"
                onClick={handleResumeOptimization}
                disabled={!selectedCandidate || loading}
                loading={loading}
                size="large"
                icon={<FileTextOutlined />}
              >
                {loading ? "处理中..." : "开始处理简历"}
              </Button>

              <Button onClick={fetchCandidates} disabled={loading} size="large">
                刷新候选人列表
              </Button>
            </Space>
          </div>
        )}

        {renderStatus()}
      </Card>

      <Card style={{ marginTop: "24px" }}>
        <Title level={4}>使用说明</Title>
        <Paragraph>
          1.
          确保飞书表格中包含以下列：「姓名」、「个人简历」、「简历文本」、「简历优化」、「面试题及答案」、「状态」
        </Paragraph>
        <Paragraph>
          2. 在「个人简历」列中上传简历文件（支持 PDF、Word 格式）
        </Paragraph>
        <Paragraph>3. 选择候选人后，点击「开始处理简历」按钮</Paragraph>
        <Paragraph>4. 处理完成后，结果将自动填入对应的表格列中</Paragraph>
      </Card>
    </div>
  );
};

export default FeishuMode;
