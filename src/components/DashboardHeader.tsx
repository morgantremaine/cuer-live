
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
  showBackButton?: boolean
  onBack?: () => void
}

const DashboardHeader = ({ userEmail, onSignOut, showBackButton = false, onBack }: DashboardHeaderProps) => {
  const navigate = useNavigate()

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/da2200e5-3194-4f43-8ec0-9266a479bbf0.png" 
                alt="Cuer Logo" 
                className="h-6 w-auto"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-300 hover:text-gray-100 hover:bg-transparent">
                  <User className="h-4 w-4 mr-2" />
                  {userEmail}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
                <DropdownMenuItem 
                  onClick={() => navigate('/account')}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onSignOut}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
