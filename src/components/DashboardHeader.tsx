
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
}

const DashboardHeader = ({ userEmail, onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="bg-gray-800 shadow-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/d3829867-67da-4acb-a6d3-66561a4e60e7.png" 
              alt="Cuer Logo" 
              className="h-8 w-auto mr-3"
            />
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Welcome, {userEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardHeader
