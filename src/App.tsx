import React from "react";
import { useGraphLogic } from "./hooks/useGraphLogic";
import Toolbar from "./components/Toolbar";
import GraphBoard from "./components/GraphBoard";
import Sidebar from "./components/Sidebar";

export default function MotivationGraph() {
  const logic = useGraphLogic();

  return (
    <div style={{
      display: "flex", height: "100vh",
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      background: "#f8f9fb", color: "#1e293b", overflow: "hidden",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Toolbar logic={logic} />
        <GraphBoard logic={logic} />
      </div>
      <Sidebar logic={logic} />
    </div>
  );
}