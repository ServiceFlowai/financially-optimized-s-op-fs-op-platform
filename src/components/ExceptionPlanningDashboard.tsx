import React, { ChangeEvent } from "react";
import { useExceptionPlanning } from "../hooks/useExceptionPlanning";

const numberInputHandler = (
  callback: (value: number) => void
) =>
  (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) callback(value);
  };

const ExceptionPlanningDashboard: React.FC = () => {
  const {
    config,
    updateConfig,
    exceptions,
    autoAcceptDecisions,
    forecastValueAdds,
    biasKpis,
    plannerProductivity,
  } = useExceptionPlanning();

  const decisionMap = new Map(autoAcceptDecisions.map((decision) => [decision.exceptionId, decision]));

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <header>
        <h2>Exception-Based Planning &amp; Auto-Accept</h2>
        <p style={{ color: "#444" }}>
          Manage tolerance thresholds, track forecast value add, monitor bias, and measure planner productivity to
          streamline exception handling.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Max Severity</h3>
          <input
            type="number"
            min={10}
            max={100}
            value={config.maxSeverity}
            onChange={numberInputHandler((value) => updateConfig({ maxSeverity: value }))}
            style={{ width: "100%" }}
          />
        </article>
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Max Bias</h3>
          <input
            type="number"
            min={0}
            max={300}
            value={config.maxAbsoluteBias}
            onChange={numberInputHandler((value) => updateConfig({ maxAbsoluteBias: value }))}
            style={{ width: "100%" }}
          />
        </article>
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Max Value Impact ($)</h3>
          <input
            type="number"
            min={0}
            max={20000}
            value={config.maxValueImpact}
            onChange={numberInputHandler((value) => updateConfig({ maxValueImpact: value }))}
            style={{ width: "100%" }}
          />
        </article>
      </section>

      <section>
        <h3>Exception Queue</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>ID</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Product</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Type</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Severity</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Value ($)</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Bias</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exception) => {
                const decision = decisionMap.get(exception.id);
                return (
                  <tr key={exception.id}>
                    <td style={{ padding: "8px" }}>{exception.id}</td>
                    <td style={{ padding: "8px" }}>{exception.productId}</td>
                    <td style={{ padding: "8px" }}>{exception.type}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{exception.severity}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{exception.valueDifference.toFixed(0)}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>{exception.forecastBias.toFixed(2)}</td>
                    <td style={{ padding: "8px" }}>
                      {decision?.accepted ? (
                        <span style={{ color: "green", fontWeight: 600 }}>Auto Accepted</span>
                      ) : (
                        <span style={{ color: "#d17b0f", fontWeight: 600 }}>Manual Review</span>
                      )}
                      <div style={{ color: "#666", fontSize: "0.85rem" }}>{decision?.reason}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <article style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
          <h3>Forecast Value Add</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {forecastValueAdds.map((item) => (
              <li key={`${item.productId}-${item.plannerId}`} style={{ marginBottom: "12px" }}>
                <strong>{item.productId}</strong> (Planner: {item.plannerId})
                <div style={{ color: "#555" }}>
                  Δ Error: {item.valueAdd.toFixed(2)} | Baseline: {item.baselineError.toFixed(2)} | Final: {" "}
                  {item.finalError.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
          <h3>Bias Monitoring</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {biasKpis.map((kpi) => (
              <li key={kpi.productId} style={{ marginBottom: "12px" }}>
                <strong>{kpi.productId}</strong>
                <div style={{ color: "#555" }}>
                  Bias: {kpi.bias.toFixed(2)} | Change vs baseline: {kpi.biasChange.toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </article>
        <article style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
          <h3>Planner Productivity</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {plannerProductivity.map((kpi) => (
              <li key={kpi.plannerId} style={{ marginBottom: "12px" }}>
                <strong>{kpi.plannerId}</strong>
                <div style={{ color: "#555" }}>
                  Reviewed: {kpi.exceptionsReviewed} | Auto-Accept: {kpi.autoAccepted} | Manual: {kpi.manualActions}
                </div>
                <div style={{ color: "#555" }}>
                  Auto-Accept Rate: {kpi.autoAcceptRate}% | Effort Hours: {kpi.elapsedHours}
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  );
};

export default ExceptionPlanningDashboard;
