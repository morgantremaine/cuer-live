import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { ArrowLeft, Search, BookOpen, Users, Zap } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

const glossaryTerms: GlossaryTerm[] = [
  // Show Production & Timing
  { term: "Rundown", definition: "A detailed outline of a show's segments, timing, and content order.", category: "Show Production & Timing" },
  { term: "Segment", definition: "An individual block of content within a show.", category: "Show Production & Timing" },
  { term: "Floating Segment", definition: "A flexible segment that can move within the rundown to accommodate time.", category: "Show Production & Timing" },
  { term: "Hard Out", definition: "A non-negotiable end time for a show or segment.", category: "Show Production & Timing" },
  { term: "Pad", definition: "Extra content used to fill time if the show is running short.", category: "Show Production & Timing" },
  { term: "Backtime", definition: "Working backward from a hard out to determine when segments should start.", category: "Show Production & Timing" },
  { term: "Tease", definition: "A preview of upcoming content designed to keep viewers watching.", category: "Show Production & Timing" },
  { term: "Cold Open", definition: "Starting a show without an introduction or opening sequence.", category: "Show Production & Timing" },
  { term: "Bumper", definition: "Short content or graphics used before/after commercial breaks.", category: "Show Production & Timing" },
  { term: "Tag", definition: "Additional information or final comment added at the end of a segment.", category: "Show Production & Timing" },
  { term: "Throw", definition: "Transitioning from one segment, location, or talent to another.", category: "Show Production & Timing" },
  { term: "Toss", definition: "A conversational handoff between anchors or correspondents.", category: "Show Production & Timing" },

  // Technical & Production Terms
  { term: "A-Roll", definition: "Primary footage, usually interview or main content.", category: "Technical & Production" },
  { term: "B-Roll", definition: "Supplemental footage used to cover edits or illustrate stories.", category: "Technical & Production" },
  { term: "SOT (Sound On Tape)", definition: "Pre-recorded audio/video content played during a broadcast.", category: "Technical & Production" },
  { term: "MOS (Mit Out Sound)", definition: "Video footage without accompanying audio, opposite of SOT. Originally 'Man On Street' or from German 'mit out sound'.", category: "Technical & Production" },
  { term: "VO (Voice Over)", definition: "Narration over video without the speaker on camera.", category: "Technical & Production" },
  { term: "VOSOT", definition: "Voice over followed by sound on tape.", category: "Technical & Production" },
  { term: "Package", definition: "A self-contained pre-produced story segment.", category: "Technical & Production" },
  { term: "Live Shot", definition: "Real-time reporting from a remote location.", category: "Technical & Production" },
  { term: "IFB (Interruptible Foldback)", definition: "Audio system allowing producers to communicate with on-air talent.", category: "Technical & Production" },
  { term: "Slate", definition: "Identification information at the beginning of a recording.", category: "Technical & Production" },
  { term: "Chyron", definition: "Lower-third graphics displaying names, titles, or information.", category: "Technical & Production" },
  { term: "Lower Third", definition: "Graphics appearing in the lower portion of the screen with text information.", category: "Technical & Production" },
  { term: "OTS (Over The Shoulder)", definition: "Graphic displayed behind an anchor.", category: "Technical & Production" },
  { term: "Full Screen", definition: "Graphic that takes up the entire screen.", category: "Technical & Production" },
  { term: "DVE (Digital Video Effects)", definition: "Electronic effects like picture-in-picture or split screens.", category: "Technical & Production" },
  { term: "Key", definition: "Layering one video source over another, often used for graphics.", category: "Technical & Production" },

  // Directing & Camera Operations
  { term: "Ready", definition: "Standby command preparing for the next action.", category: "Directing & Camera" },
  { term: "Take", definition: "Command to switch to a specified camera or source.", category: "Directing & Camera" },
  { term: "Dissolve", definition: "Gradual transition between two video sources.", category: "Directing & Camera" },
  { term: "Cut", definition: "Instant transition between sources.", category: "Directing & Camera" },
  { term: "Fade", definition: "Gradual transition to/from black.", category: "Directing & Camera" },
  { term: "Wipe", definition: "Transition where one image replaces another with a moving line.", category: "Directing & Camera" },
  { term: "Pan", definition: "Horizontal camera movement.", category: "Directing & Camera" },
  { term: "Tilt", definition: "Vertical camera movement.", category: "Directing & Camera" },
  { term: "Zoom", definition: "Adjusting focal length to move closer or further from subject.", category: "Directing & Camera" },
  { term: "Pedestal", definition: "Moving the camera up or down vertically.", category: "Directing & Camera" },
  { term: "Truck", definition: "Moving the camera left or right horizontally.", category: "Directing & Camera" },
  { term: "Push In / Pull Out", definition: "Moving the entire camera toward or away from subject.", category: "Directing & Camera" },
  { term: "Rack Focus", definition: "Shifting focus from one subject to another in the same shot.", category: "Directing & Camera" },
  { term: "Framing", definition: "Composition and positioning of subjects within the camera's view.", category: "Directing & Camera" },
  { term: "Headroom", definition: "Space between the top of a subject's head and the top of frame.", category: "Directing & Camera" },
  { term: "Lead Room / Nose Room", definition: "Space in front of a subject they're looking or moving toward.", category: "Directing & Camera" },
  { term: "Two-Shot", definition: "Camera framing showing two people.", category: "Directing & Camera" },

  // Audio Terms
  { term: "Mic Check", definition: "Testing audio levels and equipment before production.", category: "Audio" },
  { term: "Hot Mic", definition: "A live, active microphone.", category: "Audio" },
  { term: "Dead Mic", definition: "A microphone that's off or not working.", category: "Audio" },
  { term: "Gain", definition: "Audio input level adjustment.", category: "Audio" },
  { term: "Levels", definition: "Audio volume measurements.", category: "Audio" },
  { term: "Peak", definition: "Maximum audio level, often indicating distortion risk.", category: "Audio" },
  { term: "Lavalier / Lav", definition: "Small clip-on microphone.", category: "Audio" },
  { term: "Boom", definition: "Microphone on an extendable pole.", category: "Audio" },
  { term: "Ambience / Nat Sound", definition: "Natural environmental audio.", category: "Audio" },
  { term: "Room Tone", definition: "Silent background noise of a space, used in editing.", category: "Audio" },

  // Communication & Crew Terms
  { term: "10-1", definition: "Radio code indicating someone is going to the bathroom.", category: "Communication & Crew" },
  { term: "Copy That", definition: "Acknowledgment that a message was received.", category: "Communication & Crew" },
  { term: "Stand By", definition: "Prepare for imminent action.", category: "Communication & Crew" },
  { term: "Standby to Roll", definition: "Prepare to start recording.", category: "Communication & Crew" },
  { term: "Rolling", definition: "Cameras or recording devices are active.", category: "Communication & Crew" },
  { term: "Speed", definition: "Confirmation that recording has reached proper speed/sync.", category: "Communication & Crew" },
  { term: "Clear", definition: "All clear, safe to proceed, area is empty, or off-air/not being recorded or broadcast.", category: "Communication & Crew" },
  { term: "Hot", definition: "Live on air or being recorded.", category: "Communication & Crew" },
  { term: "Blocking", definition: "Planning and rehearsing movement and positioning for talent and cameras.", category: "Communication & Crew" },
  { term: "Dry Rehearsal", definition: "Walk-through without full technical elements.", category: "Communication & Crew" },
  { term: "Camera Rehearsal", definition: "Full technical rehearsal with all equipment active.", category: "Communication & Crew" },
  { term: "Run-through", definition: "Complete rehearsal from start to finish.", category: "Communication & Crew" },
  { term: "Wrap", definition: "End of production for the day or project.", category: "Communication & Crew" },
  { term: "Martini Shot", definition: "The final shot of the day.", category: "Communication & Crew" },

  // Live Production & Switching
  { term: "ISO (Isolated Camera)", definition: "Individual camera recording independent of the main program feed.", category: "Live Production & Switching" },
  { term: "PGM (Program)", definition: "The main output feed being broadcast.", category: "Live Production & Switching" },
  { term: "Preview / Preset", definition: "Next source queued to go live.", category: "Live Production & Switching" },
  { term: "Multiviewer", definition: "Display showing multiple video sources simultaneously.", category: "Live Production & Switching" },
  { term: "Clean Feed", definition: "Video output without graphics or lower thirds.", category: "Live Production & Switching" },
  { term: "Dirty Feed", definition: "Video output with all graphics included.", category: "Live Production & Switching" },
  { term: "Upstream Key", definition: "Graphic layer above the video that can be keyed on/off.", category: "Live Production & Switching" },
  { term: "Downstream Key", definition: "Final graphic layer added after all other effects.", category: "Live Production & Switching" },
  { term: "Mix-Minus", definition: "Audio feed excluding specific sources, often used for remote talent.", category: "Live Production & Switching" },
  { term: "Genlock", definition: "Synchronizing video sources to the same timing reference.", category: "Live Production & Switching" },
  { term: "Black Burst", definition: "Synchronization signal for video equipment.", category: "Live Production & Switching" },
  { term: "Color Bars", definition: "Test pattern for calibrating video equipment.", category: "Live Production & Switching" },

  // Talent & Performance
  { term: "On Your Mark", definition: "Talent should be in their designated position.", category: "Talent & Performance" },
  { term: "Hit Your Mark", definition: "Stand on your designated spot.", category: "Talent & Performance" },
  { term: "Cheat Out", definition: "Angle your body slightly toward the camera.", category: "Talent & Performance" },
  { term: "Look Down the Barrel", definition: "Look directly into the camera lens.", category: "Talent & Performance" },
  { term: "Upstage / Downstage", definition: "Away from camera / Toward camera.", category: "Talent & Performance" },
  { term: "Stage Left / Stage Right", definition: "Directions from the talent's perspective facing the audience.", category: "Talent & Performance" },
  { term: "Camera Left / Camera Right", definition: "Directions from the camera's perspective.", category: "Talent & Performance" },
  { term: "Crossing", definition: "Moving in front of another talent or camera.", category: "Talent & Performance" },
  { term: "Hold", definition: "Maintain current position or action.", category: "Talent & Performance" },
  { term: "Pancake", definition: "Heavy makeup used for TV/film.", category: "Talent & Performance" },

  // Editing & Post-Production
  { term: "In-Point", definition: "Beginning of a clip or edit.", category: "Editing & Post" },
  { term: "Out-Point", definition: "End of a clip or edit.", category: "Editing & Post" },
  { term: "J-Cut", definition: "Audio from the next shot starts before the video.", category: "Editing & Post" },
  { term: "L-Cut", definition: "Audio from the previous shot continues into the next video.", category: "Editing & Post" },
  { term: "Jump Cut", definition: "Jarring edit within the same shot or angle.", category: "Editing & Post" },
  { term: "Match Cut", definition: "Edit connecting two similar visual elements.", category: "Editing & Post" },
  { term: "Continuity", definition: "Consistency of details across shots.", category: "Editing & Post" },
  { term: "Scratch Track", definition: "Temporary audio used during editing.", category: "Editing & Post" },
  { term: "Render", definition: "Processing edits into a final video file.", category: "Editing & Post" },

  // Broadcast Specific
  { term: "Network Feed", definition: "Content provided by the main network.", category: "Broadcast Specific" },
  { term: "Affiliate", definition: "Local station associated with a larger network.", category: "Broadcast Specific" },
  { term: "Satellite Window", definition: "Scheduled time for satellite transmission.", category: "Broadcast Specific" },
  { term: "Breaking News", definition: "Urgent, unplanned news requiring immediate coverage.", category: "Broadcast Specific" },
  { term: "Breaking News Bump", definition: "Graphic or audio indicating breaking news.", category: "Broadcast Specific" },
  { term: "ENG (Electronic News Gathering)", definition: "Mobile video production for news.", category: "Broadcast Specific" },
  { term: "SNG (Satellite News Gathering)", definition: "Mobile satellite uplink for remote broadcasts.", category: "Broadcast Specific" },
  { term: "Uplink", definition: "Transmitting signal to satellite.", category: "Broadcast Specific" },
  { term: "Downlink", definition: "Receiving signal from satellite.", category: "Broadcast Specific" },
  { term: "Closed Captioning", definition: "Text display of spoken audio for accessibility.", category: "Broadcast Specific" },
  { term: "FCC (Federal Communications Commission)", definition: "US regulatory body for broadcast standards.", category: "Broadcast Specific" },

  // Streaming & Modern Production
  { term: "RTMP (Real-Time Messaging Protocol)", definition: "Protocol for streaming audio/video.", category: "Streaming & Modern" },
  { term: "Bitrate", definition: "Amount of data transmitted per second.", category: "Streaming & Modern" },
  { term: "Latency", definition: "Delay between capture and display.", category: "Streaming & Modern" },
  { term: "CDN (Content Delivery Network)", definition: "Distributed servers delivering streaming content.", category: "Streaming & Modern" },
  { term: "Simulcast", definition: "Broadcasting on multiple platforms simultaneously.", category: "Streaming & Modern" },
  { term: "VOD (Video On Demand)", definition: "Pre-recorded content available for viewing anytime.", category: "Streaming & Modern" },
  { term: "OBS (Open Broadcaster Software)", definition: "Popular open-source streaming software.", category: "Streaming & Modern" },
  { term: "Encoder", definition: "Hardware or software converting video for streaming.", category: "Streaming & Modern" },
  { term: "Stream Key", definition: "Unique identifier for authenticating a stream.", category: "Streaming & Modern" },
  { term: "Chat Moderation", definition: "Managing viewer comments during live streams.", category: "Streaming & Modern" },
  { term: "Multistreaming", definition: "Broadcasting to multiple platforms at once.", category: "Streaming & Modern" },
];

const BroadcastGlossary = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Order categories by relevance to live broadcasting
  const categoryOrder = [
    "Show Production & Timing",
    "Live Production & Switching",
    "Communication & Crew",
    "Talent & Performance",
    "Directing & Camera",
    "Technical & Production",
    "Audio",
    "Broadcast Specific",
    "Streaming & Modern",
    "Editing & Post"
  ];

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(glossaryTerms.map(term => term.category)));
    return uniqueCategories.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return indexA - indexB;
    });
  }, []);

  const filteredTerms = useMemo(() => {
    if (!searchTerm.trim()) return glossaryTerms;
    
    const search = searchTerm.toLowerCase();
    return glossaryTerms.filter(
      term =>
        term.term.toLowerCase().includes(search) ||
        term.definition.toLowerCase().includes(search)
    );
  }, [searchTerm]);

  const groupedTerms = useMemo(() => {
    return categories.map(category => ({
      category,
      terms: filteredTerms
        .filter(term => term.category === category)
        .sort((a, b) => a.term.localeCompare(b.term))
    })).filter(group => group.terms.length > 0);
  }, [categories, filteredTerms]);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinitionList",
        "name": "Broadcast Terminology Glossary",
        "description": "Comprehensive glossary of live broadcast, television production, and streaming terminology used by professionals",
        "inLanguage": "en-US",
        "numberOfItems": glossaryTerms.length,
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Tools",
            "item": "https://cuer.live/tools"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Broadcast Glossary",
            "item": "https://cuer.live/tools/broadcast-glossary"
          }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "Cuer",
        "applicationCategory": "BusinessApplication",
        "description": "Professional rundown and showcaller software for live broadcasts",
        "url": "https://cuer.live"
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Broadcast Terminology Glossary - Live Production Terms | Cuer"
        description="Comprehensive glossary of 125+ broadcast, television production, and streaming terms. From 10-1 bathroom breaks to floating segments, learn the language of live production professionals."
        keywords="broadcast terminology, production glossary, TV terms, live broadcast, production lingo, 10-1, floating segment, SOT, MOS, blocking, showcaller, rundown terms"
        canonicalUrl="https://cuer.live/tools/broadcast-glossary"
        structuredData={structuredData}
      />

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://cuer.live/uploads/cuer-logo-2.svg" 
                  alt="Cuer Logo" 
                  className="h-8"
                />
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/tools" className="hover:text-foreground transition-colors">
                Tools
              </Link>
              <span>/</span>
              <span className="text-foreground">Broadcast Glossary</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Broadcast Terminology Glossary
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master the language of live production with {glossaryTerms.length}+ essential broadcast, 
            television, and streaming terms used by professionals worldwide.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search terms or definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
          {searchTerm && (
            <p className="text-center mt-4 text-sm text-muted-foreground">
              Found {filteredTerms.length} term{filteredTerms.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Glossary Content */}
        <div className="space-y-12 mb-12">
          {groupedTerms.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">
                  No terms found matching "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          ) : (
            groupedTerms.map((group) => (
              <Card key={group.category}>
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {group.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    {group.terms.map((term) => (
                      <div key={term.term} className="border-l-2 border-primary/20 pl-4">
                        <dt className="font-semibold text-foreground mb-1">
                          {term.term}
                        </dt>
                        <dd className="text-muted-foreground">
                          {term.definition}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Anonymous User Content */}
        {!user && (
          <>
            {/* How to Use */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  How to Use This Glossary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Search:</strong> Use the search bar to quickly find specific terms or concepts</li>
                  <li>• <strong>Browse by Category:</strong> Click category headers to explore related terms</li>
                  <li>• <strong>Learn Context:</strong> Each definition includes practical usage in production</li>
                  <li>• <strong>Reference Guide:</strong> Bookmark this page for quick access during productions</li>
                </ul>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Why This Matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>Professional Communication:</strong> Speak the language of broadcast professionals</li>
                  <li>• <strong>Efficiency:</strong> Clear terminology reduces confusion during live production</li>
                  <li>• <strong>Career Development:</strong> Essential knowledge for anyone in broadcast and streaming</li>
                  <li>• <strong>Industry Standard:</strong> Terms used across television, streaming, and live events</li>
                </ul>
              </CardContent>
            </Card>

            {/* More Tools */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  More Free Broadcast Tools
                </CardTitle>
                <CardDescription>
                  Essential tools for broadcast professionals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Link to="/tools/script-timing-calculator">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-base">Script Timer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Calculate reading time for your scripts
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/tools/time-calculator">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-base">Time Calculator</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Add and subtract show timings
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/tools/countdown-clock">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-base">Countdown Clock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Professional countdown timers
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-2xl">
                  Ready to put these terms into practice?
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Use Cuer's professional rundown and showcaller software to manage your live broadcasts 
                  with floating segments, blocking tools, and real-time timing controls.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto"
                >
                  Try Cuer Free
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 py-6">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cuer. Professional broadcast terminology glossary.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BroadcastGlossary;
