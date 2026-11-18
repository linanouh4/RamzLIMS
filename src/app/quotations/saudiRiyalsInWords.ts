const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
const scales = [
  ["ألف", "ألفان", "آلاف"],
  ["مليون", "مليونان", "ملايين"],
  ["مليار", "ملياران", "مليارات"],
  ["تريليون", "تريليونان", "تريليونات"],
];
const join = (parts: string[]) => parts.filter(Boolean).join(" و");

function belowThousand(n: number, feminine: boolean) {
  const unit = n % 10;
  const rest = n % 100;
  const digit = feminine ? ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثماني", "تسع"][unit] : ones[unit];
  let words = digit;
  if (rest === 10) words = feminine ? "عشر" : "عشرة";
  else if (rest === 11) words = feminine ? "إحدى عشرة" : "أحد عشر";
  else if (rest === 12) words = feminine ? "اثنتا عشرة" : "اثنا عشر";
  else if (rest < 20 && rest > 12) words = digit + (feminine ? " عشرة" : " عشر");
  else if (rest >= 20) words = join([digit, tens[Math.floor(rest / 10)]]);
  return join([hundreds[Math.floor(n / 100)], words]);
}

function integerWords(n: number, feminine = false) {
  const groups = [belowThousand(n % 1000, feminine)];
  let remaining = Math.floor(n / 1000);
  for (const [single, dual, plural] of scales) {
    const group = remaining % 1000;
    if (group) {
      const suffix = group <= 10 ? plural : " " + single;
      groups.unshift(group === 1 ? single : group === 2 ? dual : belowThousand(group, false) + " " + suffix.trim());
    }
    remaining = Math.floor(remaining / 1000);
  }
  return join(groups) || "صفر";
}

function currency(n: number, forms: [string, string, string, string], feminine = false): string {
  const [single, dual, plural, accusative] = forms;
  if (n === 1) return single + (feminine ? " واحدة" : " واحد");
  if (n === 2) return dual;
  const last = n % 100;
  if (n > 100 && (last === 1 || last === 2)) {
    return join([integerWords(n - last), currency(last, forms, feminine)]);
  }
  return integerWords(n, feminine) + " " + (last >= 3 && last <= 10 ? plural : last >= 11 ? accusative : single);
}

export function saudiRiyalsInWords(amount: number) {
  const rounded = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(rounded) || rounded < 0) return null;
  const riyals = Math.floor(rounded / 100);
  const halalas = rounded % 100;
  return "فقط " + join([
    riyals || !halalas ? currency(riyals, ["ريال سعودي", "ريالان سعوديان", "ريالات سعودية", "ريالًا سعوديًا"]) : "",
    halalas ? currency(halalas, ["هللة", "هللتان", "هللات", "هللةً"], true) : "",
  ]) + " لا غير";
}
