import React, { useState, useEffect } from "react";
import { Select, Button, message, Spin } from "antd";
import { analyzeResume } from "./api";

// 飞书侧边栏SDK
import { bitable } from "@lark-base-open/js-sdk";

const App = () => {
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
        message.error(
          "表格缺少必要的列，请确保表格中有「个人简历」、「简历文本」、「简历优化」、「面试题及答案」和「状态」列"
        );
        setLoading(false);
        setStatus("error");
        setStatusMessage("表格结构不符合要求");
        return;
      }

      // 获取简历文件信息
      const resumeCell = await table.getCellValue(
        resumeField.id,
        selectedCandidate.recordId
      );

      if (!resumeCell || !resumeCell.length) {
        message.error("未找到简历文件，请确保已上传简历");
        setLoading(false);
        setStatus("error");
        setStatusMessage("未找到简历文件");
        return;
      }

      // 更新状态为处理中
      await table.setCellValue(
        statusField.id,
        selectedCandidate.recordId,
        "处理中"
      );

      // 获取文件URL
      const fileToken = resumeCell[0].token;
      const fileName = resumeCell[0].name;

      try {
        // 使用飞书Base JS SDK获取文件URL，然后使用fetch API下载文件内容
        // 获取附件的临时URL
        const fileUrl = await table.getAttachmentUrl(fileToken);

        console.log("fileUrl:", fileUrl);

        // 使用fetch API下载文件内容
        const fileResponse = await fetch(fileUrl);
        const fileBlob = await fileResponse.blob();

        // 使用API服务发送文件到后端
        const file = new File([fileBlob], fileName);
        const response = await analyzeResume(file);

        if (response.data.success) {
          // 更新简历文本
          await table.setCellValue(
            resumeTextField.id,
            selectedCandidate.recordId,
            response.data.resumeText
          );

          // 更新优化后的简历
          await table.setCellValue(
            optimizedResumeField.id,
            selectedCandidate.recordId,
            response.data.optimizedResume
          );

          // 更新面试题及答案
          await table.setCellValue(
            interviewQuestionsField.id,
            selectedCandidate.recordId,
            response.data.interviewQuestions
          );

          // 更新状态为已完成
          await table.setCellValue(
            statusField.id,
            selectedCandidate.recordId,
            "已完成"
          );

          setStatus("success");
          setStatusMessage("简历处理完成");
          message.success("简历处理完成");
        } else {
          setStatus("error");
          setStatusMessage(response.data.message || "处理失败");
          message.error(response.data.message || "处理失败");

          // 更新状态为处理失败
          await table.setCellValue(
            statusField.id,
            selectedCandidate.recordId,
            "处理失败"
          );
        }
      } catch (fileError) {
        console.error("获取文件内容失败:", fileError);
        setStatus("error");
        setStatusMessage(`获取文件内容失败: ${fileError.message}`);
        message.error(`获取文件内容失败: ${fileError.message}`);

        // 更新状态为处理失败
        await table.setCellValue(
          statusField.id,
          selectedCandidate.recordId,
          "处理失败"
        );
      }
    } catch (error) {
      console.error("简历处理失败:", error);
      setStatus("error");
      setStatusMessage(error.response?.data?.message || "处理失败");
      message.error(error.response?.data?.message || "处理失败");

      // 尝试更新状态为失败
      try {
        const selection = await sidebar.getSelection();
        const table = await bitable.base.getTable(selection.tableId);
        const fields = await table.getFieldMetaList();
        const statusField = fields.find((field) => field.name === "状态");

        if (statusField) {
          await table.setCellValue(
            statusField.id,
            selectedCandidate.recordId,
            "处理失败"
          );
        }
      } catch (e) {
        console.error("更新状态失败:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  // 渲染状态提示
  const renderStatus = () => {
    if (!status) return null;

    return <div className={`status status-${status}`}>{statusMessage}</div>;
  };

  return (
    <div className="container">
      <h1 className="title">简历分析助手</h1>

      <Spin spinning={loading}>
        <div className="form-item">
          <label>选择候选人：</label>
          <Select
            style={{ width: "100%" }}
            placeholder="请选择候选人"
            options={candidates.map((item) => ({
              value: item.recordId,
              label: item.name,
            }))}
            value={selectedCandidate?.recordId}
            onChange={(value) => {
              const candidate = candidates.find(
                (item) => item.recordId === value
              );
              setSelectedCandidate(candidate);
            }}
            disabled={loading}
          />
        </div>

        <div className="button-container">
          <Button
            type="primary"
            onClick={handleResumeOptimization}
            loading={loading}
            disabled={!selectedCandidate}
          >
            简历优化
          </Button>
        </div>

        {renderStatus()}
      </Spin>
    </div>
  );
};

export default App;
