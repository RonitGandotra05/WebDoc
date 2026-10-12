import JSZip from 'jszip';
import { Document, Packer, Paragraph } from 'docx';
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export async function blankDocument() {
  return new File([await Packer.toBlob(new Document({styles:{default:{document:{run:{font:'Calibri',size:22}}}},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:[new Paragraph('')]}]}))], 'Document1.docx', {type:DOCX_TYPE});
}
export async function validateDocx(file) {
  if (!file || !/\.docx$/i.test(file.name)) throw new Error('Choose a .docx document. Legacy .doc and PDF files are not editable here.');
  if (file.size > 50 * 1024 * 1024) throw new Error('This editor accepts DOCX files up to 50 MB.');
  let zip;
  try { zip = await JSZip.loadAsync(file); } catch { throw new Error('This file is not a readable DOCX archive. It may be corrupted or password-protected.'); }
  if (!zip.file('word/document.xml') || !zip.file('[Content_Types].xml')) throw new Error('The archive is missing required DOCX document parts.');
  const parts = Object.keys(zip.files);
  const xml = await zip.file('word/document.xml').async('string');
  const notices = ['Page layout can differ from Word when fonts are unavailable. Keep your original file for comparison.'];
  if (/<(?:\w+:)?(?:altChunk|object|pict|smartTag)\b/.test(xml)) notices.push('Legacy drawings, embedded objects, or alternate content were detected. Their editing and rendering may be limited.');
  if (/<(?:\w+:)?oMath\b/.test(xml)) notices.push('This document contains equations. Native equation authoring is not available.');
  if (parts.some(p=>/vbaProject|embeddings\//i.test(p))) notices.push('Embedded files or macros are retained only where the engine supports them; they are never executed.');
  return notices;
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// Render every page for printing independently of the editor's windowed paint surface.
export async function printDocument(blob) {
  const frame=document.createElement('iframe');frame.title='Document print preview';frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px';document.body.append(frame);
  const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><title>Print document</title></head><body></body></html>');doc.close();
  try {
    const { renderAsync }=await import('docx-preview');
    await renderAsync(await blob.arrayBuffer(),doc.body,doc.head,{inWrapper:true,ignoreWidth:false,ignoreHeight:false,breakPages:true,ignoreLastRenderedPageBreak:false,useBase64URL:true,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true});
    const style=doc.createElement('style');style.textContent='@page{margin:0}body{margin:0}.docx-wrapper{padding:0!important;background:white!important}.docx-wrapper>section.docx{box-shadow:none!important;margin:0!important;break-after:page}.docx-wrapper>section.docx:last-child{break-after:auto}';doc.head.append(style);
    await doc.fonts.ready;await Promise.all([...doc.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;})));
    frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);
  } catch(error){frame.remove();throw error;}
}
