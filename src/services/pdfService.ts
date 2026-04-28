import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VehicleRecord } from '../db';

export async function generatePDFReport(record: VehicleRecord): Promise<void> {
  const doc = new jsPDF({ compress: true, orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(13, 13, 13);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SECURDRIVE', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('SISTEMA DE CONTROL VEHICULAR', 14, 23);
  doc.text(`Reporte generado: ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, 14, 29);

  const statusColor = record.status === 'COMPLETED' ? [16, 185, 129] : [249, 115, 22];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageW - 50, 10, 36, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(record.status === 'COMPLETED' ? 'COMPLETADO' : 'EN PLANTA', pageW - 32, 18, { align: 'center' });

  // ── Plate badge ──────────────────────────────────────────────
  doc.setTextColor(13, 13, 13);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(record.plate, pageW / 2, 60, { align: 'center' });

  doc.setFillColor(230, 230, 230);
  doc.rect(14, 65, pageW - 28, 0.5, 'F');

  // ── Info table ────────────────────────────────────────────────
  const infoRows: [string, string][] = [
    ['Tipo de Vehículo', record.type],
    ...(record.secondaryPlate ? [['Placa Secundaria', record.secondaryPlate] as [string, string]] : []),
    ['Conductor', record.driver],
    ['Destino / Área', record.destination],
    ['Turno', record.shift],
    ['Vigilante', record.guard],
    ...(record.observations ? [['Observaciones', record.observations] as [string, string]] : []),
  ];

  // Cambio crítico: Usar la función autoTable directamente
  autoTable(doc, {
    startY: 72,
    head: [['CAMPO', 'INFORMACIÓN']],
    body: infoRows,
    theme: 'striped',
    headStyles: { fillColor: [13, 13, 13], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;

  // ── Movement detail ───────────────────────────────────────────
  const moveRows = [
    ['Hora', format(record.exitTime, 'HH:mm'), record.returnTime ? format(record.returnTime, 'HH:mm') : '—'],
    ['Fecha', format(record.exitTime, 'dd/MM/yyyy'), record.returnTime ? format(record.returnTime, 'dd/MM/yyyy') : '—'],
    ['Kilometraje', `${record.exitMileage?.toLocaleString('es-PE')} km`, record.returnMileage ? `${record.returnMileage?.toLocaleString('es-PE')} km` : '—'],
    ...(record.returnMileage && record.exitMileage
      ? [['Recorrido total', '—', `${(record.returnMileage - record.exitMileage).toLocaleString('es-PE')} km`]]
      : []),
  ];

  // Segundo cambio crítico: Usar la función autoTable directamente
  autoTable(doc, {
    startY: y,
    head: [['DETALLE', '🚗 SALIDA', '✅ RETORNO']],
    body: moveRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 14;
  doc.setFillColor(13, 13, 13);
  doc.rect(0, footerY - 4, pageW, 18, 'F');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SecurDrive — Sistema de Control Vehicular | Documento generado automáticamente', pageW / 2, footerY + 2, { align: 'center' });
  doc.text(`ID Registro: #${record.id ?? 'N/A'} | Placa: ${record.plate}`, pageW / 2, footerY + 7, { align: 'center' });

  const fileName = `SecurDrive_${record.plate}_${format(record.exitTime, 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(fileName);
}

export function getWhatsAppText(record: VehicleRecord): string {
  const isReturn = record.status === 'COMPLETED';
  const emoji = isReturn ? '✅' : '🚗';
  const title = isReturn ? 'RETORNO DE UNIDAD' : 'SALIDA DE UNIDAD';
  const time = isReturn && record.returnTime
    ? format(record.returnTime, 'HH:mm')
    : format(record.exitTime, 'HH:mm');
  const date = isReturn && record.returnTime
    ? format(record.returnTime, 'dd/MM/yyyy')
    : format(record.exitTime, 'dd/MM/yyyy');
  const km = isReturn ? record.returnMileage : record.exitMileage;

  let text = `${emoji} *SecurDrive — ${title}*\n\n`;
  text += `🔤 *Placa:* \`${record.plate}\`\n`;
  if (record.secondaryPlate) text += `🔗 *Placa 2:* \`${record.secondaryPlate}\`\n`;
  text += `🚙 *Tipo:* ${record.type}\n`;
  text += `👤 *Conductor:* ${record.driver}\n`;
  text += `📍 *Destino:* ${record.destination}\n`;
  text += `🕒 *Hora:* ${time}  📅 *Fecha:* ${date}\n`;
  text += `🛣️ *Kilometraje:* ${km?.toLocaleString('es-PE')} km\n`;
  if (isReturn && record.returnMileage && record.exitMileage) {
    text += `📏 *Recorrido:* ${(record.returnMileage - record.exitMileage).toLocaleString('es-PE')} km\n`;
  }
  text += `👮 *Vigilante:* ${record.guard} — Turno ${record.shift}\n`;
  if (record.observations) text += `📝 *Obs:* ${record.observations}\n`;
  text += `\n_Reporte automático SecurDrive_`;

  return encodeURIComponent(text);
}