import QRCode from "qrcode";

export async function prepareReport(file: File, pages: string, url: string, left: number, bottom: number, mm: number): Promise<{full: Blob; results: Blob}> {
  const moduleUrl = "/report-reader-5.6.205/build.mjs";
  const {buildReport} = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ moduleUrl);
  const png = await QRCode.toDataURL(url, {width:640, margin:4, errorCorrectionLevel:"M"});
  return buildReport(file, pages, png, left, bottom, mm);
}

export function base64(blob: Blob): Promise<string> {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(",")[1]);
    reader.onerror=()=>reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
