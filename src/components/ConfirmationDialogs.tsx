
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DialogState {
  open: boolean
  rundownId: string
  title: string
}

interface ConfirmationDialogsProps {
  deleteDialog: DialogState
  archiveDialog: DialogState
  onDeleteDialogChange: (state: DialogState) => void
  onArchiveDialogChange: (state: DialogState) => void
  onConfirmDelete: () => void
  onConfirmArchive: () => void
}

const ConfirmationDialogs = ({
  deleteDialog,
  archiveDialog,
  onDeleteDialogChange,
  onArchiveDialogChange,
  onConfirmDelete,
  onConfirmArchive
}: ConfirmationDialogsProps) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => onDeleteDialogChange({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteDialog.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialog.open} onOpenChange={(open) => onArchiveDialogChange({ ...archiveDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Rundown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archiveDialog.title}"? You can still access it in the archived section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ConfirmationDialogs
