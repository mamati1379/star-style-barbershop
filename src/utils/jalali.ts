/**
 * Simple, self-contained precise algorithm to convert Gregorian Date to Persian Shamsi (Jalali)
 */
export function toJalali(dateInput: Date | string): { jYear: number; jMonth: number; jDay: number; timeString: string } {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { jYear: 1405, jMonth: 1, jDay: 1, timeString: "00:00" };
  }
  
  const g_y = date.getFullYear();
  const g_m = date.getMonth() + 1;
  const g_d = date.getDate();

  const g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const j_days_in_month = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

  // check if leap year
  const isGregorianLeap = (g_y % 4 === 0 && g_y % 100 !== 0) || (g_y % 400 === 0);
  if (isGregorianLeap) g_days_in_month[2] = 29;

  let gy = g_y - 1600;
  let gm = g_m - 1;
  let gd = g_d - 1;

  let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

  for (let i = 0; i < gm; ++i) {
    g_day_no += g_days_in_month[i + 1];
  }
  g_day_no += gd;

  let j_day_no = g_day_no - 79;

  const j_np = Math.floor(j_day_no / 12053);
  j_day_no = j_day_no % 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  let i = 0;
  for (i = 0; i < 12 && j_day_no >= j_days_in_month[i + 1]; ++i) {
    j_day_no -= j_days_in_month[i + 1];
  }

  const jm = i + 1;
  const jd = j_day_no + 1;

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const timeString = `${hours}:${minutes}`;

  return { jYear: jy, jMonth: jm, jDay: jd, timeString };
}

export function formatJalali(dateInput: Date | string, includeTime = true): string {
  try {
    const { jYear, jMonth, jDay, timeString } = toJalali(dateInput);
    const months = [
      "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
      "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
    ];
    const monthName = months[jMonth - 1] || "";
    const fYear = jYear.toString();
    const fDay = jDay.toString();
    
    if (includeTime) {
      return `${fDay} ${monthName} ${fYear} ساعت ${timeString}`;
    }
    return `${fDay} ${monthName} ${fYear}`;
  } catch (err) {
    return String(dateInput);
  }
}

export function toPersianDigits(num: number | string): string {
  const pDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => pDigits[parseInt(x, 10)]);
}
