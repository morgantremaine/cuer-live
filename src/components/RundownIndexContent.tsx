import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Edit, Eye, Trash2, Upload } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { deleteRundown, duplicateRundown } from '@/lib/rundownUtils';
import { useUserColumnPreferences } from '@/hooks/useUserColumnPreferences';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from "@/components/ui/skeleton"
import { useSupabase } from '@/contexts/SupabaseContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Navigation } from 'lucide-react';
import { Clock } from 'lucide-react';
import { RundownContainer } from './RundownContainer';

interface RundownIndexContentProps {
  autoScroll?: boolean;
  onToggleAutoScroll?: (enabled: boolean) => void;
}

const RundownIndexContent = ({ autoScroll, onToggleAutoScroll }: RundownIndexContentProps) => {
  const { user, loading: authLoading } = useAuth();
  const { supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast()
  const [rundowns, setRundowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newRundownTitle, setNewRundownTitle] = useState('');
  const [activeRundownId, setActiveRundownId] = useState(null);
  const { isDark } = useTheme();
  const [isImporting, setIsImporting] = useState(false);

  // Load user column preferences - this must be done before rendering the table
  const { 
    userColumnPreferences, 
    loading: columnPreferencesLoading, 
    error: columnPreferencesError 
  } = useUserColumnPreferences();

  useEffect(() => {
    if (columnPreferencesError) {
      console.error('❌ Error loading user column preferences:', columnPreferencesError);
    }
  }, [columnPreferencesError]);

  useEffect(() => {
    if (!supabase || !user) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    const fetchRundowns = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('rundowns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
        } else {
          setRundowns(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRundowns();

    // Subscribe to rundown changes
    const channel = supabase
      .channel('public:rundowns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rundowns' }, (payload) => {
        if (payload.new && payload.new.user_id !== user.id) {
          return;
        }
        fetchRundowns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, authLoading]);

  const handleCreateRundown = async () => {
    if (!newRundownTitle.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty.",
        variant: "destructive",
      })
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .insert([{ user_id: user.id, title: newRundownTitle }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        setRundowns([data, ...rundowns]);
        setNewRundownTitle('');
        toast({
          title: "Success",
          description: "Rundown created successfully.",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  };

  const handleDuplicateRundown = async (rundownId: string) => {
    setLoading(true);
    try {
      await duplicateRundown(supabase, rundownId, user.id);
      toast({
        title: "Success",
        description: "Rundown duplicated successfully.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRundown = async (rundownId: string) => {
    setLoading(true);
    try {
      await deleteRundown(supabase, rundownId);
      setRundowns(rundowns.filter(rundown => rundown.id !== rundownId));
      toast({
        title: "Success",
        description: "Rundown deleted successfully.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: "Error",
        description: "No file selected.",
        variant: "destructive",
      })
      return;
    }

    setIsImporting(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          try {
            const jsonData = JSON.parse(content);
            // Validate that jsonData is an array
            if (!Array.isArray(jsonData)) {
              throw new Error('Invalid JSON format: The file must contain an array of rundown items.');
            }

            // Validate that each item in jsonData has the required fields
            jsonData.forEach(item => {
              if (typeof item !== 'object' || item === null) {
                throw new Error('Invalid JSON format: Each item must be an object.');
              }
              if (!item.segmentName || typeof item.segmentName !== 'string') {
                throw new Error('Invalid JSON format: Each item must have a segmentName property of type string.');
              }
              if (!item.duration || typeof item.duration !== 'string') {
                throw new Error('Invalid JSON format: Each item must have a duration property of type string.');
              }
            });

            // If all validations pass, proceed to create the rundown
            const { data: rundownData, error: rundownError } = await supabase
              .from('rundowns')
              .insert([{ user_id: user.id, title: file.name.replace('.json', '') }])
              .select()
              .single();

            if (rundownError) {
              throw new Error(rundownError.message);
            }

            // Now that the rundown is created, insert the items
            const rundownId = rundownData.id;
            const itemsToInsert = jsonData.map(item => ({
              ...item,
              rundown_id: rundownId,
              user_id: user.id,
            }));

            const { error: itemsError } = await supabase
              .from('rundown_items')
              .insert(itemsToInsert);

            if (itemsError) {
              // If there's an error inserting items, delete the rundown
              await supabase
                .from('rundowns')
                .delete()
                .eq('id', rundownId);
              throw new Error(itemsError.message);
            }

            // Update the state and show a success message
            setRundowns([rundownData, ...rundowns]);
            toast({
              title: "Success",
              description: "Rundown imported successfully.",
            })
          } catch (parseError) {
            toast({
              title: "Error",
              description: parseError.message,
              variant: "destructive",
            })
          }
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read the file.",
          variant: "destructive",
        })
        setIsImporting(false);
      };
      reader.readAsText(file);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Please sign in to continue</div>
          <Button onClick={() => router.push('/signin')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="New rundown title"
            value={newRundownTitle}
            onChange={(e) => setNewRundownTitle(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleCreateRundown} disabled={loading}>
            Create Rundown
          </Button>
          <label htmlFor="import-rundown" className="cursor-pointer">
            <Button variant="secondary" disabled={isImporting}>
              <Upload className="w-4 h-4 mr-2" />
              Import Rundown
            </Button>
          </label>
          <input
            id="import-rundown"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
      
      {activeRundownId ? (
        <RundownContainer 
          rundownId={activeRundownId}
          autoScroll={autoScroll}
          onToggleAutoScroll={onToggleAutoScroll}
        />
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <Table>
            <TableCaption>A list of your rundowns.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Title</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Show skeleton loaders while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rundowns.length === 0 ? (
                // Show message when there are no rundowns
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No rundowns created yet.</TableCell>
                </TableRow>
              ) : (
                // Show rundowns
                rundowns.map((rundown) => (
                  <TableRow key={rundown.id}>
                    <TableCell className="font-medium">{rundown.title}</TableCell>
                    <TableCell>{new Date(rundown.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setActiveRundownId(rundown.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/rundown/${rundown.id}`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateRundown(rundown.id)} disabled={loading}>
                            <Plus className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete your rundown and all of its data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRundown(rundown.id)} disabled={loading}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RundownIndexContent;
