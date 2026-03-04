import React, { ChangeEvent } from "react";
import { useConstrainedPlanning } from "../hooks/useConstrainedPlanning";

const numberInputHandler = (
  callback: (value: number) => void
) =>
  (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) callback(value);
  };

const ConstrainedPlanningDashboard: React.FC = () => {
  const {
    products,
    capacityGroups,
    demandQuantity,
    setDemandQuantity,
    selectedProductId,
    setSelectedProductId,
    bomExplosion,
    capacityLoads,
    bottlenecks,
    inventoryOptimization,
    safetyStockRecommendations,
  } = useConstrainedPlanning();

  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <header>
        <h2>Multi-Level Constrained Planning</h2>
        <p style={{ color: "#444" }}>
          Visualize BOM explosion, monitor capacity constraints, flag bottlenecks, and optimize multi-echelon inventory
          and safety stock policies.
        </p>
      </header>

      <section style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ minWidth: "220px" }}>
          <label htmlFor="product-select"><strong>Finished Good</strong></label>
          <select
            id="product-select"
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: "220px" }}>
          <label htmlFor="demand-quantity"><strong>Demand Quantity</strong></label>
          <input
            id="demand-quantity"
            type="number"
            min={0}
            value={demandQuantity}
            onChange={numberInputHandler((value) => setDemandQuantity(value))}
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
      </section>

      <section>
        <h3>BOM Explosion</h3>
        {bomExplosion.length === 0 ? (
          <p style={{ color: "#666" }}>No BOM defined for the selected product.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Component</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Name</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Quantity</th>
                  <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Level</th>
                </tr>
              </thead>
              <tbody>
                {bomExplosion.map((node) => (
                  <tr key={`${node.componentId}-${node.level}`}>
                    <td style={{ padding: "6px 8px" }}>{node.componentId}</td>
                    <td style={{ padding: "6px 8px" }}>{node.name}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{node.quantity.toFixed(2)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{node.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3>Capacity Utilization</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Capacity Group</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Week</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Load</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Available</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {capacityLoads.map((load) => {
                const capacityGroup = capacityGroups.find((group) => group.id === load.capacityGroupId);
                return (
                  <tr key={`${load.capacityGroupId}-${load.week}`}>
                    <td style={{ padding: "6px 8px" }}>{capacityGroup?.name ?? load.capacityGroupId}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{load.week}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{load.load.toFixed(0)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{load.available.toFixed(0)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: load.utilization >= 1 ? "#c0392b" : load.utilization >= 0.9 ? "#d17b0f" : "#2c3e50" }}>
                      {(load.utilization * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Bottleneck Alerts</h3>
        {bottlenecks.length === 0 ? (
          <p style={{ color: "#666" }}>No bottlenecks detected above the 85% utilization threshold.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {bottlenecks.map((bottleneck) => (
              <li key={`${bottleneck.capacityGroupId}-${bottleneck.week}`} style={{ marginBottom: "12px" }}>
                <strong>{bottleneck.capacityGroupId}</strong> | Week {bottleneck.week} | Utilization:
                {(bottleneck.utilization * 100).toFixed(1)}% | Excess Load: {bottleneck.impact.toFixed(1)} units
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Multi-Echelon Inventory Optimization</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Product</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Location</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Safety Stock</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Cycle Stock</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Reorder Point</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Holding Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              {inventoryOptimization.map((item) => (
                <tr key={`${item.productId}-${item.locationId}`}>
                  <td style={{ padding: "6px 8px" }}>{item.productId}</td>
                  <td style={{ padding: "6px 8px" }}>{item.locationId}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.safetyStock.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.cycleStock.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.reorderPoint.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Safety Stock Optimization</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Product</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Recommended</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Service Level</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Lead Time (weeks)</th>
                <th style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}>Variability</th>
              </tr>
            </thead>
            <tbody>
              {safetyStockRecommendations.map((recommendation) => (
                <tr key={recommendation.productId}>
                  <td style={{ padding: "6px 8px" }}>{recommendation.productId}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{recommendation.recommendedSafetyStock.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{(recommendation.serviceLevel * 100).toFixed(1)}%</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{recommendation.currentPolicy.leadTimeWeeks}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{recommendation.currentPolicy.variability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};

export default ConstrainedPlanningDashboard;
