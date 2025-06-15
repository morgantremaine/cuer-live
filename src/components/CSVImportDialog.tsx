
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Column } from '@/hooks/useColumnsManager';
import { transformCSVData, CSVImportResult } from '@/utils/csvImport';

interface CSVImportDialogProps {
  onImport: (result: CSVImportResult) => void;
  existingColumns: Column[];
  children: React.ReactNode;
}

interface ColumnMapping {
  csvColumn: string;
  rundownColumn: string;
  isSkipped?: boolean;
}

interface CSVPreviewData {
  headers: string[];
  rows: any[][];
}

const CSVImportDialog = ({ onImport, existingColumns, children }: CSVImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVPreviewData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const { toast } = useToast();

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file.',
        variant: 'destructive',
      });
      return;
    }

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      complete: (results) => {
        console.log('Papa parse results:', results);
        
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast({
            title: 'Error parsing CSV',
            description: 'There was an error reading the CSV file.',
            variant: 'destructive',
          });
          return;
        }

        const headers = results.data[0] as string[];
        const rows = results.data.slice(1) as any[][];
        
        console.log('Parsed CSV data:', { headers, rows });
        setCsvData({ headers, rows });
        
        // Initialize column mappings
        const initialMappings: ColumnMapping[] = headers.map(header => ({
          csvColumn: header,
          rundownColumn: '',
          isSkipped: false,
        }));
        setColumnMappings(initialMappings);
      },
      header: false,
      skipEmptyLines: true,
    });
  }, [toast]);

  const updateColumnMapping = (index: number, value: string) => {
    setColumnMappings(prev => {
      const updated = [...prev];
      if (value === 'SKIP') {
        updated[index] = { 
          ...updated[index], 
          rundownColumn: '', 
          isSkipped: true 
        };
      } else {
        updated[index] = { 
          ...updated[index], 
          rundownColumn: value,
          isSkipped: false
        };
      }
      return updated;
    });
  };

  const handleImport = () => {
    if (!csvData) {
      console.error('No CSV data available');
      return;
    }

    console.log('Starting import with:', { csvData, columnMappings });

    // Filter out skipped columns and only validate non-skipped ones
    const nonSkippedMappings = columnMappings.filter(mapping => !mapping.isSkipped);
    const unmappedColumns = nonSkippedMappings.filter(mapping => !mapping.rundownColumn);
    
    if (unmappedColumns.length > 0) {
      toast({
        title: 'Incomplete mapping',
        description: 'Please map all non-skipped CSV columns or mark them as skipped.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Final mappings:', nonSkippedMappings);

    // Transform the data
    const result = transformCSVData(csvData.rows, nonSkippedMappings, csvData.headers);
    console.log('Transform result:', result);

    // Call the onImport callback with the result
    onImport(result);
    
    // Reset state
    setFile(null);
    setCsvData(null);
    setColumnMappings([]);
    setIsOpen(false);

    toast({
      title: 'Import successful',
      description: `Imported ${result.items.length} items into this rundown.`,
    });
  };

  const reset = () => {
    setFile(null);
    setCsvData(null);
    setColumnMappings([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) reset();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Import CSV Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!file && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-gray-700">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-200">Choose CSV file</span>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </Label>
                <p className="text-gray-400 mt-2">Select a CSV file to import into this rundown</p>
              </div>
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  <strong>Note:</strong> Make sure to add any custom columns you need to your rundown first using the "Manage Columns" button. 
                  This import will only map to existing columns in your rundown.
                </p>
              </div>
            </div>
          )}

          {csvData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Map CSV Columns to Rundown Columns</h3>
              </div>

              <div className="space-y-4">
                {columnMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 items-center">
                    <div>
                      <Label className="text-sm text-gray-300">CSV Column</Label>
                      <div className="p-2 bg-gray-700 rounded border border-gray-600 text-gray-200">
                        {mapping.csvColumn}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">
                        Map to Rundown Column 
                        {mapping.isSkipped && <span className="text-orange-400 ml-2">(Skipped)</span>}
                      </Label>
                      <Select
                        value={mapping.isSkipped ? 'SKIP' : mapping.rundownColumn}
                        onValueChange={(value) => {
                          updateColumnMapping(index, value);
                        }}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select column or skip..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="SKIP" className="text-orange-400 focus:bg-gray-600 focus:text-orange-300">
                            Skip this column
                          </SelectItem>
                          {existingColumns.filter(col => col.isVisible !== false).map((col) => (
                            <SelectItem key={col.id} value={col.key} className="text-gray-200 focus:bg-gray-600">
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {csvData.rows.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-300">Preview (first 3 rows)</Label>
                  <div className="mt-2 border border-gray-600 rounded-lg overflow-hidden bg-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-600">
                        <tr>
                          {csvData.headers.map((header, index) => {
                            const mapping = columnMappings[index];
                            return (
                              <th 
                                key={index} 
                                className={`px-3 py-2 text-left font-medium text-gray-200 ${
                                  mapping?.isSkipped ? 'bg-orange-800 text-orange-200' : ''
                                }`}
                              >
                                {header}
                                {mapping?.isSkipped && <span className="block text-xs">(Skipped)</span>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.rows.slice(0, 3).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t border-gray-600">
                            {row.map((cell, cellIndex) => {
                              const mapping = columnMappings[cellIndex];
                              return (
                                <td 
                                  key={cellIndex} 
                                  className={`px-3 py-2 text-gray-200 ${
                                    mapping?.isSkipped ? 'bg-orange-900 text-gray-400' : ''
                                  }`}
                                >
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button onClick={reset} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Cancel
                </Button>
                <Button onClick={handleImport} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Import Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportDialog;
