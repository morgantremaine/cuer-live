import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FieldMapping {
  id: string;
  cuer_column_key: string;
  xpression_field_name: string;
  field_order: number;
  is_template_column: boolean;
}

interface MOSFieldMappingProps {
  teamId: string;
  mosIntegrationId: string;
}

// Standard Cuer columns that can be mapped
const CUER_COLUMNS = [
  { key: 'rowNumber', label: 'Row Number' },
  { key: 'name', label: 'Name/Title' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'endTime', label: 'End Time' },
  { key: 'elapsedTime', label: 'Elapsed Time' },
  { key: 'talent', label: 'Talent' },
  { key: 'script', label: 'Script' },
  { key: 'gfx', label: 'GFX' },
  { key: 'video', label: 'Video' },
  { key: 'images', label: 'Images' },
  { key: 'notes', label: 'Notes' },
];

export const MOSFieldMapping: React.FC<MOSFieldMappingProps> = ({ teamId, mosIntegrationId }) => {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [customColumns, setCustomColumns] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMapping, setNewMapping] = useState({
    cuerColumn: '',
    xpressionField: '',
    isTemplateColumn: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [teamId, mosIntegrationId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch existing mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('team_mos_field_mappings')
        .select('*')
        .eq('team_id', teamId)
        .eq('mos_integration_id', mosIntegrationId)
        .order('field_order', { ascending: true });

      if (mappingsError) throw mappingsError;

      // Fetch custom columns for this team
      const { data: customColumnsData, error: customColumnsError } = await supabase
        .from('team_custom_columns')
        .select('*')
        .eq('team_id', teamId);

      if (customColumnsError) throw customColumnsError;

      setMappings(mappingsData || []);
      setCustomColumns(
        (customColumnsData || []).map(col => ({
          key: col.column_key,
          label: col.column_name,
        }))
      );
    } catch (error) {
      console.error('Error fetching field mappings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load field mappings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.cuerColumn || !newMapping.xpressionField) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a Cuer column and Xpression field',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('team_mos_field_mappings')
        .insert({
          team_id: teamId,
          mos_integration_id: mosIntegrationId,
          cuer_column_key: newMapping.cuerColumn,
          xpression_field_name: newMapping.xpressionField,
          is_template_column: newMapping.isTemplateColumn,
          field_order: mappings.length,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field mapping added',
      });

      setNewMapping({
        cuerColumn: '',
        xpressionField: '',
        isTemplateColumn: false,
      });

      await fetchData();
    } catch (error) {
      console.error('Error adding field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to add field mapping',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('team_mos_field_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field mapping deleted',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting field mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete field mapping',
        variant: 'destructive',
      });
    }
  };

  const allColumns = [...CUER_COLUMNS, ...customColumns];

  const getColumnLabel = (key: string) => {
    const column = allColumns.find(col => col.key === key);
    return column?.label || key;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading field mappings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Mapping</CardTitle>
        <CardDescription>
          Map Cuer columns to Xpression template fields. These mappings control which data is sent to graphics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Mappings */}
        {mappings.length > 0 && (
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className="text-sm font-medium">{getColumnLabel(mapping.cuer_column_key)}</div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{mapping.xpression_field_name}</div>
                  {mapping.is_template_column && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Template
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => handleDeleteMapping(mapping.id)}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Mapping */}
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cuer Column</Label>
              <Select
                value={newMapping.cuerColumn}
                onValueChange={(value) => setNewMapping({ ...newMapping, cuerColumn: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="font-semibold text-xs px-2 py-1.5 text-muted-foreground">
                    Standard Columns
                  </div>
                  {CUER_COLUMNS.map((col) => (
                    <SelectItem key={col.key} value={col.key}>
                      {col.label}
                    </SelectItem>
                  ))}
                  {customColumns.length > 0 && (
                    <>
                      <div className="font-semibold text-xs px-2 py-1.5 text-muted-foreground mt-2">
                        Custom Columns
                      </div>
                      {customColumns.map((col) => (
                        <SelectItem key={col.key} value={col.key}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Xpression Field Name</Label>
              <Input
                value={newMapping.xpressionField}
                onChange={(e) => setNewMapping({ ...newMapping, xpressionField: e.target.value })}
                placeholder="e.g., F1, F2, Title"
              />
            </div>
          </div>

          <Button onClick={handleAddMapping} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Field Mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
