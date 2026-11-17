import { PDFDocument } from "./pdf-lib.esm.min.mjs";
import { renderResults } from "./render.mjs";
export function selectedPages(input, total) {
    const pages = new Set();
    for (const part of input.split(/[,،]/)) {
        const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part.trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)));
        const start = Number(match?.[1]), end = Number(match?.[2] ?? start);
        if (!match || start < 1 || end < start || end > total)
            throw Error("Invalid page selection / تحققي من أرقام الصفحات");
        for (let i = start; i <= end; i++)
            pages.add(i - 1);
    }
    return [...pages].sort((a, b) => a - b);
}
export async function buildReport(file, selection, pngData, left, bottom, mm) {
    const full = await PDFDocument.load(await file.arrayBuffer());
    const chosen = selectedPages(selection, full.getPageCount());
    const publicPdf = await PDFDocument.create();
    const png = await full.embedPng(pngData);
    const size = mm * 72 / 25.4;
    if (![left, bottom, mm].every(Number.isFinite) || mm < 18 || mm > 45 || left < 0 || bottom < 0)
        throw Error("Invalid QR placement / تحققي من موضع الرمز");
    for (const index of chosen) {
        const page = full.getPage(index), box = page.getCropBox();
        const x = box.x + box.width * left / 100, y = box.y + box.height * bottom / 100;
        if (x + size > box.x + box.width || y + size > box.y + box.height)
            throw Error("QR outside page / الرمز خارج الصفحة");
        page.drawImage(png, { x, y, width: size, height: size });
    }
    const fullBytes = new Uint8Array(await full.save());
    if (fullBytes.length > 8 * 1024 * 1024)
        throw Error("Maximum issued PDF size: 8 MiB / الحد الأقصى ٨ ميجابايت");
    await renderResults(fullBytes.slice(), chosen, async (image, w, h) => {
        const target = publicPdf.addPage([w, h]);
        target.drawImage(await publicPdf.embedJpg(image), { x: 0, y: 0, width: w, height: h });
    });
    const blobs = [new Blob([fullBytes.buffer], { type: "application/pdf" }),
        new Blob([new Uint8Array(await publicPdf.save()).buffer], { type: "application/pdf" })];
    if (blobs.some(b => b.size > 8 * 1024 * 1024))
        throw Error("Maximum PDF size: 8 MiB / الحد الأقصى ٨ ميجابايت");
    return { full: blobs[0], results: blobs[1] };
}
