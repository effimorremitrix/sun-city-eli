export const isValidIsraeliPhone = (raw: string) => {
  const digits = raw.replace(/[^\d]/g, "");
  if (/^0(5\d|[23489]|7\d)\d{7}$/.test(digits)) return true; // 0501234567 / 037654321 / 0731234567
  if (/^972(5\d|[23489]|7\d)\d{7}$/.test(digits)) return true;
  return false;
};

export const phoneError = "נא להזין מספר טלפון ישראלי תקין (לדוגמה 050-1234567)";
