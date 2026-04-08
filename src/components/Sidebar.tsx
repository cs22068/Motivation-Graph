import React from "react";
import { GraphLogic } from "../hooks/useGraphLogic";
import { EVENT_COLOR, DEEP_COLOR } from "../constants/config";

export default function Sidebar({ logic }: { logic: GraphLogic }) {
  const {
    points, selectedPoint, startAge, endAge, sortedPoints, selectedPointId,
    updatePoint, deletePoint, displayMonth, setSelectedPointId
  } = logic;

  return (
    <div style={{
      width: 300, borderLeft: "1px solid #e2e8f0", background: "#fff",
      display: "flex", flexDirection: "column", overflowY: "auto", fontSize: 13, flexShrink: 0,
    }}>
      {selectedPoint ? (
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>ポイント編集</h3>
            <button onClick={() => setSelectedPointId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8", padding: 4 }}>✕</button>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, color: "#64748b", fontSize: 11 }}>年齢</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={selectedPoint.age} onChange={e => updatePoint("age", Math.max(startAge, Math.min(endAge, parseInt(e.target.value) || 0)))} style={{ width: 56, padding: "5px 7px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }} />
              <span>歳</span>
              <input type="number" value={displayMonth(selectedPoint.month)} min={1} max={12} onChange={e => updatePoint("month", (Math.max(1, Math.min(12, parseInt(e.target.value) || 4)) - 4 + 12) % 12)} style={{ width: 48, padding: "5px 7px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }} />
              <span>月</span>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 4, color: "#64748b", fontSize: 11 }}>モチベーション: {selectedPoint.motivation}%</label>
            <input type="range" min={-100} max={100} value={selectedPoint.motivation} onChange={e => updatePoint("motivation", parseInt(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}><span>-100%</span><span>0%</span><span>100%</span></div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 5, color: EVENT_COLOR, fontSize: 11 }}>
              <span style={{ display: "inline-block", width: 12, height: 8, border: `2px solid ${EVENT_COLOR}`, borderRadius: 2, background: "#fff" }} />出来事
            </label>
            <textarea value={selectedPoint.event || ""} onChange={e => updatePoint("event", e.target.value)} placeholder="その時の出来事を入力..." rows={2} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${EVENT_COLOR}40`, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none" }} onFocus={e => e.target.style.borderColor = EVENT_COLOR} onBlur={e => e.target.style.borderColor = `${EVENT_COLOR}40`} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 5, color: DEEP_COLOR, fontSize: 11 }}>
              <span style={{ display: "inline-block", width: 12, height: 8, border: `2px solid ${DEEP_COLOR}`, borderRadius: 2, background: "#fff" }} />深掘り（理由）
            </label>
            <textarea value={selectedPoint.deepDive || ""} onChange={e => updatePoint("deepDive", e.target.value)} placeholder="なぜそう感じたか，理由を深掘り..." rows={3} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1.5px solid ${DEEP_COLOR}40`, fontSize: 13, resize: "vertical", boxSizing: "border-box", outline: "none" }} onFocus={e => e.target.style.borderColor = DEEP_COLOR} onBlur={e => e.target.style.borderColor = `${DEEP_COLOR}40`} />
          </div>

          <button onClick={() => deletePoint(selectedPoint.id)} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 13, cursor: "pointer", fontWeight: 600, marginTop: 4 }}>このポイントを削除</button>
        </div>
      ) : (
        <div style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>使い方</h3>
          <div style={{ color: "#64748b", lineHeight: 1.9, fontSize: 12 }}>
            <p style={{ margin: "0 0 8px" }}><strong style={{ color: "#3b82f6" }}>クリック</strong>でポイント追加（モチベーション0%）</p>
            <p style={{ margin: "0 0 8px" }}><strong style={{ color: "#3b82f6" }}>ドラッグ</strong>で位置調整</p>
            <p style={{ margin: "0 0 8px" }}>右パネルで<span style={{ color: EVENT_COLOR, fontWeight: 600 }}>出来事</span>と<span style={{ color: DEEP_COLOR, fontWeight: 600 }}>深掘り</span>を入力</p>
            <p style={{ margin: "0 0 8px" }}>年齢下の <strong style={{ color: "#3b82f6" }}>▼</strong> で月展開</p>
            <p style={{ margin: 0 }}>ツールバーの<span style={{ color: DEEP_COLOR, fontWeight: 600 }}>深掘りボタン</span>で表示切替</p>
          </div>

          {points.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#475569" }}>ポイント一覧 ({points.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sortedPoints.map(p => (
                  <div key={p.id} onClick={() => setSelectedPointId(p.id)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: p.id === selectedPointId ? "#eff6ff" : "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "flex-start", gap: 8, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"} onMouseLeave={e => { if (p.id !== selectedPointId) e.currentTarget.style.background = "#f8fafc"; }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{p.age}歳{p.month > 0 ? ` ${displayMonth(p.month)}月` : ""} — {p.motivation}%</div>
                      {p.event && <div style={{ fontSize: 11, color: EVENT_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{p.event}</div>}
                      {p.deepDive && <div style={{ fontSize: 10, color: DEEP_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{p.deepDive}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}