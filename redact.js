const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const PDFDocument = require('pdfkit');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'statement_demo.pdf';

if (!inputPath) {
  console.error('Usage: node redact.js <input.pdf> [output.pdf]');
  process.exit(1);
}

function parseTransactions(text) {
  const lines = text.split('\n').map(l => l.trim());
  const txEndPattern = /([\d,]+\.\d{2})\s{2,}([\d,]+\.\d{2})(\d{3})\s*$/;
  const dateRe = /^\d{2}-\d{2}-\d{4}/;

  const openingMatch = text.match(/OPENING BALANCE\s+([\d,]+\.\d{2})/);
  let prevBalance = openingMatch ? parseFloat(openingMatch[1].replace(/,/g, '')) : null;

  const periodMatch = text.match(/From:\s*(\d{2}-\d{2}-\d{4})\s*To:\s*(\d{2}-\d{2}-\d{4})/);
  const period = periodMatch ? `${periodMatch[1]} to ${periodMatch[2]}` : '';

  let inTransactions = false;
  let descLines = [];
  let currentDate = '';
  const transactions = [];

  for (const line of lines) {
    if (!inTransactions && dateRe.test(line)) inTransactions = true;
    if (!inTransactions) continue;

    const match = line.match(txEndPattern);

    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const newBalance = parseFloat(match[2].replace(/,/g, ''));
      const isDebit = prevBalance !== null && Math.abs((prevBalance - newBalance) - amount) < 0.5;

      const desc = descLines
        .filter(l => l && !/^\d{2}-\d{2}-\d{4}$/.test(l) && l !== 'Br' && !/^(OPENING BALANCE|Tran Date|Init\.)/i.test(l))
        .join(' ')
        .substring(0, 60);

      transactions.push({
        date: currentDate,
        description: desc || '—',
        debit: isDebit ? amount.toFixed(2) : '',
        credit: !isDebit ? amount.toFixed(2) : '',
        balance: newBalance.toFixed(2),
      });

      prevBalance = newBalance;
      descLines = [];
    } else {
      if (/^\d{2}-\d{2}-\d{4}$/.test(line)) {
        currentDate = line;
        descLines = [];
      } else if (dateRe.test(line)) {
        // date + content on same line
        currentDate = line.substring(0, 10);
        const rest = line.substring(10).trim();
        descLines = rest ? [rest] : [];
      } else {
        descLines.push(line);
      }
    }
  }

  return { transactions, period, openingBalance: openingMatch ? openingMatch[1] : '—' };
}

function drawTable(doc, transactions) {
  const pageWidth = doc.page.width;
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;

  // Column widths
  const cols = {
    date:        { x: margin,       w: 65,  label: 'Date',        align: 'left'  },
    description: { x: margin + 65,  w: 220, label: 'Particulars', align: 'left'  },
    debit:       { x: margin + 285, w: 70,  label: 'Debit (₹)',   align: 'right' },
    credit:      { x: margin + 355, w: 70,  label: 'Credit (₹)',  align: 'right' },
    balance:     { x: margin + 425, w: 90,  label: 'Balance (₹)', align: 'right' },
  };

  const rowH = 18;
  const headerH = 22;

  function drawRow(y, row, isHeader, shade) {
    const h = isHeader ? headerH : rowH;

    if (shade) {
      doc.rect(margin, y, tableWidth, h).fill('#f4f4f8');
      doc.fillColor('#000');
    }

    // Row border
    doc.rect(margin, y, tableWidth, h).stroke('#ccc');

    // Cell dividers
    for (const key of ['description', 'debit', 'credit', 'balance']) {
      const col = cols[key];
      doc.moveTo(col.x, y).lineTo(col.x, y + h).stroke('#ccc');
    }

    const textY = y + (h - (isHeader ? 9 : 8)) / 2 + (isHeader ? 1 : 0);

    for (const [key, col] of Object.entries(cols)) {
      const val = isHeader ? col.label : (row[key] || '');
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(isHeader ? 8.5 : 7.5)
         .fillColor(isHeader ? '#333' : (key === 'debit' ? '#c0392b' : key === 'credit' ? '#27ae60' : '#222'))
         .text(val, col.x + 4, textY, { width: col.w - 8, align: col.align, lineBreak: false });
    }
  }

  function drawHeader(y) {
    doc.rect(margin, y, tableWidth, headerH).fill('#e8e8f4');
    doc.fillColor('#000');
    drawRow(y, null, true, false);
    return y + headerH;
  }

  let y = doc.y;

  // Draw header
  y = drawHeader(y);

  // Draw rows
  transactions.forEach((row, i) => {
    if (y + rowH > doc.page.height - margin) {
      doc.addPage();
      y = margin;
      y = drawHeader(y);
    }
    drawRow(y, row, false, i % 2 === 0);
    y += rowH;
  });

  doc.y = y + 10;
}

async function run() {
  const buffer = fs.readFileSync(inputPath);
  const { text } = await pdfParse(buffer);
  const { transactions, period, openingBalance } = parseTransactions(text);

  if (transactions.length === 0) {
    console.error('No transactions found');
    process.exit(1);
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'portrait' });
  const out = fs.createWriteStream(outputPath);
  doc.pipe(out);

  // Title
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#1a1a2e')
     .text('Bank Statement — Demo', { align: 'center' });
  doc.fontSize(8).font('Helvetica').fillColor('#888')
     .text('Personal details removed', { align: 'center' });
  doc.moveDown(0.4);

  if (period) {
    doc.fontSize(9).fillColor('#444')
       .text(`Period: ${period}`, { align: 'center' });
  }
  doc.fontSize(9).fillColor('#444')
     .text(`Opening Balance: ₹${openingBalance}`, { align: 'center' });
  doc.moveDown(0.8);

  drawTable(doc, transactions);

  // Summary
  const totalDebit = transactions.reduce((s, t) => s + (t.debit ? parseFloat(t.debit) : 0), 0);
  const totalCredit = transactions.reduce((s, t) => s + (t.credit ? parseFloat(t.credit) : 0), 0);

  doc.moveDown(0.5);
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#333')
     .text(`Total Debits: ₹${totalDebit.toFixed(2)}`, { continued: true })
     .text(`   Total Credits: ₹${totalCredit.toFixed(2)}`, { align: 'left' });

  doc.end();
  out.on('finish', () => {
    console.log(`✓ Saved: ${outputPath}`);
    console.log(`  ${transactions.length} transactions | ${transactions.filter(t => t.debit).length} debits | ${transactions.filter(t => t.credit).length} credits`);
  });
}

run();
