
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface CreateNewButtonProps {
  onClick: () => void
}

const CreateNewButton = ({ onClick }: CreateNewButtonProps) => {
  return (
    <Button 
      onClick={onClick} 
      size="lg" 
      className="bg-blue-600 hover:bg-blue-700 text-white border-0"
    >
      <Plus className="h-5 w-5 mr-2" />
      Create New Rundown
    </Button>
  )
}

export default CreateNewButton
