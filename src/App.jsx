import React from 'react';
import ExportWithTemplate from './components/ExportToCsv';
import ExportWithTemplate2 from './components/ExportToCsvNoTemplate';
import ExportWithDynamicColumns from './components/ExportCSVNoMergge';
/**
 * ExportCsvButton Component
 * A reusable button to export data to a CSV file using vanilla JavaScript.
 * This version transforms the data into a pivoted format grouped by month.
 * @param {object[]} data - The array of objects to export.
 */
const ExportCsvButton = ({ data }) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      console.error("Export failed: No data provided.");
      return;
    }

    // --- Data Transformation Logic ---

    // Step 1: Group data by 'Tháng' (Month).
    const groupedData = data.reduce((acc, item) => {
      const month = item['Tháng'];
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {});

    // Step 2: Get a sorted list of months.
    const months = Object.keys(groupedData).sort();

    // Step 3: Get sub-headers per month
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

    // Step 4: Find the maximum number of rows needed for any month.
    const maxRows = Math.max(...months.map(month => groupedData[month].length));

    // --- CSV String Construction ---
    let csvRows = [];
    const headerRow = [];

    // Step 5: Create the main header row for the CSV file.
    months.forEach(month => {
      monthSubHeaders[month].forEach(subHeader => {
        headerRow.push(`${month} - ${subHeader}`);
      });
    });
    csvRows.push(headerRow.join(','));

    // Step 6: Create the data rows.
    for (let i = 0; i < maxRows; i++) {
      let rowData = [];
      months.forEach(month => {
        const item = groupedData[month][i];
        monthSubHeaders[month].forEach(subHeader => {
          if (item && item[subHeader] !== undefined) {
            rowData.push(`"${item[subHeader]}"`);
          } else {
            rowData.push('');
          }
        });
      });
      csvRows.push(rowData.join(','));
    }

    // Join all rows with newline
    const csvContent = csvRows.join('\n');

    // Step 7: Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'PivotedMonthlyReport.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      📤 Xuất CSV theo nhóm
    </button>
  );
};

// Main App Component
function App() {
  const sampleData = [
    { Tháng: 'Tháng 1', CostCenter: 'A001', Amount: 100 },
    { Tháng: 'Tháng 1', CostCenter: 'A002', Amount: 120 },
    { Tháng: 'Tháng 2', CostCenter: 'A003', Amount: 200, Note: 'OT', Note2: 'OT2' },
    { Tháng: 'Tháng 2', CostCenter: 'A004', Amount: 300, Note: 'Temp', Note2: 'Temp2' },
    { Tháng: 'Tháng 3', CostCenter: 'A005', Amount: 150 },
    { Tháng: 'Tháng 3', CostCenter: 'A006', Amount: 180 },
  ];

  return (
    // <ExportWithTemplate data={sampleData}/>
    // <ExportWithTemplate2 data={sampleData}/>
    <ExportWithDynamicColumns data={sampleData}/>
  );
}

export default App;
