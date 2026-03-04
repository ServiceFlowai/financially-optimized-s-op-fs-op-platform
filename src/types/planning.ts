export interface HistoricalDemandPoint {
  date: string; // ISO date string representing start of the week
  quantity: number;
}

export type DemandSignalType = "orders" | "shipments" | "search" | "pos";

export interface DemandSignal {
  date: string;
  signalType: DemandSignalType;
  value: number;
  weight: number; // relative importance (0 - 1)
}

export interface PromotionEvent {
  id: string;
  productId: string;
  startDate: string;
  endDate: string;
  upliftPercentage: number; // expressed as decimal (e.g. 0.15 for +15%)
}

export interface NpiProfile {
  productId: string;
  rampWeeks: number;
  rampCurve: number[]; // normalized factors summing to 1 across rampWeeks
  targetVolume: number;
}

export interface ForecastConfig {
  horizonWeeks: number;
  smoothingAlpha: number;
  promoUpliftCap: number;
  demandSensingWeight: number;
}

export type ForecastSeriesSource = "baseline" | "promo-adjusted" | "sensed";

export interface ForecastSeriesPoint {
  date: string;
  quantity: number;
  source: ForecastSeriesSource;
}

export type ABCClass = "A" | "B" | "C";
export type XYZClass = "X" | "Y" | "Z";

export interface SegmentationResult {
  productId: string;
  abcClass: ABCClass;
  xyzClass: XYZClass;
}

export interface ForecastMetrics {
  mape: number;
  bias: number;
}

export interface ForecastOutput {
  productId: string;
  baseline: ForecastSeriesPoint[];
  promoAdjusted: ForecastSeriesPoint[];
  sensed: ForecastSeriesPoint[];
  segmentation: SegmentationResult;
  metrics: ForecastMetrics;
}

export interface BomComponent {
  componentId: string;
  quantity: number;
}

export interface SafetyStockPolicy {
  serviceLevel: number;
  variability: number; // historical standard deviation of demand per week
  leadTimeWeeks: number;
}

export interface Product {
  id: string;
  name: string;
  unitCost: number;
  capacityGroupId: string;
  plannerId: string;
  safetyStockPolicy: SafetyStockPolicy;
  bom?: BomComponent[];
}

export type ExceptionType = "forecast" | "supply" | "capacity" | "inventory";

export interface PlanningException {
  id: string;
  productId: string;
  plannerId: string;
  type: ExceptionType;
  severity: number; // 1 (low) - 100 (critical)
  message: string;
  valueDifference: number;
  forecastBias: number;
  baselineForecast: number;
  finalForecast: number;
  actualDemand: number;
  createdAt: string;
  resolvedAt?: string;
  manualOverride?: boolean;
}

export interface AutoAcceptConfig {
  maxSeverity: number;
  maxAbsoluteBias: number;
  maxValueImpact: number;
}

export interface AutoAcceptDecision {
  exceptionId: string;
  accepted: boolean;
  reason: string;
}

export interface ForecastValueAdd {
  productId: string;
  plannerId: string;
  baselineError: number;
  finalError: number;
  valueAdd: number;
}

export interface BiasKpi {
  productId: string;
  bias: number;
  biasChange: number;
}

export interface PlannerProductivityKpi {
  plannerId: string;
  exceptionsReviewed: number;
  autoAccepted: number;
  manualActions: number;
  elapsedHours: number;
  autoAcceptRate: number;
}

export interface CapacityGroup {
  id: string;
  name: string;
  weeklyCapacity: number;
  calendar: Record<string, number>; // ISO week -> available capacity override
}

export interface PlannedOrder {
  productId: string;
  week: string;
  quantity: number;
}

export interface CapacityLoad {
  capacityGroupId: string;
  week: string;
  load: number;
  available: number;
  utilization: number;
}

export interface Bottleneck {
  capacityGroupId: string;
  week: string;
  utilization: number;
  impact: number;
}

export interface BomExplosionNode {
  componentId: string;
  name: string;
  quantity: number;
  level: number;
}

export interface InventoryNode {
  locationId: string;
  productId: string;
  demand: number;
  leadTimeWeeks: number;
  holdingCost: number;
  serviceLevel: number;
  variability: number;
}

export interface InventoryOptimizationResult {
  productId: string;
  locationId: string;
  safetyStock: number;
  cycleStock: number;
  reorderPoint: number;
  totalCost: number;
}

export interface SafetyStockRecommendation {
  productId: string;
  recommendedSafetyStock: number;
  serviceLevel: number;
  currentPolicy: SafetyStockPolicy;
}
