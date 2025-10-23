const HEADER = "%PDF-1.4\n";

export function generatePdfDocument(title: string, lines: string[]): Uint8Array {
  const cleanedTitle = title || "Report";
  const commands: string[] = [
    "BT",
    "/F1 16 Tf",
    "72 770 Td",
    `(${escapePdfText(cleanedTitle)}) Tj`,
    "/F1 12 Tf",
    "14 TL",
  ];

  lines.forEach((line) => {
    commands.push("T*");
    commands.push(`(${escapePdfText(line) || " "}) Tj`);
  });

  commands.push("ET");
  const content = commands.join("\n");
  const contentLength = Buffer.byteLength(content, "utf-8");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentLength} >> stream\n${content}\nendstream\nendobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  const parts: string[] = [HEADER];
  const offsets: number[] = [0];
  let position = HEADER.length;

  objects.forEach((object) => {
    offsets.push(position);
    const chunk = `${object}\n`;
    parts.push(chunk);
    position += Buffer.byteLength(chunk, "utf-8");
  });

  const xrefOffset = position;
  const xrefHeader = `xref\n0 ${objects.length + 1}\n`;
  parts.push(xrefHeader);
  position += Buffer.byteLength(xrefHeader, "utf-8");

  offsets.forEach((offset, index) => {
    const line = index === 0 ? "0000000000 65535 f \n" : `${offset.toString().padStart(10, "0")} 00000 n \n`;
    parts.push(line);
    position += Buffer.byteLength(line, "utf-8");
  });

  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(trailer);

  const pdfString = parts.join("");
  return new TextEncoder().encode(pdfString);
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r|\n/g, " ");
}
