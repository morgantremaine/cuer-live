
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, LogOut, HelpCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import CuerLogo from '@/components/common/CuerLogo'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
  showBackButton?: boolean
  onBack?: () => void
}

const DashboardHeader = ({ userEmail, onSignOut, showBackButton = false, onBack }: DashboardHeaderProps) => {
  const navigate = useNavigate()

  const handleHelpClick = () => {
    window.open('/help', '_blank');
  };

  return (
    <header className="bg-black border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center">
              <CuerLogo isDark={true} />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-neutral-400 hover:text-white hover:bg-transparent">
                  <User className="h-4 w-4 mr-2" />
                  {userEmail}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700 z-50">
                <DropdownMenuItem 
                  onClick={() => navigate('/account')}
                  className="text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
                >
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleHelpClick}
                  className="text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onSignOut}
                  className="text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
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
