import React, { useState } from 'react';
import axios from 'axios';



interface ColumnPair {
  relatedColumn: string;
  outputColumn: string;
}

interface DataEntry {
  urls: string[];
  columnPairs: ColumnPair[];
}

const InputPage: React.FC = () => {
  const [outputColumns, setOutputColumns] = useState<string[]>([]);
  const [newColumn, setNewColumn] = useState('');
  const [dataEntries, setDataEntries] = useState<DataEntry[]>([]);
  const [newEntry, setNewEntry] = useState<DataEntry>({ urls: [], columnPairs: [] });
  const [newPair, setNewPair] = useState<ColumnPair>({ relatedColumn: '', outputColumn: '' });
  const [isProceeded, setIsProceeded] = useState(false);

  // Handle adding a new output column
  const addOutputColumn = () => {
    if (newColumn.trim() && !outputColumns.includes(newColumn.trim())) {
      setOutputColumns([...outputColumns, newColumn.trim()]);
      setNewColumn('');
    }
  };

  // Handle removing an output column
  const removeOutputColumn = (columnToRemove: string) => {
    setOutputColumns(outputColumns.filter(column => column !== columnToRemove));
    // Update data entries to remove column pairs referencing the removed column
    setDataEntries(
      dataEntries
        .map(entry => ({
          ...entry,
          columnPairs: entry.columnPairs.filter(pair => pair.outputColumn !== columnToRemove),
        }))
        .filter(entry => entry.columnPairs.length > 0)
    );
    // Update new entry to remove matching column pairs
    setNewEntry({
      ...newEntry,
      columnPairs: newEntry.columnPairs.filter(pair => pair.outputColumn !== columnToRemove),
    });
  };

  // Handle URL input change (comma-separated)
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlString = e.target.value;
    const urlArray = urlString.split(',').map(url => url.trim()).filter(url => url);
    setNewEntry({ ...newEntry, urls: urlArray });
  };

  // Handle adding a new column pair to the current entry
  const addColumnPair = () => {
    if (newPair.relatedColumn.trim() && newPair.outputColumn) {
      setNewEntry({
        ...newEntry,
        columnPairs: [...newEntry.columnPairs, { ...newPair }],
      });
      setNewPair({ relatedColumn: '', outputColumn: '' });
    }
  };

  // Handle removing a column pair from the current entry
  const removeColumnPair = (index: number) => {
    setNewEntry({
      ...newEntry,
      columnPairs: newEntry.columnPairs.filter((_, i) => i !== index),
    });
  };

  // Handle adding a new data entry
  const addDataEntry = () => {
    if (newEntry.urls.length > 0 && newEntry.columnPairs.length > 0) {
      setDataEntries([...dataEntries, { ...newEntry }]);
      setNewEntry({ urls: [], columnPairs: [] });
      setNewPair({ relatedColumn: '', outputColumn: '' });
    }
  };

  // Handle removing a column pair from a saved data entry
  const removeSavedColumnPair = (entryIndex: number, pairIndex: number) => {
    const updatedEntries = dataEntries
      .map((entry, i) => {
        if (i === entryIndex) {
          return {
            ...entry,
            columnPairs: entry.columnPairs.filter((_, j) => j !== pairIndex),
          };
        }
        return entry;
      })
      .filter(entry => entry.columnPairs.length > 0);
    setDataEntries(updatedEntries);
  };

  // Handle proceeding to show download button
  const handleProceed = async () => {
    if (dataEntries.length === 0) return;
  
    const sources: { url: string; related_columns: string[]; column_names: string[] }[] = [];
  
    dataEntries.forEach(entry => {
      entry.urls.forEach(url => {
        const related_columns = entry.columnPairs.map(p => p.relatedColumn);
        const column_names = entry.columnPairs.map(p => p.outputColumn);
        sources.push({ url, related_columns, column_names });
      });
    });
  
    const payload = {
      output_columns: outputColumns,
      sources: sources
    };
    console.log('Payload:', payload);
  
    try {
      const response = await axios.post(
        'http://localhost:5050/etl-process', // Use correct port
        payload,
        { responseType: 'blob' } // because it returns Excel
      );
  
      // Trigger file download
      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'etl_output.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
  
      setIsProceeded(true); // show success/download UI
    } catch (err) {
      console.error('ETL request failed:', err);
      alert('Failed to process ETL request. Please check console or input.');
    }
  };

  // Handle going back to input page
  const handleBack = () => {
    setIsProceeded(false);
  };

  // Handle downloading the CSV file
  const downloadCSV = () => {
    const headers = ['URL', 'Related Column', 'Output Column'];
    const rows: string[][] = [];
    dataEntries.forEach(entry => {
      entry.urls.forEach(url => {
        entry.columnPairs.forEach(pair => {
          rows.push([url, pair.relatedColumn, pair.outputColumn]);
        });
      });
    });
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data_entries.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  
  return (
    <div className="min-h-screen w-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Data Input Page</h1>

        {!isProceeded ? (
          <>
            {/* Output Columns Input */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Output Column Names</h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={newColumn}
                  onChange={(e) => setNewColumn(e.target.value)}
                  placeholder="Enter column name"
                  className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addOutputColumn}
                  className="px-5 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                  Add Column
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {outputColumns.map((column, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border rounded-md shadow-sm"
                  >
                    <span className="text-gray-700">{column}</span>
                    <button
                      onClick={() => removeOutputColumn(column)}
                      className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Entries Input */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Data Entries</h2>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={newEntry.urls.join(', ')}
                  onChange={handleUrlChange}
                  placeholder="Enter URLs (comma-separated)"
                  className="p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-col gap-3 border p-4 rounded-md bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-600">Column Pairs for URLs</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newPair.relatedColumn}
                      onChange={(e) => setNewPair({ ...newPair, relatedColumn: e.target.value })}
                      placeholder="Enter related column name"
                      className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={newPair.outputColumn}
                      onChange={(e) => setNewPair({ ...newPair, outputColumn: e.target.value })}
                      className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select output column</option>
                      {outputColumns.map((column, index) => (
                        <option key={index} value={column}>{column}</option>
                      ))}
                    </select>
                    <button
                      onClick={addColumnPair}
                      className="px-4 py-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
                    >
                      Add Pair
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {newEntry.columnPairs.map((pair, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm"
                      >
                        <span className="text-gray-700">
                          Related: {pair.relatedColumn}, Output: {pair.outputColumn}
                        </span>
                        <button
                          onClick={() => removeColumnPair(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={addDataEntry}
                  disabled={newEntry.urls.length === 0 || newEntry.columnPairs.length === 0}
                  className={`px-5 py-3 rounded-md text-white transition ${
                    newEntry.urls.length === 0 || newEntry.columnPairs.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Add Entry
                </button>
              </div>
            </div>

            {/* Data Entries List */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Entered Data</h2>
              <div className="space-y-4">
                {dataEntries.map((entry, entryIndex) => (
                  <div
                    key={entryIndex}
                    className="p-4 bg-gray-50 border rounded-md shadow-sm"
                  >
                    <div className="mb-2">
                      <strong className="text-gray-700">URLs:</strong> {entry.urls.join(', ')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {entry.columnPairs.map((pair, pairIndex) => (
                        <div
                          key={pairIndex}
                          className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm"
                        >
                          <span className="text-gray-700">
                            Related: {pair.relatedColumn}, output: {pair.outputColumn}
                          </span>
                          <button
                            onClick={() => removeSavedColumnPair(entryIndex, pairIndex)}
                            className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Proceed Button */}
            <button
              onClick={handleProceed}
              disabled={dataEntries.length === 0}
              className={`w-full px-5 py-3 rounded-md text-white transition ${
                dataEntries.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
            >
              Proceed
            </button>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Data Ready</h2>
            <div className="flex justify-center gap-4">
              <button
                onClick={downloadCSV}
                className="px-6 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition"
              >
                Download CSV
              </button>
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InputPage;