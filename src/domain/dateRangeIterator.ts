export interface SriDateStep {
  year: string;
  month: string; // 1-12 sin cero a la izquierda para selectores de SRI
  day: string; // 1-31 sin cero a la izquierda para selectores de SRI
  isoString: string; // YYYY-MM-DD
  formattedLabel: string; // DD/MM/YYYY
}

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

/**
 * Parsea un string ISO (YYYY-MM-DD) y extrae componentes listos para los formularios del SRI.
 */
export function parseIsoDate(isoDateStr: string): SriDateStep | null {
  if (!isoDateStr || typeof isoDateStr !== 'string') return null;
  const match = isoDateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const yearNum = parseInt(match[1], 10);
  const monthNum = parseInt(match[2], 10);
  const dayNum = parseInt(match[3], 10);

  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const isoString = `${yearNum}-${pad(monthNum)}-${pad(dayNum)}`;
  const formattedLabel = `${pad(dayNum)}/${pad(monthNum)}/${yearNum}`;

  return {
    year: yearNum.toString(),
    month: monthNum.toString(),
    day: dayNum.toString(),
    isoString,
    formattedLabel,
  };
}

/**
 * Genera una secuencia ordenada de días comprendidos entre startDate y endDate (ambos inclusive).
 */
export function generateDateRangeSteps(startDate: string, endDate: string): SriDateStep[] {
  const startParsed = parseIsoDate(startDate);
  const endParsed = parseIsoDate(endDate);

  if (!startParsed || !endParsed) {
    return [];
  }

  let startUtc = Date.UTC(
    parseInt(startParsed.year, 10),
    parseInt(startParsed.month, 10) - 1,
    parseInt(startParsed.day, 10)
  );

  let endUtc = Date.UTC(
    parseInt(endParsed.year, 10),
    parseInt(endParsed.month, 10) - 1,
    parseInt(endParsed.day, 10)
  );

  // Si las fechas están invertidas, corregir automáticamente
  if (startUtc > endUtc) {
    const temp = startUtc;
    startUtc = endUtc;
    endUtc = temp;
  }

  const steps: SriDateStep[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;
  let currentUtc = startUtc;

  // Límite de seguridad: máximo 366 días continuos por ejecución
  let count = 0;
  while (currentUtc <= endUtc && count < 366) {
    const d = new Date(currentUtc);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const isoString = `${y}-${pad(m)}-${pad(day)}`;
    const formattedLabel = `${pad(day)}/${pad(m)}/${y}`;

    steps.push({
      year: y.toString(),
      month: m.toString(),
      day: day.toString(),
      isoString,
      formattedLabel,
    });

    currentUtc += oneDayMs;
    count++;
  }

  return steps;
}

/**
 * Retorna el rango por defecto: desde el primer día del mes actual hasta el día de hoy.
 */
export function getDefaultDateRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(day)}`,
  };
}
