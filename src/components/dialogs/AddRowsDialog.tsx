import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddRowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (count: number) => void;
  title?: string;
  description?: string;
}

export const AddRowsDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Add Segments",
  description = "How many segments would you like to add?"
}: AddRowsDialogProps) => {
  const [count, setCount] = useState<string>("1");

  const handleConfirm = () => {
    const numCount = parseInt(count, 10);
    if (numCount > 0 && numCount <= 50) {
      onConfirm(numCount);
      onOpenChange(false);
      setCount("1");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="count" className="text-right">
              Count
            </Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add {count} Segment{parseInt(count) !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
