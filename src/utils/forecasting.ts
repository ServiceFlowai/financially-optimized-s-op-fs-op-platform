import {
  DemandSignal,
  ForecastConfig,
  ForecastMetrics,
  ForecastOutput,
  ForecastSeriesPoint,
  HistoricalDemandPoint,
  NpiProfile,
  Product,
  PromotionEvent,
  SegmentationResult,
} from "../types/planning";
import { addWeeks, currentIsoDate, toDate, toIsoDate } from "./dates";

interface BaselineOptions {
  npiProfile?: NpiProfile;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const ensureSortedHistory = (history: HistoricalDemandPoint[]): HistoricalDemandPoint[] =>
  [...history].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());

/**
 * Generates a baseline forecast using single exponential smoothing. Falls back to NPI ramp
 * when historical data is unavailable for a given product.
 */
export const generateBaselineForecast = (
  history: HistoricalDemandPoint[],
  config: ForecastConfig,
  options: BaselineOptions = {}
): ForecastSeriesPoint[] => {
  const sorted = ensureSortedHistory(history);
  const horizon = Math.max(1, Math.round(config.horizonWeeks));

  // If no historical data and an NPI profile is supplied, use ramp-based forecast.
  if (!sorted.length && options.npiProfile) {
    const { rampWeeks, rampCurve, targetVolume } = options.npiProfile;
    const baseline: ForecastSeriesPoint[] = [];
    const today = currentIsoDate();
    const effectiveWeeks = Math.max(rampWeeks, rampCurve.length, horizon);
    for (let i = 0; i < Math.min(horizon, effectiveWeeks); i += 1) {
      const curveFactor = rampCurve[i] ?? rampCurve[rampCurve.length - 1] ?? 1;
      baseline.push({
        date: addWeeks(today, i + 1),
        quantity: Number((targetVolume * curveFactor).toFixed(2)),
        source: "baseline",
      });
    }
    return baseline;
  }

  if (!sorted.length) {
    // Default to flat forecast of zero to avoid blowing up downstream math.
    const today = currentIsoDate();
    return Array.from({ length: horizon }, (_, idx) => ({
      date: addWeeks(today, idx + 1),
      quantity: 0,
      source: "baseline",
    }));
  }

  const alpha = clamp(config.smoothingAlpha, 0.01, 0.99);
  let smoothed = sorted[0].quantity;
  sorted.forEach((point) => {
    smoothed = alpha * point.quantity + (1 - alpha) * smoothed;
  });

  const lastHistoricalDate = sorted[sorted.length - 1]?.date ?? currentIsoDate();
  const baseline: ForecastSeriesPoint[] = [];
  let projected = smoothed;
  for (let i = 0; i < horizon; i += 1) {
    projected = alpha * projected + (1 - alpha) * smoothed;
    baseline.push({
      date: addWeeks(lastHistoricalDate, i + 1),
      quantity: Number(Math.max(projected, 0).toFixed(2)),
      source: "baseline",
    });
  }

  return baseline;
};

/** Applies promotional uplifts on top of baseline forecasts with configurable caps. */
export const applyPromotionalModeling = (
  baseline: ForecastSeriesPoint[],
  productId: string,
  promotions: PromotionEvent[],
  promoUpliftCap: number
): ForecastSeriesPoint[] => {
  if (!promotions.length) {
    return baseline.map((point) => ({ ...point, source: "promo-adjusted" }));
  }

  return baseline.map((point) => {
    const pointDate = toDate(point.date);
    const uplift = promotions
      .filter((promo) => promo.productId === productId)
      .filter((promo) => {
        const start = toDate(promo.startDate);
        const end = toDate(promo.endDate);
        return pointDate.getTime() >= start.getTime() && pointDate.getTime() <= end.getTime();
      })
      .reduce((acc, promo) => acc + promo.upliftPercentage, 0);

    const cappedUplift = clamp(uplift, 0, promoUpliftCap);
    return {
      date: point.date,
      quantity: Number((point.quantity * (1 + cappedUplift)).toFixed(2)),
      source: "promo-adjusted",
    };
  });
};

/** Applies near-term demand sensing based on weighted external signals. */
export const applyDemandSensing = (
  promoAdjusted: ForecastSeriesPoint[],
  signals: DemandSignal[],
  weight: number
): ForecastSeriesPoint[] => {
  if (!signals.length || weight <= 0) {
    return promoAdjusted.map((point) => ({ ...point, source: "sensed" }));
  }

  const demandSensingWeight = clamp(weight, 0, 1);
  const aggregatedSignals = signals.reduce<Record<string, { total: number; weight: number }>>(
    (acc, signal) => {
      const entry = acc[signal.date] ?? { total: 0, weight: 0 };
      entry.total += signal.value * signal.weight;
      entry.weight += signal.weight;
      acc[signal.date] = entry;
      return acc;
    },
    {}
  );

  return promoAdjusted.map((point, index) => {
    const signalEntry = aggregatedSignals[point.date];
    if (!signalEntry || signalEntry.weight === 0) {
      // Decay sensitivity deeper into the horizon even without signals.
      const decayFactor = Math.exp(-index / 6);
      return {
        ...point,
        quantity: Number((point.quantity * (1 - demandSensingWeight * (1 - decayFactor))).toFixed(2)),
        source: "sensed",
      };
    }

    const sensedAdjustment = (signalEntry.total / signalEntry.weight) / Math.max(point.quantity || 1, 1);
    const normalizedSignal = clamp(sensedAdjustment - 1, -0.4, 0.6);
    const adjustedQuantity = point.quantity * (1 + demandSensingWeight * normalizedSignal);
    return {
      date: point.date,
      quantity: Number(Math.max(adjustedQuantity, 0).toFixed(2)),
      source: "sensed",
    };
  });
};

/** Calculates MAPE and bias using one-step-ahead exponential smoothing back-testing. */
export const calculateForecastMetrics = (history: HistoricalDemandPoint[]): ForecastMetrics => {
  if (history.length < 3) {
    return { mape: 0, bias: 0 };
  }

  const sorted = ensureSortedHistory(history);
  let forecast = sorted[0].quantity;
  const alpha = 0.3;
  let mapeAccumulator = 0;
  let biasAccumulator = 0;
  let count = 0;

  for (let i = 1; i < sorted.length; i += 1) {
    const actual = sorted[i].quantity;
    const error = actual - forecast;
    if (actual !== 0) {
      mapeAccumulator += Math.abs(error / actual);
    }
    biasAccumulator += error;
    count += 1;
    forecast = forecast + alpha * (actual - forecast);
  }

  return {
    mape: Number(((mapeAccumulator / Math.max(count, 1)) * 100).toFixed(2)),
    bias: Number((biasAccumulator / Math.max(count, 1)).toFixed(2)),
  };
};

/** Performs ABC/XYZ segmentation across the supplied product catalog and history. */
export const performSegmentation = (
  products: Product[],
  histories: Record<string, HistoricalDemandPoint[]>
): Record<string, SegmentationResult> => {
  const revenueByProduct = new Map<string, number>();
  const variabilityByProduct = new Map<string, number>();

  products.forEach((product) => {
    const productHistory = histories[product.id] ?? [];
    const revenue = productHistory.reduce((sum, point) => sum + point.quantity * product.unitCost, 0);
    revenueByProduct.set(product.id, revenue);

    const mean = productHistory.reduce((sum, point) => sum + point.quantity, 0) / (productHistory.length || 1);
    if (productHistory.length <= 1 || mean === 0) {
      variabilityByProduct.set(product.id, Infinity);
    } else {
      const variance =
        productHistory.reduce((sum, point) => sum + (point.quantity - mean) ** 2, 0) /
        (productHistory.length - 1);
      const coefficient = Math.sqrt(variance) / mean;
      variabilityByProduct.set(product.id, coefficient);
    }
  });

  const sortedByRevenue = [...revenueByProduct.entries()].sort((a, b) => b[1] - a[1]);
  const totalRevenue = sortedByRevenue.reduce((sum, [, value]) => sum + value, 0) || 1;

  let cumulative = 0;
  const abcClasses = new Map<string, ABCClass>();
  sortedByRevenue.forEach(([productId, revenue]) => {
    cumulative += revenue;
    const share = cumulative / totalRevenue;
    if (share <= 0.8) {
      abcClasses.set(productId, "A");
    } else if (share <= 0.95) {
      abcClasses.set(productId, "B");
    } else {
      abcClasses.set(productId, "C");
    }
  });

  const segmentation: Record<string, SegmentationResult> = {};
  products.forEach((product) => {
    const cv = variabilityByProduct.get(product.id) ?? Infinity;
    const xyzClass: XYZClass = cv <= 0.5 ? "X" : cv <= 1 ? "Y" : "Z";
    const abcClass = abcClasses.get(product.id) ?? "C";
    segmentation[product.id] = { productId: product.id, abcClass, xyzClass };
  });

  return segmentation;
};

interface ForecastingPipelineParams {
  product: Product;
  history: HistoricalDemandPoint[];
  config: ForecastConfig;
  promotions: PromotionEvent[];
  signals: DemandSignal[];
  npiProfile?: NpiProfile;
}

export const buildForecastPipeline = ({
  product,
  history,
  config,
  promotions,
  signals,
  npiProfile,
}: ForecastingPipelineParams): Omit<ForecastOutput, "segmentation" | "metrics"> => {
  const baseline = generateBaselineForecast(history, config, { npiProfile });
  const promoAdjusted = applyPromotionalModeling(baseline, product.id, promotions, config.promoUpliftCap);
  const sensed = applyDemandSensing(promoAdjusted, signals, config.demandSensingWeight);
  return {
    productId: product.id,
    baseline,
    promoAdjusted,
    sensed,
  };
};
