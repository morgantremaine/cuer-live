import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lightbulb, Radio, Clock, Users, Bot, Monitor, Share2, Eye, FileText, FolderOpen, BarChart3 } from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  details: string[];
  icon: React.ComponentType<any>;
}

interface WorkflowStage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: Feature[];
}

const workflowStages: WorkflowStage[] = [
  {
    id: 'planning',
    title: 'Planning & Pre-Production',
    description: 'Build, organize, and prepare your rundown with intelligent tools',
    icon: Lightbulb,
    color: 'from-blue-500 to-purple-600',
    features: [
      {
        id: 'ai-assistant',
        title: 'AI Assistant',
        description: 'Catch problems before they happen with intelligent analysis and suggestions.',
        image: '/uploads/d4e97f8e-fc43-4829-9671-f784ebd3ce47.png',
        alt: 'Cuer AI Assistant Interface',
        details: [
          'Real-time rundown analysis',
          'Issue detection and solutions',
          'Content and timing suggestions',
          'Show flow optimization'
        ],
        icon: Bot
      },
      {
        id: 'smart-planning',
        title: 'Smart Planning',
        description: 'Organize show elements with Cuer Blueprints using smart checklists and intuitive filtering tools.',
        image: '/uploads/0dd96b7d-2278-4e88-abd7-ebff65c98dd7.png',
        alt: 'Blueprint Planning Interface',
        details: [
          'Smart filtering and organization',
          'Checklist management',
          'Blueprint mode planning',
          'Template system'
        ],
        icon: FolderOpen
      },
      {
        id: 'team-collaboration',
        title: 'Team Collaboration',
        description: 'Role-based permissions and real-time collaboration across your organization.',
        image: '/uploads/c1aca8d4-0287-46a0-ab8d-f31ce3d5cbbd.png',
        alt: 'Team Management Interface',
        details: [
          'Role-based permissions',
          'Real-time collaboration',
          'Team member management',
          'Access control'
        ],
        icon: Users
      },
      {
        id: 'rich-documentation',
        title: 'Rich Documentation',
        description: 'Capture show notes with rich formatting and collaborative editing capabilities.',
        image: '/uploads/d8bd00f7-e579-4df8-8fcf-4d4c1466eae9.png',
        alt: 'Notes and Documentation',
        details: [
          'Rich text formatting',
          'Searchable documentation',
          'Collaborative editing',
          'Version history'
        ],
        icon: FileText
      }
    ]
  },
  {
    id: 'broadcasting',
    title: 'Live Production & Broadcasting',
    description: 'Execute flawless shows with real-time controls and professional displays',
    icon: Radio,
    color: 'from-green-500 to-blue-600',
    features: [
      {
        id: 'live-show-control',
        title: 'Live Show Control',
        description: 'Real-time timing and status tracking keeps your entire production team synchronized.',
        image: '/uploads/68360f2b-6961-47f6-a334-0ac01a4de303.png',
        alt: 'Live Show Controls',
        details: [
          'Real-time timing controls',
          'Status tracking for all segments',
          'Team synchronization',
          'Live cue management'
        ],
        icon: Clock
      },
      {
        id: 'control-room',
        title: 'Control Room Display',
        description: 'Dedicated AD view with live timing, perfect for multiviewer displays.',
        image: '/uploads/832f09fb-bddb-4ced-b089-44bc34a1ac96.png',
        alt: 'AD View Dashboard',
        details: [
          'Live timing display',
          'Current script panel',
          'Multiviewer integration',
          'Status tracking'
        ],
        icon: Monitor
      },
      {
        id: 'teleprompter',
        title: 'Professional Teleprompter',
        description: 'Full-screen mode with speed controls and real-time script sync.',
        image: '/uploads/1461f5d6-383a-421e-ade7-2791f4afce6c.png',
        alt: 'Teleprompter Full Screen',
        details: [
          'Full-screen display',
          'Speed controls',
          'Real-time sync',
          'Formatting options'
        ],
        icon: Eye
      },
      {
        id: 'stakeholder-views',
        title: 'Stakeholder Views',
        description: 'Share read-only rundowns with clients and executives. No login required.',
        image: '/uploads/f4dc4d90-0508-49ae-8aad-abaaf909a734.png',
        alt: 'Shared Rundown View',
        details: [
          'Public sharing links',
          'Read-only access',
          'No login required',
          'External viewing'
        ],
        icon: Share2
      },
      {
        id: 'project-overview',
        title: 'Project Overview',
        description: 'Comprehensive rundown cards with segment counts, duration, and activity tracking.',
        image: '/uploads/fda659c6-14fe-4a8f-9b42-efba05fb6022.png',
        alt: 'Detailed Rundown Card Interface',
        details: [
          'Real-time activity tracking',
          'Segment and header counts',
          'Total duration display',
          'Quick access to all modes'
        ],
        icon: BarChart3
      }
    ]
  }
];

export const FeatureExplorer: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string>('broadcasting');
  const [activeFeature, setActiveFeature] = useState<string>('live-show-control');

  const currentStage = workflowStages.find(stage => stage.id === activeStage);
  const currentFeature = currentStage?.features.find(feature => feature.id === activeFeature);

  return (
    <div className="space-y-12">
      {/* Workflow Stage Tabs - Much Bigger */}
      <div className="flex justify-center">
        <div className="flex flex-col lg:flex-row gap-6 max-w-4xl w-full">
          {workflowStages.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <Button
                key={stage.id}
                variant="ghost"
                size="lg"
                onClick={() => {
                  setActiveStage(stage.id);
                  setActiveFeature(stage.features[0].id);
                }}
                className={`
                  relative p-8 h-auto flex-1 text-left transition-all duration-500 group
                  ${isActive 
                    ? `bg-gradient-to-br ${stage.color} text-white shadow-2xl scale-105 border-transparent` 
                    : 'bg-slate-800/30 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50 hover:scale-102'
                  }
                  rounded-2xl backdrop-blur-sm
                `}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`
                    p-6 rounded-full transition-all duration-300
                    ${isActive 
                      ? 'bg-white/20 shadow-lg' 
                      : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                    }
                  `}>
                    <stage.icon className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{stage.title}</h3>
                    <p className={`text-sm leading-relaxed ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                      {stage.description}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Feature Buttons */}
      {currentStage && (
        <div className="animate-fade-in">
          <div className="flex justify-center">
            <div className={`
              gap-4 
              ${currentStage.features.length === 4 
                ? 'grid grid-cols-2 lg:grid-cols-4 max-w-4xl' 
                : 'grid grid-cols-2 lg:grid-cols-5 max-w-5xl'
              }
            `}>
              {currentStage.features.map((feature) => {
                const isActive = activeFeature === feature.id;
                return (
                  <Button
                    key={feature.id}
                    variant={isActive ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setActiveFeature(feature.id)}
                    className={`
                      flex flex-col items-center space-y-3 p-6 h-auto text-center transition-all duration-300
                      ${isActive 
                        ? 'bg-slate-700 text-white border-slate-600 shadow-lg scale-105' 
                        : 'bg-slate-800/30 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:text-white hover:scale-102'
                      }
                      rounded-xl
                    `}
                  >
                    <div className={`
                      p-3 rounded-lg transition-all duration-300
                      ${isActive ? 'bg-slate-600/50' : 'bg-slate-700/50'}
                    `}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium leading-tight">{feature.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feature Display */}
      {currentFeature && (
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 animate-fade-in">
          <CardContent className="p-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-lg bg-slate-700/50">
                    <currentFeature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white">{currentFeature.title}</h3>
                </div>
                <p className="text-xl text-slate-400 leading-relaxed">
                  {currentFeature.description}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {currentFeature.details.map((detail, index) => (
                    <div key={index} className="flex items-center space-x-2 text-slate-300">
                      <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="group fade-up">
                <img 
                  src={currentFeature.image}
                  alt={currentFeature.alt}
                  className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};