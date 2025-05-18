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

  const addOutputColumn = () => {
    if (newColumn.trim() && !outputColumns.includes(newColumn.trim())) {
      setOutputColumns([...outputColumns, newColumn.trim()]);
      setNewColumn('');
    }
  };

  const removeOutputColumn = (columnToRemove: string) => {
    setOutputColumns(outputColumns.filter(column => column !== columnToRemove));
    setDataEntries(
      dataEntries
        .map(entry => ({
          ...entry,
          columnPairs: entry.columnPairs.filter(pair => pair.outputColumn !== columnToRemove),
        }))
        .filter(entry => entry.columnPairs.length > 0)
    );
    setNewEntry({
      ...newEntry,
      columnPairs: newEntry.columnPairs.filter(pair => pair.outputColumn !== columnToRemove),
    });
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlString = e.target.value;
    const urlArray = urlString.split(',').map(url => url.trim()).filter(url => url);
    setNewEntry({ ...newEntry, urls: urlArray });
  };

  const addColumnPair = () => {
    if (newPair.relatedColumn.trim() && newPair.outputColumn) {
      setNewEntry({
        ...newEntry,
        columnPairs: [...newEntry.columnPairs, { ...newPair }],
      });
      setNewPair({ relatedColumn: '', outputColumn: '' });
    }
  };

  const removeColumnPair = (index: number) => {
    setNewEntry({
      ...newEntry,
      columnPairs: newEntry.columnPairs.filter((_, i) => i !== index),
    });
  };

  const addDataEntry = () => {
    if (newEntry.urls.length > 0 && newEntry.columnPairs.length > 0) {
      setDataEntries([...dataEntries, { ...newEntry }]);
      setNewEntry({ urls: [], columnPairs: [] });
      setNewPair({ relatedColumn: '', outputColumn: '' });
    }
  };

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
        'http://localhost:5050/etl-process',
        payload,
        { responseType: 'blob' }
      );

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
    } catch (err) {
      console.error('ETL request failed:', err);
      alert('Failed to process ETL request. Please check console or input.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Data Input Page</h1>

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
      </div>
    </div>
  );
};

export default InputPage;
