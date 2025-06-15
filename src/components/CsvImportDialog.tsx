
import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parseCSV, mapCSVToRundownItems } from '@/utils/csvUtils';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { items: any[], columns: any[], title: string }) => void;
}

export const CsvImportDialog: React.FC<CsvImportDialogProps> = ({
  open,
  onOpenChange,
  onImport
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        toast({
          title: 'Empty file',
          description: 'The CSV file appears to be empty',
          variant: 'destructive',
        });
        return;
      }

      setCsvData(parsed);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: 'Error parsing CSV',
        description: 'Failed to parse the CSV file. Please check the file format.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = () => {
    if (!csvData) return;

    const { items, columns } = mapCSVToRundownItems(csvData);
    const title = fileName.replace('.csv', '') || 'Imported Rundown';

    onImport({ items, columns, title });
    
    // Reset state
    setCsvData(null);
    setFileName('');
    onOpenChange(false);

    toast({
      title: 'Import successful',
      description: `Created rundown "${title}" with ${items.length} items`,
    });
  };

  const resetImport = () => {
    setCsvData(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create a new rundown. The columns will be automatically mapped to rundown fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!csvData ? (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {isProcessing ? 'Processing file...' : 'Drag and drop your CSV file here, or'}
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  {fileName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImport}
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Preview ({csvData.length - 1} rows):
                </p>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  <div className="font-medium">
                    {csvData[0]?.join(' | ')}
                  </div>
                  {csvData.slice(1, 4).map((row, index) => (
                    <div key={index} className="text-gray-500">
                      {row.join(' | ')}
                    </div>
                  ))}
                  {csvData.length > 4 && (
                    <div className="text-gray-400">
                      ... and {csvData.length - 4} more rows
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {csvData && (
            <Button onClick={handleImport}>
              <Check className="h-4 w-4 mr-2" />
              Import Rundown
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
