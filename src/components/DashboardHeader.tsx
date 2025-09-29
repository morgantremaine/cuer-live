import { Button } from '@/components/ui/button'
import { ArrowLeft, User, LogOut, HelpCircle, Crown, ChevronDown, Shield, Users, ArrowLeftRight } from 'lucide-react'
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
          <div className="flex items-center space-x-6">
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

            {/* Team Selector - Prominent Left Position */}
            {team && (
              <DropdownMenu key={`dropdown-${team.id}-${team.name}-${userRole}`}>
                <DropdownMenuTrigger asChild key={`trigger-${team.id}-${team.name}`}>
                  <Button 
                    variant="outline" 
                    className="bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700 hover:border-gray-500 shadow-lg px-4 py-2 h-auto"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-blue-500/20 rounded-md">
                        <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 font-normal">Current Team</span>
                        <div className="flex items-center space-x-2">
                          {userRole === 'admin' ? (
                            <Shield className="h-3.5 w-3.5 text-blue-400" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-gray-400" />
                          )}
                          <span className="font-semibold text-sm">{team.name}</span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400 ml-2" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-gray-800 border-gray-700 z-50" key={`content-${team.id}`}>
                  <div className="px-3 py-2 text-sm font-semibold text-gray-300 border-b border-gray-700">
                    Switch Team
                  </div>
                  {allUserTeams.map((userTeam) => (
                    <DropdownMenuItem
                      key={`${userTeam.id}-${team.id === userTeam.id ? 'active' : 'inactive'}`}
                      onClick={() => handleTeamSwitch(userTeam.id)}
                      className={`flex items-center justify-between px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                        team.id === userTeam.id ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-md ${userTeam.role === 'admin' ? 'bg-blue-500/20' : 'bg-gray-600/20'}`}>
                          {userTeam.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Users className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{userTeam.name}</span>
                          <span className="text-xs text-gray-500">{userTeam.role}</span>
                        </div>
                      </div>
                      {team.id === userTeam.id && (
                        <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
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