import React, { useState, useEffect } from "react";
import { ConfigProvider, message } from "antd";
import zhCN from "antd/locale/zh_CN";
import ModeSelector from "./components/ModeSelector";
import FeishuMode from "./components/FeishuMode";
import WebMode from "./components/WebMode";

const App = () => {
  const [currentMode, setCurrentMode] = useState(null);
  const [isFeishuEnvironment, setIsFeishuEnvironment] = useState(false);

  useEffect(() => {
    // 检测是否在飞书环境中
    const checkFeishuEnvironment = () => {
      try {
        // 检查是否有飞书SDK
        if (typeof window !== "undefined" && window.bitable) {
          setIsFeishuEnvironment(true);
        }
      } catch (error) {
        console.log("不在飞书环境中");
      }
    };

    checkFeishuEnvironment();

    // 从URL参数中获取模式
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    if (mode && (mode === "feishu" || mode === "web")) {
      setCurrentMode(mode);
    }
  }, []);

  const handleModeSelect = (mode) => {
    setCurrentMode(mode);

    // 更新URL参数
    const url = new URL(window.location);
    url.searchParams.set("mode", mode);
    window.history.pushState({}, "", url);

    if (mode === "feishu" && !isFeishuEnvironment) {
      message.warning("当前不在飞书环境中，飞书插件功能可能无法正常使用");
    }
  };

  const handleBackToSelector = () => {
    setCurrentMode(null);

    // 清除URL参数
    const url = new URL(window.location);
    url.searchParams.delete("mode");
    window.history.pushState({}, "", url);
  };

  const renderCurrentMode = () => {
    switch (currentMode) {
      case "feishu":
        return <FeishuMode onBackToSelector={handleBackToSelector} />;
      case "web":
        return <WebMode onBackToSelector={handleBackToSelector} />;
      default:
        return <ModeSelector onModeSelect={handleModeSelect} />;
    }
  };

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">{renderCurrentMode()}</div>
    </ConfigProvider>
  );
};

export default App;
