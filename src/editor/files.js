import JSZip from "jszip";
import { fonts } from "./fonts";
import { Document, Packer, Paragraph } from "docx";
export const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export async function blankDocument() {
  return new File(
    [
      await Packer.toBlob(
        new Document({
          styles: {
            default: { document: { run: { font: "Calibri", size: 22 } } },
          },
          sections: [
            {
              properties: {
                page: {
                  size: { width: 12240, height: 15840 },
                  margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
                },
              },
              children: [new Paragraph("")],
            },
          ],
        }),
      ),
    ],
    "Document1.docx",
    { type: DOCX_TYPE },
  );
}
export async function validateDocx(file) {
  if (!file || !/\.docx$/i.test(file.name))
    throw new Error(
      "Choose a .docx document. Legacy .doc and PDF files are not editable here.",
    );
  if (!file.size)
    throw new Error(
      "The selected file is empty or no longer exists at that location.",
    );
  if (file.size > 50 * 1024 * 1024)
    throw new Error("This editor accepts DOCX files up to 50 MB.");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch (error) {
    throw new Error(
      "This file is not a readable DOCX archive. " + error.message,
    );
  }
  if (!zip.file("word/document.xml") || !zip.file("[Content_Types].xml"))
    throw new Error("The archive is missing required DOCX document parts.");
  const parts = Object.keys(zip.files);
  if (parts.length > 10000)
    throw new Error(
      "This DOCX contains too many package parts for safe browser editing.",
    );
  const xml = await zip.file("word/document.xml").async("string");
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  if (
    parsed.querySelector("parsererror") ||
    !parsed.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      "body",
    ).length
  )
    throw new Error(
      "The DOCX document XML is malformed or has no document body.",
    );
  const notices = [
    "Local substitute fonts are used for Calibri, Arial, and Times New Roman. Courier New uses an installed font when available, with a local fallback. Layout can differ from Word; keep your original for comparison.",
  ];
  if (/<(?:\w+:)?(?:altChunk|object|pict|smartTag)\b/.test(xml))
    notices.push(
      "Legacy drawings, embedded objects, or alternate content were detected. Their editing and rendering may be limited.",
    );
  if (/<(?:\w+:)?oMath\b/.test(xml))
    notices.push(
      "This document contains equations. Native equation authoring is not available.",
    );
  if (parts.some((p) => /vbaProject|embeddings\//i.test(p)))
    notices.push(
      "Embedded files or macros are retained only where the engine supports them; they are never executed.",
    );
  return notices;
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// docx-preview ignores direct w:pageBreakBefore. Normalize a transient print copy
// to explicit breaks; the editable package and exported bytes are never changed.
export async function preparePrintDocument(blob) {
  const bytes = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml").async("string");
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  let changed = false;
  for (const paragraph of parsed.getElementsByTagNameNS(ns, "p")) {
    const properties = [...paragraph.children].find(
      (node) => node.localName === "pPr",
    );
    const before = properties?.getElementsByTagNameNS(ns, "pageBreakBefore")[0];
    if (
      !before ||
      ["false", "0", "off"].includes(before.getAttributeNS(ns, "val"))
    )
      continue;
    const run = parsed.createElementNS(ns, "w:r"),
      br = parsed.createElementNS(ns, "w:br");
    br.setAttributeNS(ns, "w:type", "page");
    run.append(br);
    paragraph.insertBefore(run, properties.nextSibling);
    changed = true;
  }
  if (!changed) return bytes;
  zip.file("word/document.xml", new XMLSerializer().serializeToString(parsed));
  return zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
}
// Render every page for printing independently of the editor's windowed paint surface.
export async function printDocument(blob) {
  const frame = document.createElement("iframe");
  frame.title = "Document print preview";
  frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px";
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    "<!doctype html><html><head><title>Print document</title></head><body></body></html>",
  );
  doc.close();
  try {
    const { renderAsync } = await import("docx-preview");
    await renderAsync(await preparePrintDocument(blob), doc.body, doc.head, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    });
    const style = doc.createElement("style");
    style.textContent =
      "@page{margin:0}body{margin:0}.docx-wrapper{padding:0!important;background:white!important}.docx-wrapper>section.docx{box-shadow:none!important;margin:0!important;break-after:page}.docx-wrapper>section.docx:last-child{break-after:auto}";
    doc.head.append(style);
    for (const [logical, physical] of Object.entries(fonts.map)) {
      const family = fonts.families.find((entry) => entry.family === physical);
      for (const face of family.faces) {
        const font = new frame.contentWindow.FontFace(
          logical,
          `url("${face.source}")`,
          { weight: String(face.weight), style: face.style },
        );
        doc.fonts.add(font);
        await font.load();
      }
    }
    await doc.fonts.ready;
    await Promise.all(
      [...doc.images].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            }),
      ),
    );
    frame.contentWindow.addEventListener("afterprint", () => frame.remove(), {
      once: true,
    });
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 60000);
  } catch (error) {
    frame.remove();
    throw error;
  }
}
