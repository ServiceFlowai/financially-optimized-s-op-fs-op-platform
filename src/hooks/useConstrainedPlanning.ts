import { useMemo, useState } from "react";
import {
  BomExplosionNode,
  Bottleneck,
  CapacityGroup,
  CapacityLoad,
  InventoryNode,
  InventoryOptimizationResult,
  PlannedOrder,
  Product,
  SafetyStockRecommendation,
} from "../types/planning";
import { addWeeks } from "../utils/dates";
import {
  calculateCapacityLoads,
  detectBottlenecks,
  explodeBom,
  optimizeMultiEchelonInventory,
  optimizeSafetyStock,
} from "../utils/constrainedPlanning";

export interface ConstrainedPlanningState {
  products: Product[];
  capacityGroups: CapacityGroup[];
  demandQuantity: number;
  setDemandQuantity: (quantity: number) => void;
  selectedProductId: string;
  setSelectedProductId: (productId: string) => void;
  bomExplosion: BomExplosionNode[];
  capacityLoads: CapacityLoad[];
  bottlenecks: Bottleneck[];
  inventoryOptimization: InventoryOptimizationResult[];
  safetyStockRecommendations: SafetyStockRecommendation[];
}

const products: Product[] = [
  {
    id: "FG-100",
    name: "Smart Speaker GenX",
    unitCost: 120,
    capacityGroupId: "ASSY",
    plannerId: "planner-amy",
    safetyStockPolicy: { serviceLevel: 0.95, variability: 180, leadTimeWeeks: 3 },
    bom: [
      { componentId: "PCBA-200", quantity: 1 },
      { componentId: "PACK-500", quantity: 1 },
    ],
  },
  {
    id: "PCBA-200",
    name: "Control Board",
    unitCost: 45,
    capacityGroupId: "SMT",
    plannerId: "planner-luis",
    safetyStockPolicy: { serviceLevel: 0.9, variability: 250, leadTimeWeeks: 2 },
    bom: [{ componentId: "CHIP-900", quantity: 4 }],
  },
  {
    id: "PACK-500",
    name: "Packaging Kit",
    unitCost: 5,
    capacityGroupId: "PACK",
    plannerId: "planner-luis",
    safetyStockPolicy: { serviceLevel: 0.85, variability: 60, leadTimeWeeks: 1 },
  },
  {
    id: "CHIP-900",
    name: "Signal Processor",
    unitCost: 12,
    capacityGroupId: "FAB",
    plannerId: "planner-sue",
    safetyStockPolicy: { serviceLevel: 0.98, variability: 320, leadTimeWeeks: 6 },
  },
  {
    id: "FG-210",
    name: "Vision Hub NPI",
    unitCost: 180,
    capacityGroupId: "ASSY",
    plannerId: "planner-amy",
    safetyStockPolicy: { serviceLevel: 0.92, variability: 210, leadTimeWeeks: 4 },
    bom: [
      { componentId: "PCBA-200", quantity: 1 },
      { componentId: "OPT-700", quantity: 2 },
    ],
  },
  {
    id: "OPT-700",
    name: "Optics Module",
    unitCost: 30,
    capacityGroupId: "OPT",
    plannerId: "planner-sue",
    safetyStockPolicy: { serviceLevel: 0.9, variability: 140, leadTimeWeeks: 5 },
  },
];

const capacityGroups: CapacityGroup[] = [
  {
    id: "ASSY",
    name: "Final Assembly",
    weeklyCapacity: 700,
    calendar: {
      [addWeeks("2023-12-11", 0)]: 650,
      [addWeeks("2023-12-11", 1)]: 600,
    },
  },
  {
    id: "SMT",
    name: "Surface Mount",
    weeklyCapacity: 1200,
    calendar: {},
  },
  {
    id: "PACK",
    name: "Packaging",
    weeklyCapacity: 1500,
    calendar: {},
  },
  {
    id: "FAB",
    name: "Wafer Fabrication",
    weeklyCapacity: 8000,
    calendar: {},
  },
  {
    id: "OPT",
    name: "Optics Cell",
    weeklyCapacity: 400,
    calendar: {},
  },
];

const plannedOrders: PlannedOrder[] = [
  { productId: "FG-100", week: addWeeks("2023-12-11", 0), quantity: 600 },
  { productId: "FG-100", week: addWeeks("2023-12-11", 1), quantity: 720 },
  { productId: "FG-210", week: addWeeks("2023-12-11", 1), quantity: 300 },
  { productId: "PCBA-200", week: addWeeks("2023-12-11", 0), quantity: 1200 },
  { productId: "PCBA-200", week: addWeeks("2023-12-11", 1), quantity: 1350 },
  { productId: "OPT-700", week: addWeeks("2023-12-11", 1), quantity: 500 },
  { productId: "PACK-500", week: addWeeks("2023-12-11", 0), quantity: 900 },
];

const inventoryNetwork: InventoryNode[] = [
  {
    locationId: "DC-US",
    productId: "FG-100",
    demand: 480,
    leadTimeWeeks: 2,
    holdingCost: 12,
    serviceLevel: 0.95,
    variability: 160,
  },
  {
    locationId: "DC-EU",
    productId: "FG-100",
    demand: 320,
    leadTimeWeeks: 3,
    holdingCost: 14,
    serviceLevel: 0.93,
    variability: 170,
  },
  {
    locationId: "DC-US",
    productId: "FG-210",
    demand: 220,
    leadTimeWeeks: 4,
    holdingCost: 16,
    serviceLevel: 0.94,
    variability: 210,
  },
  {
    locationId: "DC-APAC",
    productId: "FG-210",
    demand: 260,
    leadTimeWeeks: 5,
    holdingCost: 18,
    serviceLevel: 0.96,
    variability: 240,
  },
];

export const useConstrainedPlanning = (): ConstrainedPlanningState => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0].id);
  const [demandQuantity, setDemandQuantityInternal] = useState<number>(500);

  const productCatalogue = useMemo(() => new Map(products.map((product) => [product.id, product])), []);

  const bomExplosion = useMemo<BomExplosionNode[]>(() => {
    const product = productCatalogue.get(selectedProductId);
    if (!product) return [];
    return explodeBom(product, demandQuantity, productCatalogue);
  }, [selectedProductId, demandQuantity, productCatalogue]);

  const capacityLoads = useMemo<CapacityLoad[]>(() => {
    return calculateCapacityLoads(products, plannedOrders, capacityGroups);
  }, []);

  const bottlenecks = useMemo<Bottleneck[]>(() => {
    return detectBottlenecks(capacityLoads);
  }, [capacityLoads]);

  const inventoryOptimization = useMemo<InventoryOptimizationResult[]>(() => {
    return optimizeMultiEchelonInventory(inventoryNetwork);
  }, []);

  const safetyStockRecommendations = useMemo<SafetyStockRecommendation[]>(() => {
    return optimizeSafetyStock(products);
  }, []);

  const setDemandQuantity = (quantity: number) => {
    setDemandQuantityInternal(Math.max(quantity, 0));
  };

  return {
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
  };
};
