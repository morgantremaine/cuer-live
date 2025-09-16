
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CreateNewButtonProps {
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
}

const CreateNewButton = ({ onClick, disabled = false, disabledReason }: CreateNewButtonProps) => {
  const button = (
    <Button 
      onClick={onClick} 
      size="lg" 
      disabled={disabled}
      className="bg-blue-600 hover:bg-blue-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus className="h-5 w-5 mr-2" />
      Create New Rundown
    </Button>
  );

  if (disabled && disabledReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

export default CreateNewButton
