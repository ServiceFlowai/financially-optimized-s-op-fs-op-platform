import { useMemo, useState } from "react";
import {
  AutoAcceptConfig,
  AutoAcceptDecision,
  BiasKpi,
  ForecastValueAdd,
  PlanningException,
  PlannerProductivityKpi,
} from "../types/planning";
import {
  calculateForecastValueAdd,
  derivePlannerProductivity,
  evaluateAutoAccept,
  monitorBias,
} from "../utils/exceptionPlanning";

export interface ExceptionPlanningState {
  config: AutoAcceptConfig;
  updateConfig: (delta: Partial<AutoAcceptConfig>) => void;
  exceptions: PlanningException[];
  autoAcceptDecisions: AutoAcceptDecision[];
  forecastValueAdds: ForecastValueAdd[];
  biasKpis: BiasKpi[];
  plannerProductivity: PlannerProductivityKpi[];
}

const DEFAULT_CONFIG: AutoAcceptConfig = {
  maxSeverity: 35,
  maxAbsoluteBias: 60,
  maxValueImpact: 8000,
};

const sampleExceptions: PlanningException[] = [
  {
    id: "EX-100",
    productId: "FG-100",
    plannerId: "planner-amy",
    type: "forecast",
    severity: 28,
    message: "Promo uplift within band",
    valueDifference: 5200,
    forecastBias: 45,
    baselineForecast: 620,
    finalForecast: 665,
    actualDemand: 640,
    createdAt: "2023-12-10T08:00:00.000Z",
    resolvedAt: "2023-12-10T10:30:00.000Z",
  },
  {
    id: "EX-101",
    productId: "PCBA-200",
    plannerId: "planner-luis",
    type: "capacity",
    severity: 42,
    message: "SMT line above 95%",
    valueDifference: 11500,
    forecastBias: 70,
    baselineForecast: 640,
    finalForecast: 610,
    actualDemand: 600,
    createdAt: "2023-12-11T07:30:00.000Z",
    resolvedAt: "2023-12-11T17:00:00.000Z",
    manualOverride: true,
  },
  {
    id: "EX-102",
    productId: "FG-210",
    plannerId: "planner-amy",
    type: "forecast",
    severity: 18,
    message: "NPI ramp deviation",
    valueDifference: 3200,
    forecastBias: 22,
    baselineForecast: 180,
    finalForecast: 220,
    actualDemand: 215,
    createdAt: "2023-12-12T09:15:00.000Z",
  },
  {
    id: "EX-103",
    productId: "OPT-700",
    plannerId: "planner-sue",
    type: "inventory",
    severity: 30,
    message: "Below safety stock threshold",
    valueDifference: 4200,
    forecastBias: -35,
    baselineForecast: 200,
    finalForecast: 210,
    actualDemand: 195,
    createdAt: "2023-12-12T06:45:00.000Z",
    resolvedAt: "2023-12-12T08:00:00.000Z",
  },
];

export const useExceptionPlanning = (): ExceptionPlanningState => {
  const [config, setConfig] = useState<AutoAcceptConfig>(DEFAULT_CONFIG);

  const autoAcceptDecisions = useMemo<AutoAcceptDecision[]>(() => {
    return evaluateAutoAccept(sampleExceptions, config);
  }, [config]);

  const forecastValueAdds = useMemo<ForecastValueAdd[]>(() => {
    return calculateForecastValueAdd(sampleExceptions);
  }, []);

  const biasKpis = useMemo<BiasKpi[]>(() => {
    return Object.values(monitorBias(sampleExceptions));
  }, []);

  const plannerProductivity = useMemo<PlannerProductivityKpi[]>(() => {
    return derivePlannerProductivity(sampleExceptions, autoAcceptDecisions);
  }, [autoAcceptDecisions]);

  const updateConfig = (delta: Partial<AutoAcceptConfig>) => {
    setConfig((prev) => ({ ...prev, ...delta }));
  };

  return {
    config,
    updateConfig,
    exceptions: sampleExceptions,
    autoAcceptDecisions,
    forecastValueAdds,
    biasKpis,
    plannerProductivity,
  };
};
