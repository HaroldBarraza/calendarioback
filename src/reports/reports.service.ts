import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PLANNING_YEAR } from '../config/configuration.js';
import { ActivityStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

const require = createRequire(import.meta.url);

interface PdfKitDoc {
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  end(): void;
}

interface PdfPrinterLike {
  createPdfKitDocument(docDefinition: unknown, options?: unknown): PdfKitDoc;
}

const PdfPrinter = require('pdfmake') as new (
  fonts: Record<string, unknown>,
) => PdfPrinterLike;

type PdfPrinterInstance = PdfPrinterLike;

const STATUS_LABEL: Record<ActivityStatus, string> = {
  PLANNED: 'Planificada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
};

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const QUARTERS = [
  { label: 'Primer Trimestre · Enero a Marzo', months: [0, 1, 2] },
  { label: 'Segundo Trimestre · Abril a Junio', months: [3, 4, 5] },
  { label: 'Tercer Trimestre · Julio a Septiembre', months: [6, 7, 8] },
  { label: 'Cuarto Trimestre · Octubre a Diciembre', months: [9, 10, 11] },
];

const QUARTERS_EXCEL = [
  { name: 'Q1 Enero-Marzo', months: [0, 1, 2], label: 'Primer Trimestre · Enero a Marzo' },
  { name: 'Q2 Abril-Junio', months: [3, 4, 5], label: 'Segundo Trimestre · Abril a Junio' },
  { name: 'Q3 Julio-Septiembre', months: [6, 7, 8], label: 'Tercer Trimestre · Julio a Septiembre' },
  { name: 'Q4 Octubre-Diciembre', months: [9, 10, 11], label: 'Cuarto Trimestre · Octubre a Diciembre' },
];

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly printer: PdfPrinterInstance;

  constructor(private readonly prisma: PrismaService) {
    const fontsDir = path.resolve(process.cwd(), 'fonts');
    this.printer = new PdfPrinter({
      Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
      },
    });
  }

  // ═══════════════════════════════════════════
  // PDF
  // ═══════════════════════════════════════════
  async generateActivitiesPdf(query: ReportQueryDto): Promise<Buffer> {
    const activities = await this.fetchActivities(query);
    const filtersLabel = await this.describeFilters(query);
    const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    const byMonth: typeof activities[] = Array.from({ length: 12 }, () => []);
    for (const a of activities) {
      const m = new Date(a.activityDate).getUTCMonth();
      byMonth[m].push(a);
    }

    const statusCounts: Record<ActivityStatus, number> = {
      PLANNED: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0,
    };
    for (const a of activities) statusCounts[a.status]++;
    const withTime = activities.filter((a) => a.timeDefined).length;
    const withoutTime = activities.length - withTime;

    const content: object[] = [
      { text: `Sistema de Planificación ${PLANNING_YEAR}`, style: 'title' },
      { text: 'Reporte de Actividades por Trimestre', style: 'subtitle' },
      { text: `Generado: ${now}`, style: 'meta' },
      { text: `Filtros: ${filtersLabel}`, style: 'meta' },
      { text: `Total: ${activities.length} actividad(es)`, style: 'meta', margin: [0, 0, 0, 12] },
    ];

    if (activities.length === 0) {
      content.push({
        text: 'Sin actividades para los filtros aplicados.',
        italics: true,
        margin: [0, 20, 0, 20],
      });
    } else {
      let firstQuarterRendered = false;

      for (const q of QUARTERS) {
        const quarterTotal = q.months.reduce((n, m) => n + byMonth[m].length, 0);
        if (quarterTotal === 0) continue;

        content.push({
          text: q.label,
          style: 'quarter',
          pageBreak: firstQuarterRendered ? 'before' : undefined,
        });
        firstQuarterRendered = true;

        for (const mIdx of q.months) {
          const monthActs = byMonth[mIdx];
          if (monthActs.length === 0) continue;

          content.push({
            text: `${MONTHS_ES[mIdx]} ${PLANNING_YEAR}  ·  ${monthActs.length} actividad(es)`,
            style: 'month',
            margin: [0, 10, 0, 4],
          });

          content.push({
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Fecha', style: 'th' },
                  { text: 'Día', style: 'th' },
                  { text: 'Actividad', style: 'th' },
                  { text: 'Hora', style: 'th' },
                  { text: 'Organización', style: 'th' },
                  { text: 'Barrio', style: 'th' },
                ],
                ...monthActs.map((a) => {
                  const d = new Date(a.activityDate);
                  const dd = String(d.getUTCDate()).padStart(2, '0');
                  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                  const weekday = WEEKDAYS_ES[d.getUTCDay()];
                  const hora = a.timeDefined && a.startTime
                    ? a.startTime.toISOString().slice(11, 16)
                    : '—';
                  return [
                    `${dd}/${mm}`,
                    weekday,
                    a.name,
                    hora,
                    a.organization.name,
                    a.neighborhood.name,
                  ];
                }),
              ],
            },
            layout: 'lightHorizontalLines',
          });
        }
      }
    }

    content.push(
      { text: 'Resumen estadístico', style: 'quarter', margin: [0, 20, 0, 6] },
      {
        ul: [
          `Total de actividades: ${activities.length}`,
          `Planificadas: ${statusCounts.PLANNED}`,
          `Confirmadas: ${statusCounts.CONFIRMED}`,
          `Realizadas: ${statusCounts.COMPLETED}`,
          `Canceladas: ${statusCounts.CANCELLED}`,
          `Con horario definido: ${withTime}`,
          `Sin horario definido: ${withoutTime}`,
        ],
      },
    );

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      content,
      styles: {
        title: { fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
        subtitle: { fontSize: 12, bold: true, color: '#475569', margin: [0, 0, 0, 8] },
        meta: { fontSize: 9, color: '#64748b' },
        quarter: { fontSize: 14, bold: true, color: '#1d4ed8', margin: [0, 12, 0, 4] },
        month: { fontSize: 11, bold: true, color: '#0f172a' },
        th: { bold: true, fontSize: 8, color: '#ffffff', fillColor: '#1e293b', margin: [0, 2, 0, 2] },
      },
    };

    return this.render(docDefinition);
  }

  // ═══════════════════════════════════════════
  // EXCEL
  // ═══════════════════════════════════════════
  async generateActivitiesExcel(query: ReportQueryDto): Promise<Buffer> {
    const activities = await this.fetchActivities(query);
    const now = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    const byMonth: typeof activities[] = Array.from({ length: 12 }, () => []);
    for (const a of activities) {
      const m = new Date(a.activityDate).getUTCMonth();
      byMonth[m].push(a);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Planificación 2027';
    workbook.created = new Date();

    for (const q of QUARTERS_EXCEL) {
      const quarterTotal = q.months.reduce((n, m) => n + byMonth[m].length, 0);
      if (quarterTotal === 0) continue;

      const sheet = workbook.addWorksheet(q.name, {
        views: [{ state: 'frozen', ySplit: 4 }],
        properties: { tabColor: { argb: 'FF1D4ED8' } },
      });

      sheet.columns = [
        { key: 'fecha', width: 14 },
        { key: 'dia', width: 10 },
        { key: 'actividad', width: 45 },
        { key: 'hora', width: 10 },
        { key: 'org', width: 26 },
        { key: 'barrio', width: 20 },
        { key: 'estado', width: 15 },
        { key: 'obs', width: 50 },
      ];

      let currentRow = 1;

      sheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const titleCell = sheet.getCell(`A${currentRow}`);
      titleCell.value = `Sistema de Planificación 2027 · ${q.label}`;
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(currentRow).height = 28;
      currentRow++;

      sheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const subCell = sheet.getCell(`A${currentRow}`);
      subCell.value = `Total del trimestre: ${quarterTotal} actividad(es)  ·  Generado: ${now}`;
      subCell.font = { size: 10, color: { argb: 'FF64748B' }, italic: true };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(currentRow).height = 18;
      currentRow += 2;

      for (const mIdx of q.months) {
        const monthActs = byMonth[mIdx];
        if (monthActs.length === 0) continue;

        sheet.mergeCells(`A${currentRow}:H${currentRow}`);
        const monthCell = sheet.getCell(`A${currentRow}`);
        monthCell.value = `${MONTHS_ES[mIdx]} 2027  ·  ${monthActs.length} actividad(es)`;
        monthCell.font = { bold: true, size: 12, color: { argb: 'FF1D4ED8' } };
        monthCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        monthCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        sheet.getRow(currentRow).height = 22;
        currentRow++;

        const headerRow = sheet.getRow(currentRow);
        const headers = ['Fecha', 'Día', 'Actividad', 'Hora', 'Organización', 'Barrio', 'Estado', 'Observaciones'];
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF334155' } },
            bottom: { style: 'thin', color: { argb: 'FF334155' } },
            left: { style: 'thin', color: { argb: 'FF334155' } },
            right: { style: 'thin', color: { argb: 'FF334155' } },
          };
        });
        sheet.getRow(currentRow).height = 20;
        currentRow++;

        for (const a of monthActs) {
          const d = new Date(a.activityDate);
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const weekday = WEEKDAYS_ES[d.getUTCDay()];
          const hora = a.timeDefined && a.startTime
            ? a.startTime.toISOString().slice(11, 16)
            : '—';

          const row = sheet.getRow(currentRow);
          row.values = [
            `${dd}/${mm}/${d.getUTCFullYear()}`,
            weekday,
            a.name,
            hora,
            a.organization.name,
            a.neighborhood.name,
            STATUS_LABEL[a.status],
            a.description ?? '',
          ];
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.font = { size: 10 };
          });
          row.height = 18;
          currentRow++;
        }

        currentRow++;
      }
    }

    if (workbook.worksheets.length === 0) {
      const sheet = workbook.addWorksheet('Sin resultados');
      sheet.getCell('A1').value = 'Sin actividades para los filtros aplicados.';
      sheet.getCell('A1').font = { bold: true, size: 14 };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ═══════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════
  private fetchActivities(query: ReportQueryDto) {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.neighborhoodId ? { neighborhoodId: query.neighborhoodId } : {}),
      ...(query.placeId ? { placeId: query.placeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.timeDefined !== undefined ? { timeDefined: query.timeDefined } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            activityDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.activity.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        neighborhood: { select: { name: true } },
        place: { select: { name: true } },
      },
      orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async describeFilters(query: ReportQueryDto): Promise<string> {
    const parts: string[] = [];
    if (query.dateFrom || query.dateTo) {
      parts.push(`Fechas: ${query.dateFrom ?? 'inicio'} → ${query.dateTo ?? 'fin'}`);
    }
    if (query.status) parts.push(`Estado: ${STATUS_LABEL[query.status]}`);
    if (query.timeDefined !== undefined) {
      parts.push(query.timeDefined ? 'Con horario' : 'Sin horario');
    }
    if (query.organizationId) {
      const o = await this.prisma.organization.findUnique({
        where: { id: query.organizationId }, select: { name: true },
      });
      parts.push(`Organización: ${o?.name ?? query.organizationId}`);
    }
    if (query.neighborhoodId) {
      const n = await this.prisma.neighborhood.findUnique({
        where: { id: query.neighborhoodId }, select: { name: true },
      });
      parts.push(`Barrio: ${n?.name ?? query.neighborhoodId}`);
    }
    if (query.placeId) {
      const p = await this.prisma.place.findUnique({
        where: { id: query.placeId }, select: { name: true },
      });
      parts.push(`Lugar: ${p?.name ?? query.placeId}`);
    }
    return parts.length ? parts.join('  |  ') : 'Ninguno (todas las actividades)';
  }

  private render(docDefinition: unknown): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      } catch (err) {
        this.logger.error('Error generando PDF', err as Error);
        reject(err);
      }
    });
  }
}