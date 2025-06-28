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

  // Kiểm tra xem có vùng merge nào chồng lấn không
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

const ExportWithTemplateAndInsertColumns = ({ data }) => {
  const handleExport = async () => {
    const response = await fetch('/PivotedMonthlyExcel.xlsx');
    if (!response.ok) {
      alert('Không tải được file template');
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);

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

    // Lấy thông tin tháng từ template và lưu độ dài merge
    const templateMonthCols = {};
    let currentCol = 1;
    while (true) {
      const monthCell = worksheet.getCell(headerMonthRow, currentCol).value;
      if (!monthCell) break;
      const monthName = monthCell.toString().trim();
      let colCount = 0;
      let tempCol = currentCol;

      while (true) {
        const subHeader = worksheet.getCell(headerSubRow, tempCol).value;
        if (!subHeader) break;
        const nextMonth = worksheet.getCell(headerMonthRow, tempCol + 1).value;
        if (nextMonth && nextMonth.toString().trim() !== monthName) {
          colCount++;
          break;
        }
        colCount++;
        tempCol++;
        if (tempCol > worksheet.columnCount) break;
      }

      const subHeaders = [];
      for (let c = currentCol; c < currentCol + colCount; c++) {
        const sh = worksheet.getCell(headerSubRow, c).value;
        subHeaders.push(sh ? sh.toString().trim() : '');
      }

      templateMonthCols[monthName] = { startCol: currentCol, colCount, subHeaders };
      currentCol += colCount;
    }

    // Duyệt các tháng trong dữ liệu thực tế và điều chỉnh độ dài merge
    for (const month of months) {
      const dataSubs = monthSubHeaders[month] || ['CostCenter', 'Amount'];

      if (!templateMonthCols[month]) {
        const lastCol = worksheet.columnCount + 1;
        templateMonthCols[month] = {
          startCol: lastCol,
          colCount: dataSubs.length,
          subHeaders: [],
        };
        worksheet.getRow(headerMonthRow).getCell(lastCol).value = month;
        dataSubs.forEach((sub, idx) => {
          worksheet.getRow(headerSubRow).getCell(lastCol + idx).value = sub;
        });
        safeMergeCells(worksheet, headerMonthRow, lastCol, headerMonthRow, lastCol + dataSubs.length - 1);
        continue;
      }

      const tempInfo = templateMonthCols[month];
      const diff = dataSubs.length - tempInfo.colCount;

      if (diff > 0) {
        const insertPos = tempInfo.startCol + tempInfo.colCount;
        // Tính toán vị trí dịch chuyển cho các cột phía sau
        const shift = diff;
        for (let i = 0; i < diff; i++) {
          worksheet.spliceColumns(insertPos, 0, []);
        }
        dataSubs.slice(tempInfo.colCount).forEach((sub, idx) => {
          worksheet.getRow(headerSubRow).getCell(insertPos + idx).value = sub;
        });
        tempInfo.colCount = dataSubs.length;
        tempInfo.subHeaders = dataSubs;

        // Cập nhật lại startCol và merge cho các tháng phía sau
        const monthsAfter = months.slice(months.indexOf(month) + 1);
        monthsAfter.forEach(afterMonth => {
          if (templateMonthCols[afterMonth]) {
            templateMonthCols[afterMonth].startCol += shift;
            // Cập nhật lại merge cho tháng phía sau
            const afterInfo = templateMonthCols[afterMonth];
            clearMergeInRow(worksheet, headerMonthRow, afterInfo.startCol, afterInfo.startCol + afterInfo.colCount - 1);
            safeMergeCells(worksheet, headerMonthRow, afterInfo.startCol, headerMonthRow, afterInfo.startCol + afterInfo.colCount - 1);
            worksheet.getRow(headerMonthRow).getCell(afterInfo.startCol).value = afterMonth;
          }
        });

        // Cập nhật merge cho tháng hiện tại
        clearMergeInRow(worksheet, headerMonthRow, tempInfo.startCol, tempInfo.startCol + tempInfo.colCount - 1);
        safeMergeCells(worksheet, headerMonthRow, tempInfo.startCol, headerMonthRow, tempInfo.startCol + tempInfo.colCount - 1);
      } else {
        tempInfo.subHeaders = dataSubs;
      }

      // Gán lại tiêu đề tháng và merge
      worksheet.getRow(headerMonthRow).getCell(tempInfo.startCol).value = month;
      safeMergeCells(worksheet, headerMonthRow, tempInfo.startCol, headerMonthRow, tempInfo.startCol + tempInfo.colCount - 1);
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
    saveAs(new Blob([buffer]), 'ReportWithInsertedColumns.xlsx');
  };

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '10px 20px',
        fontSize: '16px',
        cursor: 'pointer',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
      }}
    >
      📂 Xuất Excel có chèn cột và merge
    </button>
  );
};

export default ExportWithTemplateAndInsertColumns;