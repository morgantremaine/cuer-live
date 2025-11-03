import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MOSFieldMapperProps {
  teamId: string;
  integrationId: string;
}

interface FieldMapping {
  id?: string;
  cuer_column_key: string;
  xpression_field_name: string;
  is_template_column: boolean;
  field_order: number;
}

interface Column {
  key: string;
  name: string;
}

const STANDARD_COLUMNS: Column[] = [
  { key: 'name', name: 'Name' },
  { key: 'talent', name: 'Talent' },
  { key: 'script', name: 'Script' },
  { key: 'gfx', name: 'GFX' },
  { key: 'video', name: 'Video' },
  { key: 'notes', name: 'Notes' },
];

const COMMON_XPRESSION_FIELDS = [
  'Template',
  'Name',
  'Title',
  'Description',
  'Headline',
  'Location',
  'MainText',
  'SecondaryText',
  'CustomField1',
  'CustomField2',
  'CustomField3',
  'CustomField4',
  'CustomField5',
];

const MOSFieldMapper: React.FC<MOSFieldMapperProps> = ({ teamId, integrationId }) => {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [availableColumns, setAvailableColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [teamId, integrationId]);

  const fetchData = async () => {
    try {
      // Fetch custom columns
      const { data: customColumns, error: columnsError } = await supabase
        .from('team_custom_columns')
        .select('column_key, column_name')
        .eq('team_id', teamId);

      if (columnsError) throw columnsError;

      const allColumns = [
        ...STANDARD_COLUMNS,
        ...(customColumns || []).map(col => ({
          key: col.column_key,
          name: col.column_name,
        })),
      ];
      setAvailableColumns(allColumns);

      // Fetch existing mappings
      const { data: existingMappings, error: mappingsError } = await supabase
        .from('team_mos_field_mappings')
        .select('*')
        .eq('team_id', teamId)
        .order('field_order');

      if (mappingsError) throw mappingsError;

      if (existingMappings && existingMappings.length > 0) {
        setMappings(existingMappings);
      } else {
        // Default mapping for lower third
        setMappings([
          {
            cuer_column_key: 'gfx',
            xpression_field_name: 'Template',
            is_template_column: true,
            field_order: 0,
          },
          {
            cuer_column_key: 'talent',
            xpression_field_name: 'Name',
            is_template_column: false,
            field_order: 1,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching field mapper data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load field mappings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = () => {
    setMappings([
      ...mappings,
      {
        cuer_column_key: '',
        xpression_field_name: '',
        is_template_column: false,
        field_order: mappings.length,
      },
    ]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleUpdateMapping = (index: number, field: keyof FieldMapping, value: any) => {
    const updated = [...mappings];
    
    // If setting as template column, unset others
    if (field === 'is_template_column' && value === true) {
      updated.forEach((m, i) => {
        if (i !== index) {
          m.is_template_column = false;
        }
      });
    }
    
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleSave = async () => {
    // Validate
    const hasTemplateColumn = mappings.some(m => m.is_template_column);
    if (!hasTemplateColumn) {
      toast({
        title: 'Validation Error',
        description: 'Please select one column as the template column',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptyFields = mappings.some(m => !m.cuer_column_key || !m.xpression_field_name);
    if (hasEmptyFields) {
      toast({
        title: 'Validation Error',
        description: 'All mappings must have both Cuer column and XPression field selected',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Delete existing mappings
      await supabase
        .from('team_mos_field_mappings')
        .delete()
        .eq('team_id', teamId);

      // Insert new mappings
      const { error } = await supabase
        .from('team_mos_field_mappings')
        .insert(
          mappings.map((m, index) => ({
            team_id: teamId,
            mos_integration_id: integrationId,
            cuer_column_key: m.cuer_column_key,
            xpression_field_name: m.xpression_field_name,
            is_template_column: m.is_template_column,
            field_order: index,
          }))
        );

      if (error) throw error;

      toast({
        title: 'Mappings saved',
        description: 'Field mappings have been updated',
      });
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save field mappings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: 'lower-third' | 'breaking-news' | 'full-screen') => {
    let newMappings: FieldMapping[] = [];
    
    switch (preset) {
      case 'lower-third':
        newMappings = [
          { cuer_column_key: 'gfx', xpression_field_name: 'Template', is_template_column: true, field_order: 0 },
          { cuer_column_key: 'talent', xpression_field_name: 'Name', is_template_column: false, field_order: 1 },
          { cuer_column_key: 'name', xpression_field_name: 'Title', is_template_column: false, field_order: 2 },
        ];
        break;
      case 'breaking-news':
        newMappings = [
          { cuer_column_key: 'gfx', xpression_field_name: 'Template', is_template_column: true, field_order: 0 },
          { cuer_column_key: 'script', xpression_field_name: 'Headline', is_template_column: false, field_order: 1 },
          { cuer_column_key: 'notes', xpression_field_name: 'Location', is_template_column: false, field_order: 2 },
        ];
        break;
      case 'full-screen':
        newMappings = [
          { cuer_column_key: 'gfx', xpression_field_name: 'Template', is_template_column: true, field_order: 0 },
          { cuer_column_key: 'name', xpression_field_name: 'MainText', is_template_column: false, field_order: 1 },
          { cuer_column_key: 'script', xpression_field_name: 'SecondaryText', is_template_column: false, field_order: 2 },
        ];
        break;
    }
    
    setMappings(newMappings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Mapping</CardTitle>
        <CardDescription>
          Map Cuer columns to XPression template fields
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => applyPreset('lower-third')}>
            Lower Third Preset
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('breaking-news')}>
            Breaking News Preset
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('full-screen')}>
            Full Screen Preset
          </Button>
        </div>

        {/* Mappings */}
        <div className="space-y-3">
          {mappings.map((mapping, index) => (
            <div key={index} className="flex items-end gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 space-y-2">
                <Label>Cuer Column</Label>
                <Select
                  value={mapping.cuer_column_key}
                  onValueChange={(value) => handleUpdateMapping(index, 'cuer_column_key', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>XPression Field</Label>
                <Select
                  value={mapping.xpression_field_name}
                  onValueChange={(value) => handleUpdateMapping(index, 'xpression_field_name', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_XPRESSION_FIELDS.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`template-${index}`}
                  checked={mapping.is_template_column}
                  onCheckedChange={(checked) =>
                    handleUpdateMapping(index, 'is_template_column', checked)
                  }
                />
                <Label htmlFor={`template-${index}`} className="text-xs whitespace-nowrap">
                  Template
                </Label>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMapping(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={handleAddMapping} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Mappings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MOSFieldMapper;
