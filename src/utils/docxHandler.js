import { renderAsync } from 'docx-preview';
import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType,
    ImageRun, PageBreak
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Import a DOCX file and render it as HTML
 * This version preserves all formatting by keeping docx-preview styles
 */
export async function importDocx(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;

                // Create containers for rendering
                const bodyContainer = document.createElement('div');
                const styleContainer = document.createElement('div');

                bodyContainer.className = 'docx-body-container';
                styleContainer.className = 'docx-style-container';

                // Render DOCX to HTML using docx-preview with full options
                await renderAsync(arrayBuffer, bodyContainer, styleContainer, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    experimental: true,
                    trimXmlDeclaration: true,
                    useBase64URL: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                    debug: false,
                });

                // Extract styles from the style container
                const styles = styleContainer.innerHTML;

                // Extract body content with wrapper for proper structure
                const bodyHtml = bodyContainer.innerHTML;

                // Return both styles and content
                resolve({
                    html: bodyHtml,
                    styles: styles,
                    fullHtml: `<style>${extractCssText(styleContainer)}</style>${bodyHtml}`
                });
            } catch (error) {
                console.error('DOCX Import Error:', error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Extract CSS text from style elements
 */
function extractCssText(styleContainer) {
    let css = '';
    const styleElements = styleContainer.querySelectorAll('style');
    styleElements.forEach(style => {
        css += style.textContent + '\n';
    });
    return css;
}

/**
 * Alternative import method - renders directly into target element
 * This is the preferred method as it preserves all styling
 */
export async function importDocxDirect(file, targetElement, styleTarget = null) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;

                // Clear target element
                targetElement.innerHTML = '';

                // Create style container if not provided
                const styleContainer = styleTarget || document.head;

                // Render directly to target
                await renderAsync(arrayBuffer, targetElement, styleContainer, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    experimental: true,
                    trimXmlDeclaration: true,
                    useBase64URL: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                    debug: false,
                });

                resolve({ success: true });
            } catch (error) {
                console.error('DOCX Import Error:', error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Export editor content to DOCX
 */
export async function exportDocx(htmlContent, filename = 'document') {
    try {
        // Parse HTML content
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;

        // Convert HTML to docx elements
        const children = parseHtmlToDocx(temp);

        // Create the document
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch in twips
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                    },
                },
                children: children,
            }],
            styles: {
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: 'Calibri',
                            size: 22, // 11pt in half-points
                        },
                    },
                    {
                        id: 'Heading1',
                        name: 'Heading 1',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: 'Calibri',
                            size: 52, // 26pt
                            bold: true,
                            color: '2E74B5',
                        },
                    },
                    {
                        id: 'Heading2',
                        name: 'Heading 2',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: 'Calibri',
                            size: 36, // 18pt
                            bold: true,
                            color: '2E74B5',
                        },
                    },
                ],
            },
        });

        // Generate and save the document
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);

        return true;
    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
}

/**
 * Parse HTML elements and convert to docx elements
 */
function parseHtmlToDocx(element) {
    const children = [];

    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text) {
                children.push(new Paragraph({
                    children: [new TextRun(text)],
                }));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            switch (tagName) {
                case 'h1':
                    children.push(new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: parseInlineContent(node),
                    }));
                    break;

                case 'h2':
                    children.push(new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        children: parseInlineContent(node),
                    }));
                    break;

                case 'h3':
                    children.push(new Paragraph({
                        heading: HeadingLevel.HEADING_3,
                        children: parseInlineContent(node),
                    }));
                    break;

                case 'p':
                case 'div':
                    const style = window.getComputedStyle(node);
                    const alignment = getAlignment(style.textAlign);
                    children.push(new Paragraph({
                        alignment: alignment,
                        children: parseInlineContent(node),
                    }));
                    break;

                case 'br':
                    children.push(new Paragraph({ children: [] }));
                    break;

                case 'ul':
                case 'ol':
                    const listItems = parseList(node, tagName === 'ol');
                    children.push(...listItems);
                    break;

                case 'table':
                    const table = parseTable(node);
                    if (table) children.push(table);
                    break;

                case 'img':
                    const imgParagraph = parseImage(node);
                    if (imgParagraph) children.push(imgParagraph);
                    break;

                case 'hr':
                    children.push(new Paragraph({
                        border: {
                            bottom: {
                                color: 'auto',
                                space: 1,
                                style: BorderStyle.SINGLE,
                                size: 6,
                            },
                        },
                        children: [],
                    }));
                    break;

                default:
                    // Recursively process other elements
                    children.push(...parseHtmlToDocx(node));
            }
        }
    }

    // Ensure at least one paragraph
    if (children.length === 0) {
        children.push(new Paragraph({ children: [] }));
    }

    return children;
}

/**
 * Parse inline content (text with formatting)
 */
function parseInlineContent(element) {
    const runs = [];

    for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text) {
                runs.push(new TextRun(text));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const text = node.textContent;

            if (!text) continue;

            const style = window.getComputedStyle(node);
            const options = {
                text: text,
            };

            // Check for formatting
            if (tagName === 'b' || tagName === 'strong' || style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) {
                options.bold = true;
            }
            if (tagName === 'i' || tagName === 'em' || style.fontStyle === 'italic') {
                options.italics = true;
            }
            if (tagName === 'u' || style.textDecoration.includes('underline')) {
                options.underline = {};
            }
            if (tagName === 's' || tagName === 'strike' || style.textDecoration.includes('line-through')) {
                options.strike = true;
            }
            if (tagName === 'sub') {
                options.subScript = true;
            }
            if (tagName === 'sup') {
                options.superScript = true;
            }

            // Font family
            if (style.fontFamily) {
                options.font = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            }

            // Font size
            const fontSize = parseInt(style.fontSize);
            if (fontSize) {
                options.size = fontSize * 2;
            }

            // Font color
            if (style.color && style.color !== 'rgb(0, 0, 0)') {
                options.color = rgbToHex(style.color);
            }

            runs.push(new TextRun(options));
        }
    }

    return runs;
}

/**
 * Parse list items
 */
function parseList(listElement, isOrdered) {
    const paragraphs = [];
    const items = listElement.querySelectorAll(':scope > li');

    items.forEach((item, index) => {
        const text = item.textContent;
        paragraphs.push(new Paragraph({
            children: [
                new TextRun({
                    text: isOrdered ? `${index + 1}. ${text}` : `• ${text}`,
                }),
            ],
        }));
    });

    return paragraphs;
}

/**
 * Parse HTML table to docx table
 */
function parseTable(tableElement) {
    const rows = tableElement.querySelectorAll('tr');
    if (rows.length === 0) return null;

    const tableRows = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        const tableCells = [];

        cells.forEach(cell => {
            tableCells.push(new TableCell({
                children: [new Paragraph({
                    children: [new TextRun(cell.textContent)],
                })],
                width: {
                    size: 100 / cells.length,
                    type: WidthType.PERCENTAGE,
                },
            }));
        });

        if (tableCells.length > 0) {
            tableRows.push(new TableRow({
                children: tableCells,
            }));
        }
    });

    if (tableRows.length === 0) return null;

    return new Table({
        rows: tableRows,
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
    });
}

/**
 * Parse image element
 */
function parseImage(imgElement) {
    const src = imgElement.src;

    if (src && src.startsWith('data:image')) {
        return new Paragraph({
            children: [new TextRun('[Image]')],
        });
    }

    return null;
}

/**
 * Get alignment type from CSS text-align
 */
function getAlignment(textAlign) {
    switch (textAlign) {
        case 'center': return AlignmentType.CENTER;
        case 'right': return AlignmentType.RIGHT;
        case 'justify': return AlignmentType.JUSTIFIED;
        default: return AlignmentType.LEFT;
    }
}

/**
 * Convert RGB color to hex
 */
function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '000000';

    if (rgb.startsWith('#')) {
        return rgb.slice(1);
    }

    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `${r}${g}${b}`;
    }

    return '000000';
}
