import React, { useState } from 'react';

function CsvViewer() {
  const [data, setData] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Lấy nội dung file
      const text = event.target.result;
      // Tách dòng, xử lý bỏ dòng rỗng và trim \r nếu có
      const lines = text.split('\n')
                        .map(line => line.replace('\r', '').trim())
                        .filter(line => line.length > 0);
      // Tách các cell theo dấu phẩy, và trim từng cell
      const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
      setData(rows);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>CSV Viewer</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <table border="1" style={{ marginTop: 20, borderCollapse: 'collapse' }}>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '4px 8px' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CsvViewer;
