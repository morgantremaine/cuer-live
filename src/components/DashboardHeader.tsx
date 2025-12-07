import { Button } from '@/components/ui/button'
import { ArrowLeft, User, LogOut, HelpCircle, Crown, ChevronDown, Shield, Users, ArrowLeftRight, Plus, Mail } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'
import CuerLogo from '@/components/common/CuerLogo'
import { Team, UserTeam } from '@/hooks/useTeam'
import { usePendingInvitationsForMe } from '@/hooks/usePendingInvitationsForMe'

interface DashboardHeaderProps {
  userEmail?: string
  onSignOut: () => void
  showBackButton?: boolean
  onBack?: () => void
  team?: Team | null
  allUserTeams?: UserTeam[]
  userRole?: 'admin' | 'member' | 'manager' | 'showcaller' | 'teleprompter'
  switchToTeam?: (teamId: string) => Promise<void>
  subscriptionTier?: string | null
  onCreateTeam?: () => void
}

const DashboardHeader = ({ 
  userEmail, 
  onSignOut, 
  showBackButton = false, 
  onBack,
  team,
  allUserTeams = [],
  userRole,
  switchToTeam,
  subscriptionTier,
  onCreateTeam
}: DashboardHeaderProps) => {
  const navigate = useNavigate()
  const { count: pendingInvitationCount } = usePendingInvitationsForMe()

  const handleHelpClick = () => {
    window.open('/help', '_blank');
  };

  const handleTeamSwitch = (teamId: string) => {
    console.log('🔄 DashboardHeader - Team switch requested:', { teamId, currentTeam: team?.id });
    if (switchToTeam) {
      switchToTeam(teamId);
    }
  }

  const handleViewInvitations = () => {
    navigate('/account?tab=team');
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-32">
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
              <CuerLogo isDark={true} />
            </div>

            {/* Team Selector - Prominent Left Position */}
            {team && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-gray-900 border-gray-600 text-white hover:bg-gray-900/80 hover:border-gray-500 shadow-lg px-4 py-2 h-auto"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-blue-500/20 rounded-md">
                        <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 font-normal">Current Team</span>
                        <div className="flex items-center space-x-2">
                          {userRole === 'admin' ? (
                            <Crown className="h-3.5 w-3.5 text-blue-400" />
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
                <DropdownMenuContent align="start" className="w-72 bg-gray-800 border-gray-700 z-50">
                  <div className="px-3 py-2 text-sm font-semibold text-gray-300 border-b border-gray-700">
                    Switch Team
                  </div>
                  {allUserTeams.map((userTeam) => (
                    <DropdownMenuItem
                      key={userTeam.id}
                      onClick={() => handleTeamSwitch(userTeam.id)}
                      className={`flex items-center justify-between px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer ${
                        team.id === userTeam.id ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-md ${userTeam.role === 'admin' ? 'bg-blue-500/20' : 'bg-gray-600/20'}`}>
                          {userTeam.role === 'admin' ? (
                            <Crown className="h-4 w-4 text-blue-400" />
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
                  
                  {subscriptionTier === 'Enterprise' && onCreateTeam && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onCreateTeam}
                        className="flex items-center space-x-3 px-3 py-3 text-blue-400 hover:text-blue-300 hover:bg-gray-700 cursor-pointer"
                      >
                        <div className="p-1.5 bg-blue-500/20 rounded-md">
                          <Plus className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Create New Team</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Pending Invitations Notification */}
            {pendingInvitationCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewInvitations}
                className="relative text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Mail className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full">
                  {pendingInvitationCount}
                </span>
                <span className="ml-2 hidden sm:inline">Team Invite{pendingInvitationCount > 1 ? 's' : ''}</span>
              </Button>
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