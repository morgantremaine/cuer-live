import { Button } from '@/components/ui/button'
import { ArrowLeft, User, LogOut, HelpCircle, Crown, ChevronDown, Shield, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import CuerLogo from '@/components/common/CuerLogo'
import { useTeam } from '@/hooks/useTeam'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
  showBackButton?: boolean
  onBack?: () => void
}

const DashboardHeader = ({ userEmail, onSignOut, showBackButton = false, onBack }: DashboardHeaderProps) => {
  const navigate = useNavigate()
  const { team, allUserTeams, userRole, switchToTeam } = useTeam()

  const handleHelpClick = () => {
    window.open('/help', '_blank');
  };

  const handleTeamSwitch = (teamId: string) => {
    console.log('🔄 DashboardHeader - Team switch requested:', { teamId, currentTeam: team?.id });
    switchToTeam(teamId);
  }

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
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center">
              <CuerLogo isDark={true} />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Team Selector */}
            {team && (
              <DropdownMenu key={`dropdown-${team.id}-${team.name}-${userRole}`}>
                <DropdownMenuTrigger asChild key={`trigger-${team.id}-${team.name}`}>
                  <Button variant="ghost" className="text-gray-300 hover:text-gray-100 hover:bg-transparent">
                    <div className="flex items-center space-x-2">
                      {userRole === 'admin' ? (
                        <Shield className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Users className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="hidden sm:inline font-medium">{team.name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700 z-50" key={`content-${team.id}`}>
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-400">
                    Switch Team
                  </div>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  {allUserTeams.map((userTeam) => (
                    <DropdownMenuItem
                      key={`${userTeam.id}-${team.id === userTeam.id ? 'active' : 'inactive'}`}
                      onClick={() => handleTeamSwitch(userTeam.id)}
                      className={`flex items-center justify-between text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                        team.id === userTeam.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {userTeam.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Users className="h-4 w-4 text-gray-400" />
                        )}
                        <span>{userTeam.name}</span>
                      </div>
                      {team.id === userTeam.id && (
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
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
                  onClick={handleHelpClick}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
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