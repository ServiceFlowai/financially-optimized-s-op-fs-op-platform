import { useMemo, useState } from "react";
import {
  DemandSignal,
  ForecastConfig,
  ForecastOutput,
  HistoricalDemandPoint,
  NpiProfile,
  Product,
  PromotionEvent,
  SegmentationResult,
} from "../types/planning";
import {
  buildForecastPipeline,
  calculateForecastMetrics,
  performSegmentation,
} from "../utils/forecasting";

interface ForecastingState {
  config: ForecastConfig;
  updateConfig: (delta: Partial<ForecastConfig>) => void;
  outputs: ForecastOutput[];
  segmentationSummary: {
    byABC: Record<string, number>;
    byXYZ: Record<string, number>;
  };
  products: Product[];
}

const DEFAULT_CONFIG: ForecastConfig = {
  horizonWeeks: 12,
  smoothingAlpha: 0.35,
  promoUpliftCap: 0.6,
  demandSensingWeight: 0.45,
};

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

const historicalDemand: Record<string, HistoricalDemandPoint[]> = {
  "FG-100": [
    { date: "2023-10-02", quantity: 420 },
    { date: "2023-10-09", quantity: 460 },
    { date: "2023-10-16", quantity: 480 },
    { date: "2023-10-23", quantity: 510 },
    { date: "2023-10-30", quantity: 470 },
    { date: "2023-11-06", quantity: 530 },
    { date: "2023-11-13", quantity: 550 },
    { date: "2023-11-20", quantity: 600 },
    { date: "2023-11-27", quantity: 590 },
    { date: "2023-12-04", quantity: 610 },
    { date: "2023-12-11", quantity: 640 },
    { date: "2023-12-18", quantity: 630 },
  ],
  "PCBA-200": [
    { date: "2023-10-02", quantity: 520 },
    { date: "2023-10-09", quantity: 560 },
    { date: "2023-10-16", quantity: 590 },
    { date: "2023-10-23", quantity: 610 },
    { date: "2023-10-30", quantity: 605 },
    { date: "2023-11-06", quantity: 640 },
    { date: "2023-11-13", quantity: 650 },
    { date: "2023-11-20", quantity: 670 },
  ],
  "PACK-500": [
    { date: "2023-10-02", quantity: 600 },
    { date: "2023-10-09", quantity: 620 },
    { date: "2023-10-16", quantity: 630 },
    { date: "2023-10-23", quantity: 650 },
    { date: "2023-10-30", quantity: 645 },
    { date: "2023-11-06", quantity: 660 },
  ],
  "CHIP-900": [
    { date: "2023-10-02", quantity: 2500 },
    { date: "2023-10-09", quantity: 2550 },
    { date: "2023-10-16", quantity: 2620 },
    { date: "2023-10-23", quantity: 2650 },
    { date: "2023-10-30", quantity: 2660 },
    { date: "2023-11-06", quantity: 2680 },
  ],
  "OPT-700": [
    { date: "2023-10-02", quantity: 180 },
    { date: "2023-10-09", quantity: 185 },
    { date: "2023-10-16", quantity: 190 },
    { date: "2023-10-23", quantity: 200 },
    { date: "2023-10-30", quantity: 205 },
    { date: "2023-11-06", quantity: 210 },
  ],
};

const demandSignals: Record<string, DemandSignal[]> = {
  "FG-100": [
    { date: "2023-12-25", signalType: "orders", value: 680, weight: 0.5 },
    { date: "2024-01-01", signalType: "search", value: 1.12, weight: 0.2 },
    { date: "2024-01-08", signalType: "pos", value: 620, weight: 0.3 },
  ],
  "PCBA-200": [
    { date: "2023-12-25", signalType: "shipments", value: 640, weight: 0.6 },
    { date: "2024-01-01", signalType: "orders", value: 630, weight: 0.4 },
  ],
  "FG-210": [
    { date: "2023-12-25", signalType: "search", value: 1.5, weight: 0.5 },
    { date: "2024-01-01", signalType: "orders", value: 250, weight: 0.5 },
  ],
};

const promotions: PromotionEvent[] = [
  {
    id: "PROMO-100",
    productId: "FG-100",
    startDate: "2023-12-18",
    endDate: "2023-12-31",
    upliftPercentage: 0.25,
  },
  {
    id: "PROMO-200",
    productId: "PCBA-200",
    startDate: "2023-12-11",
    endDate: "2023-12-24",
    upliftPercentage: 0.1,
  },
];

const npiProfiles: NpiProfile[] = [
  {
    productId: "FG-210",
    rampWeeks: 12,
    rampCurve: [0.05, 0.08, 0.12, 0.15, 0.18, 0.2, 0.22, 0.22, 0.21, 0.2, 0.18, 0.16],
    targetVolume: 800,
  },
];

const segmentationMap = performSegmentation(products, historicalDemand);

export const useForecasting = (): ForecastingState => {
  const [config, setConfig] = useState<ForecastConfig>(DEFAULT_CONFIG);

  const outputs = useMemo<ForecastOutput[]>(() => {
    return products.map((product) => {
      const history = historicalDemand[product.id] ?? [];
      const npiProfile = npiProfiles.find((profile) => profile.productId === product.id);
      const pipeline = buildForecastPipeline({
        product,
        history,
        config,
        promotions,
        signals: demandSignals[product.id] ?? [],
        npiProfile,
      });
      const metrics = calculateForecastMetrics(history);
      const segmentation = segmentationMap[product.id] ?? {
        productId: product.id,
        abcClass: "C",
        xyzClass: "Z",
      };
      return {
        ...pipeline,
        segmentation,
        metrics,
      };
    });
  }, [config]);

  const segmentationSummary = useMemo(() => {
    const byABC: Record<string, number> = { A: 0, B: 0, C: 0 };
    const byXYZ: Record<string, number> = { X: 0, Y: 0, Z: 0 };

    Object.values(segmentationMap).forEach((result) => {
      byABC[result.abcClass] = (byABC[result.abcClass] ?? 0) + 1;
      byXYZ[result.xyzClass] = (byXYZ[result.xyzClass] ?? 0) + 1;
    });

    return { byABC, byXYZ };
  }, []);

  const updateConfig = (delta: Partial<ForecastConfig>) => {
    setConfig((prev) => ({ ...prev, ...delta }));
  };

  return {
    config,
    updateConfig,
    outputs,
    segmentationSummary,
    products,
  };
};
