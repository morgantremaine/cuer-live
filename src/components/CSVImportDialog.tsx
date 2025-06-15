
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Trash2 } from 'lucide-react';
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
  isNewColumn: boolean;
  newColumnName?: string;
  isSkipped?: boolean;
}

interface CSVPreviewData {
  headers: string[];
  rows: any[][];
}

// Default columns that exactly match useColumnsManager
const DEFAULT_RUNDOWN_COLUMNS = [
  { key: 'name', name: 'Segment Name' },
  { key: 'script', name: 'Script' },
  { key: 'gfx', name: 'GFX' },
  { key: 'video', name: 'Video' },
  { key: 'duration', name: 'Duration' },
  { key: 'startTime', name: 'Start' },
  { key: 'endTime', name: 'End' },
  { key: 'elapsedTime', name: 'Elapsed' },
  { key: 'talent', name: 'Talent' },
  { key: 'notes', name: 'Notes' }
];

const CSVImportDialog = ({ onImport, existingColumns, children }: CSVImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVPreviewData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [newColumns, setNewColumns] = useState<{ id: string; name: string }[]>([]);
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
          isNewColumn: false,
          isSkipped: false,
        }));
        setColumnMappings(initialMappings);
      },
      header: false,
      skipEmptyLines: true,
    });
  }, [toast]);

  const updateColumnMapping = (index: number, field: keyof ColumnMapping, value: any) => {
    setColumnMappings(prev => {
      const updated = [...prev];
      if (field === 'rundownColumn' && value === 'SKIP') {
        updated[index] = { 
          ...updated[index], 
          rundownColumn: '', 
          isNewColumn: false, 
          isSkipped: true 
        };
      } else if (field === 'rundownColumn' && value !== 'SKIP') {
        const isNewColumn = newColumns.some(col => col.id === value);
        updated[index] = { 
          ...updated[index], 
          [field]: value,
          isNewColumn,
          isSkipped: false
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addNewColumn = () => {
    const newId = `new_${Date.now()}`;
    setNewColumns(prev => [...prev, { id: newId, name: '' }]);
  };

  const updateNewColumn = (id: string, name: string) => {
    setNewColumns(prev => prev.map(col => 
      col.id === id ? { ...col, name } : col
    ));
  };

  const removeNewColumn = (id: string) => {
    setNewColumns(prev => prev.filter(col => col.id !== id));
    // Also update any mappings that were using this new column
    setColumnMappings(prev => prev.map(mapping => 
      mapping.rundownColumn === id 
        ? { ...mapping, rundownColumn: '', isNewColumn: false, isSkipped: false }
        : mapping
    ));
  };

  const handleImport = () => {
    if (!csvData) {
      console.error('No CSV data available');
      return;
    }

    console.log('Starting import with:', { csvData, columnMappings, newColumns });

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

    // Validate new column names for non-skipped columns
    const newColumnsWithNames = newColumns.filter(col => col.name.trim());
    const invalidNewColumns = nonSkippedMappings.filter(mapping => 
      mapping.isNewColumn && 
      mapping.rundownColumn && 
      !newColumnsWithNames.find(col => col.id === mapping.rundownColumn)
    );

    if (invalidNewColumns.length > 0) {
      toast({
        title: 'Invalid new columns',
        description: 'Please provide names for all new columns.',
        variant: 'destructive',
      });
      return;
    }

    // Prepare final column mappings with new column names, excluding skipped columns
    const finalMappings = nonSkippedMappings.map(mapping => {
      if (mapping.isNewColumn && mapping.rundownColumn) {
        const newCol = newColumnsWithNames.find(col => col.id === mapping.rundownColumn);
        return {
          ...mapping,
          newColumnName: newCol?.name
        };
      }
      return mapping;
    });

    console.log('Final mappings:', finalMappings);

    // Transform the data
    const result = transformCSVData(csvData.rows, finalMappings, csvData.headers);
    console.log('Transform result:', result);

    // Call the onImport callback with the result
    onImport(result);
    
    // Reset state
    setFile(null);
    setCsvData(null);
    setColumnMappings([]);
    setNewColumns([]);
    setIsOpen(false);

    toast({
      title: 'Import successful',
      description: `Imported ${result.items.length} items with ${result.newColumns.length} new columns.`,
    });
  };

  const reset = () => {
    setFile(null);
    setCsvData(null);
    setColumnMappings([]);
    setNewColumns([]);
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
          <DialogTitle className="text-white">Import CSV Rundown</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!file && (
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
              <p className="text-gray-400 mt-2">Select a CSV file to import as a new rundown</p>
            </div>
          )}

          {csvData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Map CSV Columns to Rundown Columns</h3>
                <Button onClick={addNewColumn} variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Column
                </Button>
              </div>

              {newColumns.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">New Columns</Label>
                  {newColumns.map((newCol) => (
                    <div key={newCol.id} className="flex items-center space-x-2">
                      <Input
                        placeholder="Enter column name"
                        value={newCol.name}
                        onChange={(e) => updateNewColumn(newCol.id, e.target.value)}
                        className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      />
                      <Button
                        onClick={() => removeNewColumn(newCol.id)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

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
                          updateColumnMapping(index, 'rundownColumn', value);
                        }}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select column or skip..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="SKIP" className="text-orange-400 focus:bg-gray-600 focus:text-orange-300">
                            Skip this column
                          </SelectItem>
                          {DEFAULT_RUNDOWN_COLUMNS.map((col) => (
                            <SelectItem key={col.key} value={col.key} className="text-gray-200 focus:bg-gray-600">
                              {col.name}
                            </SelectItem>
                          ))}
                          {newColumns.map((newCol) => (
                            <SelectItem key={newCol.id} value={newCol.id} className="text-gray-200 focus:bg-gray-600">
                              {newCol.name || 'Unnamed new column'}
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
                  Import Rundown
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
