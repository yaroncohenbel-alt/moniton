export type TariffType = 1 | 2 | 3;
export type VehicleType = "regular" | "large";

export interface TariffRates {
  name: string;
  nameHe: string;
  baseFare: number;
  perKm: number;
  perMinute: number;
  description: string;
}

export const TARIFF_RATES: Record<TariffType, TariffRates> = {
  1: {
    name: "Tariff 1",
    nameHe: "תעריף 1",
    baseFare: 13.20,
    perKm: 1.78,
    perMinute: 0.60,
    description: "ימים א׳-ה׳ 05:30–21:00",
  },
  2: {
    name: "Tariff 2",
    nameHe: "תעריף 2",
    baseFare: 13.20,
    perKm: 2.14,
    perMinute: 0.72,
    description: "ע״ש, שבת, חגים ולילה",
  },
  3: {
    name: "Tariff 3",
    nameHe: "תעריף 3",
    baseFare: 13.20,
    perKm: 2.49,
    perMinute: 0.84,
    description: "נסיעות מחוץ לעיר",
  },
};

export const LARGE_VEHICLE_SURCHARGE = 0.25;
export const BOOKING_FEE = 5.9;

// ── Official Israeli Ministry of Transport 2026 surcharge rates ──
export interface SurchargeKey {
  highway6: boolean;
  carmelTunnels: boolean;
  fastLane: boolean;
  airport: boolean;
  phoneOrder: boolean;
}

export const DEFAULT_SURCHARGES: SurchargeKey = {
  highway6: false,
  carmelTunnels: false,
  fastLane: false,
  airport: false,
  phoneOrder: false,
};

export const SURCHARGE_RATES: Record<
  keyof SurchargeKey,
  { labelHe: string; labelEn: string; amount: number; icon: string }
> = {
  highway6:      { labelHe: "כביש 6",          labelEn: "Highway 6",        amount: 6.50,  icon: "🛣️" },
  carmelTunnels: { labelHe: "מנהרות הכרמל",    labelEn: "Carmel Tunnels",   amount: 7.50,  icon: "🚇" },
  fastLane:      { labelHe: "נתיב המהיר",       labelEn: "Fast Lane",        amount: 9.50,  icon: "⚡" },
  airport:       { labelHe: "נתב\"ג",           labelEn: "Ben Gurion",       amount: 5.60,  icon: "✈️" },
  phoneOrder:    { labelHe: "הזמנה טלפונית",   labelEn: "Phone Order",      amount: 5.90,  icon: "📞" },
};

export function detectTariff(date: Date): TariffType {
  const day = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeDecimal = hour + minute / 60;

  const isFriday = day === 5;
  const isSaturday = day === 6;

  if (isSaturday) return 2;
  if (isFriday && timeDecimal >= 17) return 2;

  const isNighttime = timeDecimal < 5.5 || timeDecimal >= 21;
  if (isNighttime) return 2;

  return 1;
}

export interface FareResult {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  vehicleSurcharge: number;
  bookingFee: number;
  extraSurcharges: { key: string; amount: number }[];
  extraSurchargesTotal: number;
  total: number;
  tariff: TariffType;
  distanceKm: number;
  durationMinutes: number;
}

export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  tariff: TariffType,
  vehicle: VehicleType,
  isFutureBooking: boolean,
  surcharges: SurchargeKey = DEFAULT_SURCHARGES,
): FareResult {
  const rates = TARIFF_RATES[tariff];

  const baseFare = rates.baseFare;
  const distanceFare = rates.perKm * distanceKm;
  const timeFare = rates.perMinute * durationMinutes;
  const subtotal = baseFare + distanceFare + timeFare;

  const vehicleSurcharge = vehicle === "large" ? subtotal * LARGE_VEHICLE_SURCHARGE : 0;
  const bookingFee = isFutureBooking ? BOOKING_FEE : 0;

  // Build list of active surcharges
  const extraSurcharges: { key: string; amount: number }[] = [];
  for (const k of Object.keys(surcharges) as (keyof SurchargeKey)[]) {
    if (surcharges[k]) {
      extraSurcharges.push({ key: k, amount: SURCHARGE_RATES[k].amount });
    }
  }
  const extraSurchargesTotal = extraSurcharges.reduce((s, x) => s + x.amount, 0);

  const total = subtotal + vehicleSurcharge + bookingFee + extraSurchargesTotal;

  return {
    baseFare,
    distanceFare,
    timeFare,
    vehicleSurcharge,
    bookingFee,
    extraSurcharges,
    extraSurchargesTotal,
    total,
    tariff,
    distanceKm,
    durationMinutes,
  };
}
