export type SummaryReport = {
  byType: Array<{ materialTypeName: string; totalKg: number; count: number }>;
  byRegion: Array<{ city: string; totalKg: number; count: number }>;
  byDriver: Array<{ driverName: string; totalKg: number; count: number }>;
};

export type EfficiencyReport = {
  summary: {
    totalFinishedRoutes: number;
    totalHours: number;
    totalDistanceKm: number;
    avgSpeedKmh: number;
  };
  byDriver: Array<{
    driverName: string;
    totalRoutes: number;
    totalHours: number;
    totalDistanceKm: number;
    totalWeightKg: number;
  }>;
};

export type SustainabilityReport = {
  totalWeightCollectedKg: number;
  totalCo2AvoidedKg: number;
  totalCo2AvoidedTons: number;
  byMaterial: Array<{ material: string; weightKg: number; co2SavedKg: number }>;
};

export type OverviewReport = {
  period: { startDate: string | null; endDate: string | null; label: string };
  totalWeightCollectedKg: number;
  totalCo2AvoidedKg: number;
  totalFinishedRoutes: number;
  totalDistanceKm: number;
  totalCollections: number;
};
