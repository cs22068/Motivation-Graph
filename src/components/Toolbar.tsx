import React from "react";
import { GraphLogic } from "../hooks/useGraphLogic";
import { ViewMode, LineStyle } from "../types";
import { DEEP_COLOR } from "../constants/config";

export default function Toolbar({ logic }: { logic: GraphLogic }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
      borderBottom: "1px solid #e2e8f0", background: "#fff", flexWrap: "wrap", flexShrink: 0,
    }}>
      <input value={logic.title} onChange={e => logic.setTitle(e.target.value)}
        style={{ fontSize: 17, fontWeight: 700, border: "none", background: "transparent", outline: "none", minWidth: 160, color: "#1e293b" }}
        placeholder="タイトルを入力" />
      <div style={{ flex: 1 }} />

      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}>
        <input type="number" value={logic.startAge}
          onChange={e => logic.setStartAge(Math.max(0, parseInt(e.target.value) || 0))}
          style={{ width: 42, padding: "3px 5px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }} />
        <span>〜</span>
        <input type="number" value={logic.endAge}
          onChange={e => logic.setEndAge(Math.max(logic.startAge + 1, parseInt(e.target.value) || 30))}
          style={{ width: 42, padding: "3px 5px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12 }} />
        <span>歳</span>
      </label>

      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #cbd5e1", fontSize: 11 }}>
        {(Object.entries({ year: "年", month: "月" }) as [ViewMode, string][]).map(([v, l]) => (
          <button key={v} onClick={() => { logic.setViewMode(v); if (v === "month") logic.setExpandedYears(new Set()); }}
            style={{ padding: "4px 12px", border: "none", cursor: "pointer",
              background: logic.viewMode === v ? "#3b82f6" : "#fff",
              color: logic.viewMode === v ? "#fff" : "#475569",
              fontWeight: logic.viewMode === v ? 600 : 400 }}>{l}表示</button>
        ))}
      </div>

      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid #cbd5e1", fontSize: 11 }}>
        {(Object.entries({ curve: "曲線", straight: "直線" }) as [LineStyle, string][]).map(([v, l]) => (
          <button key={v} onClick={() => logic.setLineStyle(v)}
            style={{ padding: "4px 12px", border: "none", cursor: "pointer",
              background: logic.lineStyle === v ? "#3b82f6" : "#fff",
              color: logic.lineStyle === v ? "#fff" : "#475569",
              fontWeight: logic.lineStyle === v ? 600 : 400 }}>{l}</button>
        ))}
      </div>

      <button onClick={() => logic.setShowDeepDive(!logic.showDeepDive)}
        style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600,
          border: `1.5px solid ${DEEP_COLOR}`,
          background: logic.showDeepDive ? `${DEEP_COLOR}18` : "#fff",
          color: DEEP_COLOR,
        }}>
        {logic.showDeepDive ? "深掘り 表示中" : "深掘り 非表示"}
      </button>

      <button onClick={logic.exportPNG} style={{
        padding: "5px 14px", borderRadius: 6, border: "none",
        background: "#3b82f6", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600,
      }}>PNG保存</button>
    </div>
  );
}