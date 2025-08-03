import React, { useState } from 'react';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';
import DataImportService from '@/utils/dataImport';

interface ImportResult {
  events: number;
  enrollees: number;
  participants: number;
  feedback: number;
}

function DataImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('0123'); // Default company ID
  const [createdBy, setCreatedBy] = useState('admin@juta.com'); // Default creator
  const [csvFiles, setCsvFiles] = useState<{
    aiHorizon: File | null;
    mtdc: File | null;
    feedback: File | null;
  }>({
    aiHorizon: null,
    mtdc: null,
    feedback: null
  });

  const handleFileChange = (fileType: keyof typeof csvFiles, file: File | null) => {
    setCsvFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!csvFiles.aiHorizon || !csvFiles.mtdc || !csvFiles.feedback) {
      setError('Please select all three CSV files');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const importService = new DataImportService();
      
      // Read all CSV files
      const [aiHorizonCSV, mtdcCSV, feedbackCSV] = await Promise.all([
        readFileAsText(csvFiles.aiHorizon!),
        readFileAsText(csvFiles.mtdc!),
        readFileAsText(csvFiles.feedback!)
      ]);

      // Import all data
      const result = await importService.importAllData(
        aiHorizonCSV,
        mtdcCSV,
        feedbackCSV,
        companyId,
        createdBy
      );

      setImportResult(result);
      alert('Data import completed successfully!');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Import</h1>
            <p className="text-gray-600">
              Import CSV data from AI Horizon, MTDC, and Feedback forms into the new database structure
            </p>
          </div>

          {/* Configuration */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Configuration</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company ID
                </label>
                <input
                  type="text"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created By
                </label>
                <input
                  type="email"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter creator email"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV Files</h2>
            
            <div className="space-y-6">
              {/* AI Horizon CSV */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Horizon Registered CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange('aiHorizon', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {csvFiles.aiHorizon && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {csvFiles.aiHorizon.name}
                  </p>
                )}
              </div>

              {/* MTDC CSV */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MTDC Participants Submissions CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange('mtdc', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {csvFiles.mtdc && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {csvFiles.mtdc.name}
                  </p>
                )}
              </div>

              {/* Feedback CSV */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Feedback Form Responses CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange('feedback', e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {csvFiles.feedback && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {csvFiles.feedback.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Import Button */}
          <div className="text-center mb-8">
            <Button
              onClick={handleImport}
              disabled={isImporting || !csvFiles.aiHorizon || !csvFiles.mtdc || !csvFiles.feedback}
              variant="primary"
              className="px-8 py-3 text-lg"
            >
              {isImporting ? (
                <div className="flex items-center space-x-2">
                  <LoadingIcon icon="three-dots" className="w-5 h-5" />
                  <span>Importing Data...</span>
                </div>
              ) : (
                'Start Import'
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Import Results</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.events}</div>
                  <div className="text-sm text-green-700">Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.enrollees}</div>
                  <div className="text-sm text-green-700">Enrollees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.participants}</div>
                  <div className="text-sm text-green-700">Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.feedback}</div>
                  <div className="text-sm text-green-700">Feedback</div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Make sure all CSV files are properly formatted and contain the required columns</p>
              <p>• The import process will create events, enrollees, participants, and feedback records</p>
              <p>• Duplicate entries will be handled automatically</p>
              <p>• The process may take several minutes depending on the data size</p>
              <p>• Check the browser console for detailed import logs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataImport; 