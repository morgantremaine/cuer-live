import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (teamName: string) => Promise<void>;
  isCreating: boolean;
}

const CreateTeamDialog = ({
  open,
  onOpenChange,
  onCreateTeam,
  isCreating,
}: CreateTeamDialogProps) => {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmedName = teamName.trim();
    
    if (!trimmedName) {
      setError('Team name cannot be empty');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Team name must be 50 characters or less');
      return;
    }

    try {
      await onCreateTeam(trimmedName);
      setTeamName('');
      setError('');
    } catch (err) {
      setError('Failed to create team');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setTeamName('');
        setError('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Team</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a name for your new team. You will be the admin.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="team-name" className="text-foreground">
              Team Name
            </Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError('');
              }}
              placeholder="My Team"
              maxLength={50}
              disabled={isCreating}
              className="bg-gray-700 border-gray-600 text-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreate();
                }
              }}
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {teamName.length}/50 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
            className="bg-gray-700 text-foreground border-gray-600 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !teamName.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isCreating ? 'Creating...' : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
