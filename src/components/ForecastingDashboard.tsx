import React, { ChangeEvent } from "react";
import { useForecasting } from "../hooks/useForecasting";

const numberInputHandler = (
  callback: (value: number) => void
) =>
  (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      callback(value);
    }
  };

const ForecastingDashboard: React.FC = () => {
  const { config, updateConfig, outputs, segmentationSummary, products } = useForecasting();

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <header>
        <h2>AI Statistical Forecasting &amp; Demand Sensing</h2>
        <p style={{ color: "#444" }}>
          Configure AI-driven forecast parameters, review ABC/XYZ segmentation, and inspect baseline, promotional,
          and sensed forecasts across the portfolio.
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
          <h3>Forecast Horizon (weeks)</h3>
          <input
            type="number"
            min={4}
            max={52}
            value={config.horizonWeeks}
            onChange={numberInputHandler((value) => updateConfig({ horizonWeeks: value }))}
            style={{ width: "100%" }}
          />
        </article>
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Smoothing Alpha</h3>
          <input
            type="number"
            min={0.05}
            max={0.99}
            step={0.05}
            value={config.smoothingAlpha}
            onChange={numberInputHandler((value) => updateConfig({ smoothingAlpha: value }))}
            style={{ width: "100%" }}
          />
        </article>
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Promo Uplift Cap</h3>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={config.promoUpliftCap}
            onChange={numberInputHandler((value) => updateConfig({ promoUpliftCap: value }))}
            style={{ width: "100%" }}
          />
        </article>
        <article style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3>Demand Sensing Weight</h3>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={config.demandSensingWeight}
            onChange={numberInputHandler((value) => updateConfig({ demandSensingWeight: value }))}
            style={{ width: "100%" }}
          />
        </article>
      </section>

      <section style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <article style={{ flex: "1 1 220px", padding: "16px", border: "1px solid #ccc", borderRadius: "8px" }}>
          <h3>ABC Distribution</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(segmentationSummary.byABC).map(([key, value]) => (
              <li key={key}>
                <strong>{key}</strong>: {value}
              </li>
            ))}
          </ul>
        </article>
        <article style={{ flex: "1 1 220px", padding: "16px", border: "1px solid #ccc", borderRadius: "8px" }}>
          <h3>XYZ Distribution</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(segmentationSummary.byXYZ).map(([key, value]) => (
              <li key={key}>
                <strong>{key}</strong>: {value}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section style={{ display: "grid", gap: "24px" }}>
        {outputs.map((output) => {
          const product = products.find((item) => item.id === output.productId);
          return (
            <article
              key={output.productId}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px",
                display: "grid",
                gap: "12px",
              }}
            >
              <header>
                <h3>{product?.name ?? output.productId}</h3>
                <p style={{ margin: 0, color: "#666" }}>
                  ABC: <strong>{output.segmentation.abcClass}</strong> | XYZ: <strong>{output.segmentation.xyzClass}</strong>
                  {" | "}
                  MAPE: <strong>{output.metrics.mape}%</strong> | Bias: <strong>{output.metrics.bias}</strong>
                </p>
              </header>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Week</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Baseline</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Promo Adj.</th>
                      <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Sensed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {output.baseline.map((point, index) => (
                      <tr key={point.date}>
                        <td style={{ padding: "4px 8px" }}>{point.date}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>{point.quantity.toFixed(2)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          {output.promoAdjusted[index]?.quantity.toFixed(2)}
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          {output.sensed[index]?.quantity.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
};

export default ForecastingDashboard;
