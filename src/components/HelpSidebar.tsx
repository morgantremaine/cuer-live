import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  MousePointer,
  Users,
  Wifi,
  Radio,
  Bot,
  Share2,
  Eye,
  Upload,
  Monitor,
  Keyboard,
  HelpCircle,
  Search
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';

const helpSections = [
  { id: 'getting-started', title: 'Getting Started', icon: FileText },
  { id: 'basic-operations', title: 'Basic Operations', icon: MousePointer },
  { id: 'column-manager', title: 'Column Manager', icon: FileText },
  { id: 'find-replace', title: 'Find & Replace', icon: Search },
  { id: 'team-collaboration', title: 'Team Collaboration', icon: Users },
  { id: 'connection-status', title: 'Connection Status', icon: Wifi },
  { id: 'showcaller', title: 'Showcaller', icon: Radio },
  { id: 'ai-helper', title: 'AI Helper', icon: Bot },
  { id: 'blueprints', title: 'Blueprints', icon: FileText },
  { id: 'shared-rundowns', title: 'Shared Rundowns', icon: Share2 },
  { id: 'ad-view', title: 'AD View', icon: Eye },
  { id: 'csv-import', title: 'CSV Import', icon: Upload },
  { id: 'teleprompter', title: 'Teleprompter', icon: Monitor },
  { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'support', title: 'Support', icon: HelpCircle }
];

export function HelpSidebar() {
  const { state } = useSidebar();
  const [activeSection, setActiveSection] = useState('getting-started');

  // Handle smooth scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Track which section is currently in view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    helpSections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Sidebar
      className={state === 'collapsed' ? "w-14 bg-gray-800 dark:bg-gray-800 border-r border-gray-700" : "w-64 bg-gray-800 dark:bg-gray-800 border-r border-gray-700"}
      collapsible="icon"
    >
      <SidebarContent className="bg-gray-800 dark:bg-gray-800">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-300 dark:text-gray-300 px-3 py-2 text-sm font-medium">
            Help Topics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpSections.map((section) => (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton
                    onClick={() => scrollToSection(section.id)}
                    className={`cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700 rounded-md mx-2 ${
                      activeSection === section.id
                        ? 'bg-gray-700 text-white font-medium'
                        : ''
                    }`}
                  >
                    <section.icon className="h-4 w-4" />
                    {state !== 'collapsed' && <span>{section.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}