import {
  BomExplosionNode,
  BomComponent,
  Bottleneck,
  CapacityGroup,
  CapacityLoad,
  InventoryNode,
  InventoryOptimizationResult,
  PlannedOrder,
  Product,
  SafetyStockRecommendation,
} from "../types/planning";

const aggregateBom = (
  components: BomComponent[] | undefined,
  multiplier: number,
  catalogue: Map<string, Product>,
  level: number,
  visited: Set<string>,
  results: BomExplosionNode[],
  path: string[]
): void => {
  if (!components) return;
  components.forEach((component) => {
    const nextProduct = catalogue.get(component.componentId);
    const nodeQuantity = component.quantity * multiplier;
    results.push({
      componentId: component.componentId,
      name: nextProduct?.name ?? "Unknown",
      quantity: Number(nodeQuantity.toFixed(3)),
      level,
    });

    if (nextProduct && nextProduct.bom && !visited.has(component.componentId)) {
      visited.add(component.componentId);
      aggregateBom(nextProduct.bom, nodeQuantity, catalogue, level + 1, visited, results, [...path, component.componentId]);
      visited.delete(component.componentId);
    }
  });
};

export const explodeBom = (
  product: Product,
  quantity: number,
  catalogue: Map<string, Product>
): BomExplosionNode[] => {
  const results: BomExplosionNode[] = [];
  aggregateBom(product.bom, quantity, catalogue, 1, new Set([product.id]), results, [product.id]);
  return results;
};

const resolveCapacityForWeek = (
  capacityGroup: CapacityGroup,
  week: string
): number => capacityGroup.calendar[week] ?? capacityGroup.weeklyCapacity;

export const calculateCapacityLoads = (
  products: Product[],
  plannedOrders: PlannedOrder[],
  capacityGroups: CapacityGroup[]
): CapacityLoad[] => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const capacityMap = new Map(capacityGroups.map((group) => [group.id, group]));

  const loadMap = new Map<string, CapacityLoad>();

  plannedOrders.forEach((order) => {
    const product = productMap.get(order.productId);
    if (!product) return;
    const capacityGroup = capacityMap.get(product.capacityGroupId);
    if (!capacityGroup) return;

    const key = `${capacityGroup.id}-${order.week}`;
    const available = resolveCapacityForWeek(capacityGroup, order.week);
    const existing = loadMap.get(key) ?? {
      capacityGroupId: capacityGroup.id,
      week: order.week,
      load: 0,
      available,
      utilization: 0,
    };

    existing.load += order.quantity;
    existing.utilization = Number((existing.load / Math.max(existing.available, 1)).toFixed(2));
    loadMap.set(key, existing);
  });

  return Array.from(loadMap.values()).sort((a, b) => a.week.localeCompare(b.week));
};

export const detectBottlenecks = (capacityLoads: CapacityLoad[]): Bottleneck[] => {
  return capacityLoads
    .filter((load) => load.utilization >= 0.85)
    .map((load) => ({
      capacityGroupId: load.capacityGroupId,
      week: load.week,
      utilization: load.utilization,
      impact: Number(((load.utilization - 1) * load.available).toFixed(2)),
    }))
    .sort((a, b) => b.utilization - a.utilization);
};

const serviceLevelToZ = (serviceLevel: number): number => {
  if (serviceLevel >= 0.999) return 3.09;
  if (serviceLevel >= 0.995) return 2.58;
  if (serviceLevel >= 0.99) return 2.33;
  if (serviceLevel >= 0.98) return 2.05;
  if (serviceLevel >= 0.95) return 1.64;
  if (serviceLevel >= 0.9) return 1.28;
  if (serviceLevel >= 0.85) return 1.04;
  if (serviceLevel >= 0.8) return 0.84;
  return 0.52;
};

export const optimizeSafetyStock = (products: Product[]): SafetyStockRecommendation[] => {
  return products.map((product) => {
    const { serviceLevel, variability, leadTimeWeeks } = product.safetyStockPolicy;
    const z = serviceLevelToZ(serviceLevel);
    const recommended = z * variability * Math.sqrt(leadTimeWeeks);
    return {
      productId: product.id,
      recommendedSafetyStock: Number(recommended.toFixed(2)),
      serviceLevel,
      currentPolicy: product.safetyStockPolicy,
    };
  });
};

export const optimizeMultiEchelonInventory = (
  nodes: InventoryNode[],
  holdingCostWeight = 0.4
): InventoryOptimizationResult[] => {
  const groupedByProduct = nodes.reduce<Record<string, InventoryNode[]>>((acc, node) => {
    const bucket = acc[node.productId] ?? [];
    bucket.push(node);
    acc[node.productId] = bucket;
    return acc;
  }, {});

  return Object.entries(groupedByProduct).flatMap(([productId, productNodes]) => {
    const totalDemand = productNodes.reduce((sum, node) => sum + node.demand, 0) || 1;
    return productNodes.map((node) => {
      const demandShare = node.demand / totalDemand;
      const z = serviceLevelToZ(node.serviceLevel);
      const safetyStock = z * node.variability * Math.sqrt(node.leadTimeWeeks) * demandShare;
      const cycleStock = node.demand * (node.leadTimeWeeks / 2);
      const reorderPoint = safetyStock + cycleStock;
      const totalCost = holdingCostWeight * node.holdingCost * (safetyStock + cycleStock);
      return {
        productId,
        locationId: node.locationId,
        safetyStock: Number(safetyStock.toFixed(2)),
        cycleStock: Number(cycleStock.toFixed(2)),
        reorderPoint: Number(reorderPoint.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
      };
    });
  });
};
