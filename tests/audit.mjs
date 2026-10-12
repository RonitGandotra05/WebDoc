import { chromium } from '@playwright/test';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import fs from 'node:fs/promises';
const fixture = new Document({sections:[{children:[new Paragraph({children:[new TextRun({text:'Formatted sample',bold:true})]}),new Table({rows:[new TableRow({children:[new TableCell({children:[new Paragraph('Cell one')]}),new TableCell({children:[new Paragraph('Cell two')]})]})]})]}]});
await fs.writeFile('tests/artifacts/simple.docx',await Packer.toBuffer(fixture));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
await page.goto('http://127.0.0.1:5173');await page.locator('[contenteditable]').fill('Hello world sample');await page.keyboard.press('ControlOrMeta+a');await page.getByTitle('Bold (Ctrl+B)').click();
const report={blankEditor:await page.locator('[contenteditable]').count(),controls:[]};
for(const tab of ['Home','Insert','Layout','View']){await page.getByRole('button',{name:tab,exact:true}).click();report.controls.push({tab,buttons:await page.locator('.ribbon button').evaluateAll(bs=>bs.map(b=>({text:b.textContent.trim(),title:b.title,handler:b.outerHTML}))) });}
await page.screenshot({path:'tests/artifacts/before.png'});
for(const file of ['tests/artifacts/simple.docx','/Users/ronitgandotra/Documents/test(13)/document.docx']){const t=Date.now();await page.locator('input[type=file]').first().setInputFiles(file);await page.waitForTimeout(1800);report[file]={ms:Date.now()-t,editable:await page.locator('[contenteditable=true]').count(),pages:await page.locator('.virtual-page').count(),nodes:await page.locator('*').count(),text:(await page.locator('.status-bar').textContent())};}
await page.screenshot({path:'tests/artifacts/before-large.png'});report.errors=errors;await fs.writeFile('tests/artifacts/initial-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2).slice(-2000));await browser.close();
