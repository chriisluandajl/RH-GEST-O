import * as XLSX from 'xlsx';

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Dados'
) {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  const validFileName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, validFileName);
}

export function printElement(elementId: string, pageTitle: string = 'Documento') {
  const elem = document.getElementById(elementId);
  if (!elem) {
    console.error(`Elemento com ID ${elementId} não encontrado.`);
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    // If popups blocked, print current page
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>${pageTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #1e293b;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        </style>
      </head>
      <body class="p-4">
        ${elem.innerHTML}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 350);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function formatCurrency(amount: number, symbol: string = 'Kz'): string {
  if (amount === undefined || amount === null) return `0 ${symbol}`;
  return `${amount.toLocaleString('pt-PT')} ${symbol}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
