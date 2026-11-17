import {getDocument, GlobalWorkerOptions} from "./pdf.min.mjs";
const assets=new URL(".",import.meta.url).href;
GlobalWorkerOptions.workerSrc=assets+"pdf.worker.min.mjs";

// Render visible page content, including visible signatures and stamps, without
// transferring the original PDF's links, attachments, or hidden text.
export async function renderResults(bytes,indices,onPage) {
  const task=getDocument({data:bytes, isEvalSupported:false, useSystemFonts:true,
    standardFontDataUrl:assets+"standard_fonts/", cMapUrl:assets+"cmaps/",cMapPacked:true,
    wasmUrl:assets+"wasm/",iccUrl:assets+"iccs/"});
  try{
    const doc=await task.promise;
    for(const index of indices){
      const page=await doc.getPage(index+1);
      const original=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:Math.min(2.5,2600/Math.max(original.width,original.height))});
      const canvas=document.createElement("canvas");
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      try{
        await page.render({canvas,viewport,background:"white"}).promise;
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("PDF page rendering failed")),"image/jpeg",0.94));
        await onPage(new Uint8Array(await blob.arrayBuffer()),original.width,original.height);
      }finally{canvas.width=0;canvas.height=0;page.cleanup();}
    }
  }finally{await task.destroy();}
}
