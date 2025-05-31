
import { Button } from '@/components/ui/button'
import { FileText, LogOut } from 'lucide-react'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
}

const DashboardHeader = ({ userEmail, onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">Cuer</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {userEmail}</span>
            <Button variant="outline" onClick={onSignOut}>
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
