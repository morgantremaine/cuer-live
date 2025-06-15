import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Column } from '@/hooks/useColumnsManager';
import { transformCSVData, CSVImportResult } from '@/utils/csvImport';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';

interface CSVImportDialogProps {
  onImport: (result: CSVImportResult, layoutColumns: Column[]) => void;
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

const CSVImportDialog = ({ onImport, children }: CSVImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'layout' | 'mapping'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVPreviewData | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<any>(null);
  const [availableColumns, setAvailableColumns] = useState<Column[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const { savedLayouts, loading } = useColumnLayoutStorage();
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
        setStep('layout');
      },
      header: false,
      skipEmptyLines: true,
    });
  }, [toast]);

  const handleLayoutSelection = (layout: any) => {
    console.log('Selected layout:', layout);
    setSelectedLayout(layout);
    
    // Set available columns from the selected layout
    const layoutColumns = Array.isArray(layout.columns) ? layout.columns : [];
    setAvailableColumns(layoutColumns);
    
    // Initialize column mappings
    if (csvData) {
      const initialMappings: ColumnMapping[] = csvData.headers.map(header => ({
        csvColumn: header,
        rundownColumn: '',
        isSkipped: false,
      }));
      setColumnMappings(initialMappings);
      setStep('mapping');
    }
  };

  const handleUseDefaultLayout = () => {
    const defaultColumns: Column[] = DEFAULT_RUNDOWN_COLUMNS.map((col, index) => ({
      id: col.key,
      key: col.key,
      name: col.name,
      width: '150px',
      isCustom: false,
      isEditable: true,
      isVisible: true,
    }));
    
    setSelectedLayout({ name: 'Default Layout', columns: defaultColumns });
    setAvailableColumns(defaultColumns);
    
    if (csvData) {
      const initialMappings: ColumnMapping[] = csvData.headers.map(header => ({
        csvColumn: header,
        rundownColumn: '',
        isSkipped: false,
      }));
      setColumnMappings(initialMappings);
      setStep('mapping');
    }
  };

  const updateColumnMapping = (index: number, field: keyof ColumnMapping, value: any) => {
    setColumnMappings(prev => {
      const updated = [...prev];
      if (field === 'rundownColumn' && value === 'SKIP') {
        updated[index] = { 
          ...updated[index], 
          rundownColumn: '', 
          isSkipped: true 
        };
      } else if (field === 'rundownColumn' && value !== 'SKIP') {
        updated[index] = { 
          ...updated[index], 
          [field]: value,
          isSkipped: false
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const handleImport = () => {
    if (!csvData || !selectedLayout) {
      console.error('No CSV data or layout selected');
      return;
    }

    console.log('Starting import with:', { csvData, columnMappings, selectedLayout });

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

    // Call the onImport callback with the result and layout columns
    onImport(result, selectedLayout.columns);
    
    // Reset state
    reset();
    setIsOpen(false);

    toast({
      title: 'Import successful',
      description: `Imported ${result.items.length} items using "${selectedLayout.name}" layout.`,
    });
  };

  const reset = () => {
    setFile(null);
    setCsvData(null);
    setSelectedLayout(null);
    setAvailableColumns([]);
    setColumnMappings([]);
    setStep('upload');
  };

  const goBack = () => {
    if (step === 'mapping') {
      setStep('layout');
    } else if (step === 'layout') {
      setStep('upload');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) reset();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import CSV Rundown</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {step === 'upload' && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/50">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-foreground">Choose CSV file</span>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
              <p className="text-muted-foreground mt-2">Select a CSV file to import as a new rundown</p>
            </div>
          )}

          {step === 'layout' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Select Column Layout</h3>
                <p className="text-muted-foreground">Choose which column layout to use for importing your CSV data</p>
              </div>

              {loading ? (
                <div className="text-center text-muted-foreground">Loading your saved layouts...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      onClick={handleUseDefaultLayout}
                      variant="outline"
                      className="p-4 h-auto border text-left hover:bg-muted"
                    >
                      <div className="w-full">
                        <div className="font-medium text-foreground">Default Layout</div>
                        <div className="text-sm text-muted-foreground">Standard rundown columns (Name, Script, Duration, etc.)</div>
                      </div>
                    </Button>

                    {savedLayouts.map((layout) => (
                      <Button
                        key={layout.id}
                        onClick={() => handleLayoutSelection(layout)}
                        variant="outline"
                        className="p-4 h-auto border text-left hover:bg-muted"
                      >
                        <div className="w-full">
                          <div className="font-medium text-foreground">{layout.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {Array.isArray(layout.columns) ? layout.columns.length : 0} columns
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>

                  {savedLayouts.length === 0 && (
                    <div className="text-center text-muted-foreground p-4 border rounded-lg bg-muted/50">
                      <FolderOpen className="mx-auto h-8 w-8 mb-2" />
                      <p>No saved layouts found. Use the default layout or create a custom layout in the Column Manager first.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button onClick={goBack} variant="outline">
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 'mapping' && csvData && selectedLayout && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Map CSV Columns</h3>
                <p className="text-muted-foreground">Using layout: <span className="text-foreground font-medium">{selectedLayout.name}</span></p>
              </div>

              <div className="space-y-4">
                {columnMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 items-center">
                    <div>
                      <Label className="text-sm text-foreground">CSV Column</Label>
                      <div className="p-2 bg-muted rounded border text-foreground">
                        {mapping.csvColumn}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-foreground">
                        Map to Column 
                        {mapping.isSkipped && <span className="text-orange-600 dark:text-orange-400 ml-2">(Skipped)</span>}
                      </Label>
                      <Select
                        value={mapping.isSkipped ? 'SKIP' : mapping.rundownColumn}
                        onValueChange={(value) => {
                          updateColumnMapping(index, 'rundownColumn', value);
                        }}
                      >
                        <SelectTrigger className="bg-background border">
                          <SelectValue placeholder="Select column or skip..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          <SelectItem value="SKIP" className="text-orange-600 dark:text-orange-400">
                            Skip this column
                          </SelectItem>
                          {availableColumns.map((col) => (
                            <SelectItem key={col.key} value={col.key} className="text-foreground">
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
                  <Label className="text-sm font-medium text-foreground">Preview (first 3 rows)</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden bg-background">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {csvData.headers.map((header, index) => {
                            const mapping = columnMappings[index];
                            return (
                              <th 
                                key={index} 
                                className={`px-3 py-2 text-left font-medium text-foreground ${
                                  mapping?.isSkipped ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' : ''
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
                          <tr key={rowIndex} className="border-t">
                            {row.map((cell, cellIndex) => {
                              const mapping = columnMappings[cellIndex];
                              return (
                                <td 
                                  key={cellIndex} 
                                  className={`px-3 py-2 text-foreground ${
                                    mapping?.isSkipped ? 'bg-orange-100 dark:bg-orange-900 text-muted-foreground' : ''
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

              <div className="flex justify-between">
                <Button onClick={goBack} variant="outline">
                  Back
                </Button>
                <Button onClick={handleImport} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
