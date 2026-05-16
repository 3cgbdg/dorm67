import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ReportJsonV1 } from "./schema.js";

/**
 * Deterministic render: validated JSON → .docx bytes.
 */
export async function renderDocx(report: ReportJsonV1): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  const { metadata } = report;
  children.push(
    new Paragraph({
      text: metadata.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${metadata.subject} · Lab ${metadata.labNumber}`, break: 1 }),
        new TextRun({ text: metadata.topic, break: 1 }),
        new TextRun({ text: `${metadata.studentName} · ${metadata.group}`, break: 1 }),
        ...(metadata.variant ? [new TextRun({ text: `Variant: ${metadata.variant}`, break: 1 })] : []),
        new TextRun({ text: metadata.date, break: 1 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (const section of report.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );

    if (section.paragraphs?.length) {
      for (const p of section.paragraphs) {
        children.push(
          new Paragraph({
            children: [new TextRun(p)],
            spacing: { after: 120 },
          })
        );
      }
    }

    if (section.bullets?.length) {
      for (const b of section.bullets) {
        children.push(
          new Paragraph({
            text: b,
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      }
    }

    if (section.table && section.table.headers.length) {
      const colCount = section.table.headers.length;
      const headerRow = new TableRow({
        children: section.table.headers.map(
          (h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              width: { size: 100 / colCount, type: WidthType.PERCENTAGE },
            })
        ),
      });
      const bodyRows = section.table.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun(cell)] })],
                  width: { size: 100 / colCount, type: WidthType.PERCENTAGE },
                })
            ),
          })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    if (section.formula?.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.formula, italics: true })],
          spacing: { after: 120 },
        })
      );
    }
  }

  children.push(
    new Paragraph({
      text: "Conclusions",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
    })
  );
  for (const c of report.conclusions) {
    children.push(
      new Paragraph({
        children: [new TextRun(c)],
        spacing: { after: 120 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
