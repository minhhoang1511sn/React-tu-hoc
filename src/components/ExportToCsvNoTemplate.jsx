import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Xóa vùng merge chồng lấn tại dòng cụ thể
function clearMergeInRow(worksheet, rowNumber, startCol, endCol) {
  const mergedCells = Object.keys(worksheet._merges || {});
  mergedCells.forEach(rangeStr => {
    const [startCell, endCell] = rangeStr.split(':');
    const start = worksheet.getCell(startCell);
    const end = endCell ? worksheet.getCell(endCell) : start;
    const overlapRow = start.row <= rowNumber && end.row >= rowNumber;
    const overlapCol = !(end.col < startCol || start.col > endCol);
    if (overlapRow && overlapCol) {
      worksheet.unMergeCells(rangeStr);
    }
  });
}

// Merge an toàn với kiểm tra trước
function safeMergeCells(worksheet, startRow, startCol, endRow, endCol) {
  if (startRow === endRow && startCol === endCol) return;

  const targetRange = `${worksheet.getCell(startRow, startCol).address}:${worksheet.getCell(endRow, endCol).address}`;
  const hasOverlap = Object.keys(worksheet._merges || {}).some(mergedRange => {
    const [mergedStart, mergedEnd] = mergedRange.split(':');
    const mergedStartCell = worksheet.getCell(mergedStart);
    const mergedEndCell = mergedEnd ? worksheet.getCell(mergedEnd) : mergedStartCell;
    const overlapRow = mergedStartCell.row <= startRow && mergedEndCell.row >= endRow;
    const overlapCol = !(mergedEndCell.col < startCol || mergedStartCell.col > endCol);
    return overlapRow && overlapCol;
  });

  if (hasOverlap) {
    clearMergeInRow(worksheet, startRow, startCol, endCol);
  }

  try {
    worksheet.mergeCells(startRow, startCol, endRow, endCol);
  } catch (error) {
    console.error(`Failed to merge cells ${targetRange}:`, error);
  }
}

const ExportWithDynamicColumns = ({ data }) => {
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo');

    const headerMonthRow = 1;
    const headerSubRow = 2;
    const startDataRow = 3;

    // Nhóm dữ liệu theo tháng
    const groupedData = data.reduce((acc, item) => {
      const month = item['Tháng'];
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {});
    const months = Object.keys(groupedData).sort();

    // Định nghĩa sub-headers dựa trên dữ liệu
    const monthSubHeaders = {};
    for (const month of months) {
      const keys = new Set();
      groupedData[month].forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== 'Tháng') keys.add(key);
        });
      });
      monthSubHeaders[month] = Array.from(keys);
    }

    // Tạo header và sub-header
    let currentCol = 1;
    const templateMonthCols = {};

    for (const month of months) {
      const subs = monthSubHeaders[month];

      // Ghi tên tháng (hàng 1)
      worksheet.getRow(headerMonthRow).getCell(currentCol).value = month;
      //căn giữa ô merge
      worksheet.getRow(headerMonthRow).getCell(currentCol).alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      // Ghi sub-headers (hàng 2)
      subs.forEach((sub, idx) => {
        worksheet.getRow(headerSubRow).getCell(currentCol + idx).value = sub;
        //fit content row 2
        worksheet.getColumn(currentCol + idx).width = sub.length + 2;
      });

      // Merge tên tháng
      safeMergeCells(worksheet, headerMonthRow, currentCol, headerMonthRow, currentCol + subs.length - 1);

      // Lưu thông tin vị trí cột
      templateMonthCols[month] = {
        startCol: currentCol,
        colCount: subs.length,
        subHeaders: subs,
      };

      currentCol += subs.length;
    }

    // Tạo map tháng-subheader -> cột
    const colMap = {};
    for (const [month, info] of Object.entries(templateMonthCols)) {
      info.subHeaders.forEach((sub, idx) => {
        colMap[`${month} - ${sub}`] = info.startCol + idx;
      });
    }

    // Ghi dữ liệu
    const maxRows = Math.max(...months.map(m => groupedData[m].length));
    for (let i = 0; i < maxRows; i++) {
      const row = worksheet.getRow(startDataRow + i);
      months.forEach(month => {
        const item = groupedData[month][i];
        if (!item) return;
        const subs = monthSubHeaders[month];
        subs.forEach((sub, idx) => {
          const key = `${month} - ${sub}`;
          const col = colMap[key];
          if (col) {
            row.getCell(col).value = item[sub] || '';
          }
        });
      });
      row.commit();
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Report_Dynamic.xlsx');
  };

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '10px 20px',
        fontSize: '16px',
        cursor: 'pointer',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
      }}
    >
      📊 Xuất Excel động (không dùng template)
    </button>
  );
};

export default ExportWithDynamicColumns;
