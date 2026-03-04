import {
  AutoAcceptConfig,
  AutoAcceptDecision,
  BiasKpi,
  ForecastValueAdd,
  PlanningException,
  PlannerProductivityKpi,
} from "../types/planning";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const evaluateAutoAccept = (
  exceptions: PlanningException[],
  config: AutoAcceptConfig
): AutoAcceptDecision[] => {
  return exceptions.map((exception) => {
    const withinSeverity = exception.severity <= config.maxSeverity;
    const withinBias = Math.abs(exception.forecastBias) <= config.maxAbsoluteBias;
    const withinValue = Math.abs(exception.valueDifference) <= config.maxValueImpact;

    if (withinSeverity && withinBias && withinValue) {
      return {
        exceptionId: exception.id,
        accepted: true,
        reason: "Within configured auto-accept thresholds",
      };
    }
    const reasons: string[] = [];
    if (!withinSeverity) reasons.push(`severity ${exception.severity} > ${config.maxSeverity}`);
    if (!withinBias) reasons.push(`bias ${exception.forecastBias.toFixed(2)} > ${config.maxAbsoluteBias}`);
    if (!withinValue) reasons.push(`value impact ${exception.valueDifference.toFixed(2)} > ${config.maxValueImpact}`);

    return {
      exceptionId: exception.id,
      accepted: false,
      reason: reasons.join("; "),
    };
  });
};

export const calculateForecastValueAdd = (exceptions: PlanningException[]): ForecastValueAdd[] => {
  return exceptions.map((exception) => {
    const baselineError = Math.abs(exception.actualDemand - exception.baselineForecast);
    const finalError = Math.abs(exception.actualDemand - exception.finalForecast);
    return {
      productId: exception.productId,
      plannerId: exception.plannerId,
      baselineError,
      finalError,
      valueAdd: Number((baselineError - finalError).toFixed(2)),
    };
  });
};

export const monitorBias = (exceptions: PlanningException[]): BiasKpi[] => {
  return exceptions.reduce<Record<string, BiasKpi>>((acc, exception) => {
    const existing = acc[exception.productId];
    const biasDelta = exception.finalForecast - exception.actualDemand;
    const normalizedBias = Number(biasDelta.toFixed(2));
    if (!existing) {
      acc[exception.productId] = {
        productId: exception.productId,
        bias: normalizedBias,
        biasChange: normalizedBias - exception.forecastBias,
      };
    } else {
      const combinedBias = (existing.bias + normalizedBias) / 2;
      acc[exception.productId] = {
        productId: exception.productId,
        bias: Number(combinedBias.toFixed(2)),
        biasChange: Number((combinedBias - exception.forecastBias).toFixed(2)),
      };
    }
    return acc;
  }, {});
};

export const derivePlannerProductivity = (
  exceptions: PlanningException[],
  decisions: AutoAcceptDecision[]
): PlannerProductivityKpi[] => {
  const decisionMap = new Map(decisions.map((decision) => [decision.exceptionId, decision]));

  const grouped = exceptions.reduce<Record<string, PlannerProductivityKpi>>((acc, exception) => {
    const existing = acc[exception.plannerId] ?? {
      plannerId: exception.plannerId,
      exceptionsReviewed: 0,
      autoAccepted: 0,
      manualActions: 0,
      elapsedHours: 0,
      autoAcceptRate: 0,
    };

    const decision = decisionMap.get(exception.id);
    const autoAccepted = decision?.accepted ?? false;

    existing.exceptionsReviewed += 1;
    if (autoAccepted) {
      existing.autoAccepted += 1;
    } else {
      existing.manualActions += 1;
    }

    const cycleTimeHours = exception.resolvedAt
      ? (new Date(exception.resolvedAt).getTime() - new Date(exception.createdAt).getTime()) /
        (1000 * 60 * 60)
      : 0.5; // assume 30 minutes default effort if unresolved

    existing.elapsedHours += clamp(cycleTimeHours, 0, 24);
    acc[exception.plannerId] = existing;
    return acc;
  }, {});

  return Object.values(grouped).map((kpi) => ({
    ...kpi,
    autoAcceptRate: Number(((kpi.autoAccepted / Math.max(kpi.exceptionsReviewed, 1)) * 100).toFixed(2)),
    elapsedHours: Number(kpi.elapsedHours.toFixed(2)),
  }));
};
