
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
              src="/lovable-uploads/5d70286b-5caf-42c6-9b69-ab57d3ccba4e.png" 
              alt="Cuer Logo" 
              className="h-8 w-auto mr-3"
            />
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Welcome, {userEmail}</span>
            <Button variant="outline" onClick={onSignOut} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
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
