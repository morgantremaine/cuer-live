
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface CreateNewButtonProps {
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  onDisabledClick?: () => void
}

const CreateNewButton = ({ onClick, disabled = false, disabledReason, onDisabledClick }: CreateNewButtonProps) => {
  const handleClick = () => {
    if (disabled && onDisabledClick) {
      onDisabledClick();
    } else if (!disabled) {
      onClick();
    }
  };

  const button = (
    <Button 
      onClick={handleClick} 
      size="lg" 
      className={`border-0 ${disabled 
        ? 'bg-blue-400 text-white opacity-60 cursor-pointer' 
        : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
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
