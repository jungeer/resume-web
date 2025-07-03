import React from "react";
import { Card, Button, Row, Col, Typography, Space } from "antd";
import {
  AppstoreOutlined,
  GlobalOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const ModeSelector = ({ onModeSelect }) => {
  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <Title level={1}>智能简历分析系统</Title>
        <Paragraph style={{ fontSize: "16px", color: "#666" }}>
          选择您的使用模式，体验AI驱动的简历分析和面试准备工具
        </Paragraph>
      </div>

      <Row gutter={[32, 32]}>
        {/* 飞书插件模式 */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            style={{ height: "100%", textAlign: "center" }}
            bodyStyle={{ padding: "32px" }}
          >
            <AppstoreOutlined
              style={{
                fontSize: "64px",
                color: "#1890ff",
                marginBottom: "24px",
              }}
            />
            <Title level={3} style={{ marginBottom: "16px" }}>
              飞书插件模式
            </Title>
            <Paragraph style={{ marginBottom: "24px", minHeight: "80px" }}>
              集成飞书多维表格，批量处理简历数据。
              适合HR团队和招聘机构使用，支持表格数据自动同步和批量分析。
            </Paragraph>

            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "24px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileTextOutlined
                  style={{ marginRight: "8px", color: "#52c41a" }}
                />
                <span>批量简历处理</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QuestionCircleOutlined
                  style={{ marginRight: "8px", color: "#52c41a" }}
                />
                <span>表格数据同步</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppstoreOutlined
                  style={{ marginRight: "8px", color: "#52c41a" }}
                />
                <span>团队协作管理</span>
              </div>
            </Space>

            <Button
              type="primary"
              size="large"
              style={{ width: "100%" }}
              onClick={() => onModeSelect("feishu")}
            >
              进入飞书模式
            </Button>
          </Card>
        </Col>

        {/* 独立Web模式 */}
        <Col xs={24} md={12}>
          <Card
            hoverable
            style={{ height: "100%", textAlign: "center" }}
            bodyStyle={{ padding: "32px" }}
          >
            <GlobalOutlined
              style={{
                fontSize: "64px",
                color: "#13c2c2",
                marginBottom: "24px",
              }}
            />
            <Title level={3} style={{ marginBottom: "16px" }}>
              独立Web模式
            </Title>
            <Paragraph style={{ marginBottom: "24px", minHeight: "80px" }}>
              直接在浏览器中使用，无需安装任何插件。
              适合个人求职者和小团队使用，操作简单快捷。
            </Paragraph>

            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: "24px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileTextOutlined
                  style={{ marginRight: "8px", color: "#13c2c2" }}
                />
                <span>简历文本解析</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <QuestionCircleOutlined
                  style={{ marginRight: "8px", color: "#13c2c2" }}
                />
                <span>面试题生成</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GlobalOutlined
                  style={{ marginRight: "8px", color: "#13c2c2" }}
                />
                <span>优化建议提供</span>
              </div>
            </Space>

            <Button
              type="primary"
              size="large"
              style={{
                width: "100%",
                backgroundColor: "#13c2c2",
                borderColor: "#13c2c2",
              }}
              onClick={() => onModeSelect("web")}
            >
              进入Web模式
            </Button>
          </Card>
        </Col>
      </Row>

      <div style={{ textAlign: "center", marginTop: "48px" }}>
        <Paragraph type="secondary">
          💡 提示：您可以随时切换模式，两种模式都提供完整的简历分析功能
        </Paragraph>
      </div>
    </div>
  );
};

export default ModeSelector;
