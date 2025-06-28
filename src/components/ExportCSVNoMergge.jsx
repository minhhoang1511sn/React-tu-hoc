import React from 'react';
import { mkConfig, generateCsv, download } from 'export-to-csv';

const ExportWithDynamicColumns = ({ data }) => {
  const handleExport = () => {
    // Bước 1: Gom theo tháng
    const groupedData = data.reduce((acc, item) => {
      const month = item['Tháng'];
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {});
    const months = Object.keys(groupedData).sort();

    // Bước 2: Lấy tất cả các sub-headers theo từng tháng
    const headers = [];
    const subHeaders = [];

    months.forEach(month => {
      const firstItem = groupedData[month][0];
      const keys = Object.keys(firstItem).filter(k => k !== 'Tháng');
      keys.forEach(sub => {
        headers.push(month);
        subHeaders.push(sub);
      });
    });
    console.log(headers)
    console.log(subHeaders)
    // Bước 3: Dòng dữ liệu
    const row = [];
    months.forEach(month => {
      const firstItem = groupedData[month][0]; // hoặc xử lý nhiều dòng nếu cần
      const keys = Object.keys(firstItem).filter(k => k !== 'Tháng');
      keys.forEach(key => {
        row.push(firstItem[key]);
      });
    });

    // Bước 4: Kết hợp thành mảng 2 chiều
    const finalData = [headers, subHeaders, row];

    // Bước 5: Export CSV
    const config = mkConfig({
      filename: 'Report_Matrix_Style',
      useKeysAsHeaders: true,
    });

    const csv = generateCsv(config)(finalData);
    download(config)(csv);
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
      📄 Xuất CSV nhiều dòng tiêu đề
    </button>
  );
};

export default ExportWithDynamicColumns;
