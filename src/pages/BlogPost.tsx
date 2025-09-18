import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';

// Sample blog post content - in a real app, this would come from a CMS or database
const blogPosts = {
  'the-future-of-broadcast-production': {
    title: 'The Future of Broadcast Production: How AI is Transforming Live TV',
    excerpt: 'Discover how artificial intelligence is revolutionizing the way we produce live television, from automated cue timing to intelligent content suggestions.',
    heroImage: '/uploads/ai-broadcast-hero.jpg',
    author: 'Sarah Chen',
    publishDate: '2024-01-15',
    readTime: '6 min read',
    category: 'Technology',
    content: `
      <p>The broadcast industry is experiencing a fundamental transformation. As artificial intelligence becomes more sophisticated, its applications in live television production are expanding rapidly, offering unprecedented opportunities for efficiency, accuracy, and creative enhancement.</p>

      <h2>The Current State of AI in Broadcasting</h2>
      <p>Traditional broadcast production relies heavily on human decision-making and manual processes. From timing cues to content management, production teams must coordinate multiple elements simultaneously while maintaining split-second precision. This complexity often leads to errors and inefficiencies that can impact the quality of live broadcasts.</p>

      <p>Today's AI-powered production tools are changing this landscape by automating routine tasks and providing intelligent assistance for complex decision-making processes. These systems can analyze vast amounts of data in real-time, predict potential issues before they occur, and suggest optimizations that human operators might miss.</p>

      <h2>Key Areas of AI Implementation</h2>

      <h3>Automated Cue Timing</h3>
      <p>One of the most significant advances in AI-assisted broadcasting is automated cue timing. Traditional cueing requires experienced operators to manually track timing and make adjustments on the fly. AI systems can now analyze show content, predict timing requirements, and automatically adjust cues to maintain perfect synchronization.</p>

      <p>This technology reduces the cognitive load on production teams and minimizes human error, resulting in smoother broadcasts and more consistent timing accuracy.</p>

      <h3>Intelligent Content Suggestions</h3>
      <p>AI assistants can analyze rundown content and provide intelligent suggestions for improvements. These systems can identify potential issues such as timing conflicts, missing elements, or content gaps, allowing production teams to address problems before they affect the live broadcast.</p>

      <h3>Real-time Analysis and Optimization</h3>
      <p>Advanced AI systems continuously monitor broadcast elements and provide real-time feedback and optimization suggestions. This includes everything from script analysis to technical quality assessment, ensuring that every aspect of the production meets professional standards.</p>

      <h2>Benefits for Production Teams</h2>
      <p>The integration of AI in broadcast production offers numerous benefits:</p>
      <ul>
        <li><strong>Reduced Error Rates:</strong> Automated systems eliminate many common human errors in timing and coordination.</li>
        <li><strong>Increased Efficiency:</strong> AI handles routine tasks, allowing human operators to focus on creative and strategic decisions.</li>
        <li><strong>Enhanced Quality:</strong> Continuous monitoring and optimization ensure consistent broadcast quality.</li>
        <li><strong>Improved Collaboration:</strong> AI systems can facilitate better communication and coordination among team members.</li>
      </ul>

      <h2>Looking Forward</h2>
      <p>As AI technology continues to evolve, we can expect even more sophisticated applications in broadcast production. Future developments may include advanced predictive analytics, automated content generation, and seamless integration with emerging technologies like virtual and augmented reality.</p>

      <p>The key to successful AI implementation in broadcasting is finding the right balance between automation and human creativity. While AI can handle many technical aspects of production, the creative vision and editorial judgment of human professionals remain irreplaceable.</p>

      <h2>Getting Started with AI in Your Production</h2>
      <p>For production teams looking to integrate AI into their workflows, the key is to start with focused applications that address specific pain points. Tools like Cuer Live demonstrate how AI can enhance existing processes without completely disrupting established workflows.</p>

      <p>The future of broadcast production is undoubtedly AI-enhanced, but it's a future where technology amplifies human capability rather than replacing it. By embracing these tools thoughtfully, production teams can achieve new levels of efficiency and quality while maintaining the creative excellence that defines great television.</p>
    `
  },
  'real-time-collaboration-tips': {
    title: 'Mastering Real-Time Collaboration in Remote Production Teams',
    excerpt: 'Learn best practices for managing distributed production teams and keeping everyone in sync across multiple locations.',
    heroImage: '/uploads/collaboration-hero.jpg',
    author: 'Mike Rodriguez',
    publishDate: '2024-01-08',
    readTime: '4 min read',
    category: 'Best Practices',
    content: `
      <p>The shift to remote and hybrid production workflows has fundamentally changed how broadcast teams collaborate. While technology has made distributed production possible, mastering real-time collaboration requires more than just the right tools—it demands new strategies, processes, and mindsets.</p>

      <h2>The Challenge of Distributed Teams</h2>
      <p>Remote production presents unique challenges that traditional in-person workflows don't face. Team members may be working across different time zones, dealing with varying internet connections, and using different equipment setups. These factors can complicate the precise coordination that live production demands.</p>

      <h2>Essential Collaboration Strategies</h2>

      <h3>Establish Clear Communication Protocols</h3>
      <p>Successful remote collaboration starts with crystal-clear communication protocols. Every team member should know exactly how and when to communicate different types of information:</p>
      <ul>
        <li><strong>Urgent Updates:</strong> Use dedicated channels for time-sensitive information that requires immediate attention.</li>
        <li><strong>Status Updates:</strong> Implement regular check-ins and status reporting to keep everyone informed of progress and changes.</li>
        <li><strong>Decision Making:</strong> Define who has authority to make different types of decisions and how those decisions are communicated to the team.</li>
      </ul>

      <h3>Leverage Real-Time Collaboration Tools</h3>
      <p>The right tools can make or break a distributed production workflow. Look for platforms that offer:</p>
      <ul>
        <li>Real-time syncing of rundowns and production documents</li>
        <li>Live editing capabilities with conflict resolution</li>
        <li>Integrated communication features</li>
        <li>Version control and change tracking</li>
      </ul>

      <h3>Create Redundancy in Critical Systems</h3>
      <p>Remote production workflows should include backup plans for when technology fails. This includes:</p>
      <ul>
        <li>Alternative communication channels</li>
        <li>Backup internet connections</li>
        <li>Redundant access to critical production documents</li>
        <li>Clear escalation procedures for technical issues</li>
      </ul>

      <h2>Best Practices for Team Coordination</h2>

      <h3>Synchronize Schedules and Expectations</h3>
      <p>When team members are in different locations or time zones, it's crucial to establish common schedules and expectations. This includes:</p>
      <ul>
        <li>Clearly defined core collaboration hours</li>
        <li>Shared calendars with all critical deadlines and meetings</li>
        <li>Written documentation of all decisions and changes</li>
      </ul>

      <h3>Implement Regular Check-ins</h3>
      <p>Regular team check-ins help maintain cohesion and catch potential issues early. These shouldn't be lengthy meetings—short, focused updates can be highly effective.</p>

      <h3>Document Everything</h3>
      <p>In remote environments, verbal communications can easily be missed or forgotten. Documenting decisions, changes, and important discussions ensures that all team members have access to the same information.</p>

      <h2>Technology Considerations</h2>
      <p>Choose collaboration tools that are specifically designed for the demands of broadcast production. Generic collaboration software often lacks the precision timing and real-time synchronization that live production requires.</p>

      <p>Modern rundown software should provide features like:</p>
      <ul>
        <li>Instant syncing across all team members</li>
        <li>Conflict resolution for simultaneous edits</li>
        <li>Real-time status indicators</li>
        <li>Integrated timing and cue management</li>
      </ul>

      <h2>Building a Collaborative Culture</h2>
      <p>Technology alone isn't enough—successful remote collaboration requires fostering a culture of openness, trust, and shared responsibility. Team members should feel comfortable asking questions, reporting issues, and suggesting improvements.</p>

      <p>Regular team building and training sessions can help maintain team cohesion and ensure everyone is comfortable with the tools and processes being used.</p>

      <h2>Measuring Success</h2>
      <p>Track key metrics to evaluate the effectiveness of your remote collaboration efforts:</p>
      <ul>
        <li>Response times for critical communications</li>
        <li>Frequency of production errors or delays</li>
        <li>Team satisfaction with collaboration tools and processes</li>
        <li>Overall production quality and consistency</li>
      </ul>

      <p>By focusing on clear communication, the right tools, and strong team culture, distributed production teams can achieve the same level of coordination and quality as traditional in-person workflows—and often exceed them.</p>
    `
  },
  'rundown-optimization-guide': {
    title: 'Complete Guide to Rundown Optimization for Live Shows',
    excerpt: 'From timing precision to team coordination, learn how to create rundowns that keep your production running smoothly.',
    heroImage: '/uploads/rundown-optimization-hero.jpg',
    author: 'Emily Turner',
    publishDate: '2024-01-01',
    readTime: '8 min read',
    category: 'Guide',
    content: `
      <p>A well-optimized rundown is the backbone of any successful live production. It serves as the central nervous system that coordinates every element of your show, from talent cues to technical operations. This comprehensive guide will walk you through the essential strategies for creating rundowns that ensure smooth, professional broadcasts.</p>

      <h2>Understanding Rundown Fundamentals</h2>
      <p>Before diving into optimization techniques, it's important to understand what makes a rundown effective. A good rundown should be:</p>
      <ul>
        <li><strong>Clear and Readable:</strong> Every team member should be able to quickly find and understand the information they need.</li>
        <li><strong>Comprehensive:</strong> All essential information should be included without overwhelming users with unnecessary details.</li>
        <li><strong>Flexible:</strong> The rundown should accommodate last-minute changes without breaking the overall structure.</li>
        <li><strong>Accurate:</strong> Timing and technical information must be precise and reliable.</li>
      </ul>

      <h2>Structural Optimization</h2>

      <h3>Logical Segment Organization</h3>
      <p>Organize your rundown in logical segments that reflect the natural flow of your show. Each segment should have a clear purpose and defined boundaries. This makes it easier for team members to understand their responsibilities and timing requirements.</p>

      <h3>Hierarchical Information Architecture</h3>
      <p>Structure information hierarchically, with the most critical details prominently displayed and supporting information easily accessible but not cluttered. This might include:</p>
      <ul>
        <li>Primary segment titles and timing</li>
        <li>Key talent and technical cues</li>
        <li>Supporting details and backup information</li>
        <li>Notes and special instructions</li>
      </ul>

      <h3>Consistent Formatting Standards</h3>
      <p>Establish and maintain consistent formatting standards throughout your rundown. This includes:</p>
      <ul>
        <li>Standardized color coding for different types of content</li>
        <li>Consistent abbreviations and terminology</li>
        <li>Uniform timing formats</li>
        <li>Clear visual hierarchy for different levels of information</li>
      </ul>

      <h2>Timing Optimization</h2>

      <h3>Accurate Time Estimates</h3>
      <p>Precise timing is crucial for live production. Base your time estimates on historical data when possible, and include buffer time for segments that might run long. Consider factors such as:</p>
      <ul>
        <li>Talent speaking pace variations</li>
        <li>Technical transition times</li>
        <li>Audience interaction segments</li>
        <li>Potential technical delays</li>
      </ul>

      <h3>Built-in Flexibility</h3>
      <p>Include flexible elements that can be expanded or contracted as needed. This might include:</p>
      <ul>
        <li>Optional segments that can be dropped if running long</li>
        <li>Extendable discussions for when you're running short</li>
        <li>Quick transition alternatives for time pressure situations</li>
      </ul>

      <h3>Clear Timing References</h3>
      <p>Provide multiple timing references to help team members stay oriented:</p>
      <ul>
        <li>Elapsed time from show start</li>
        <li>Time remaining in current segment</li>
        <li>Time to next major break or transition</li>
        <li>Overall show timing status</li>
      </ul>

      <h2>Team Coordination Features</h2>

      <h3>Role-Specific Views</h3>
      <p>Different team members need different information. Optimize your rundown to provide role-specific views or highlighting:</p>
      <ul>
        <li><strong>Directors:</strong> Overall flow, major transitions, and timing</li>
        <li><strong>Technical Directors:</strong> Equipment cues, graphics, and audio/video transitions</li>
        <li><strong>Talent:</strong> Their specific segments, cues, and key talking points</li>
        <li><strong>Producers:</strong> Content overview, backup plans, and decision points</li>
      </ul>

      <h3>Real-Time Status Tracking</h3>
      <p>Implement systems for tracking real-time status of rundown elements:</p>
      <ul>
        <li>Completed segments</li>
        <li>Currently active elements</li>
        <li>Upcoming critical cues</li>
        <li>Any deviations from planned timing</li>
      </ul>

      <h3>Communication Integration</h3>
      <p>Integrate communication tools directly into your rundown workflow to minimize confusion and ensure everyone stays informed of changes and updates.</p>

      <h2>Content Optimization Strategies</h2>

      <h3>Essential Information Priority</h3>
      <p>Prioritize information based on its critical importance to the success of the show. Essential information should be immediately visible, while supporting details should be easily accessible but not cluttered.</p>

      <h3>Contingency Planning</h3>
      <p>Include contingency plans directly in your rundown for common scenarios:</p>
      <ul>
        <li>Guest no-shows or late arrivals</li>
        <li>Technical difficulties</li>
        <li>Breaking news or urgent updates</li>
        <li>Time overruns or shortfalls</li>
      </ul>

      <h3>Clear Action Items</h3>
      <p>Make action items and responsibilities crystal clear. Each element should specify who needs to do what and when, eliminating ambiguity that can lead to missed cues or coordination failures.</p>

      <h2>Technology and Tools</h2>

      <h3>Collaborative Editing</h3>
      <p>Use rundown software that supports real-time collaborative editing, allowing multiple team members to make updates simultaneously without conflicts or version control issues.</p>

      <h3>Automated Features</h3>
      <p>Leverage automation where possible to reduce manual work and minimize errors:</p>
      <ul>
        <li>Automatic timing calculations</li>
        <li>Template-based segment creation</li>
        <li>Integrated content import from other systems</li>
        <li>Automatic backup and version control</li>
      </ul>

      <h3>Integration Capabilities</h3>
      <p>Choose tools that integrate well with your existing production infrastructure, including:</p>
      <ul>
        <li>Graphics systems</li>
        <li>Audio/video equipment</li>
        <li>Content management systems</li>
        <li>Communication platforms</li>
      </ul>

      <h2>Quality Assurance and Testing</h2>

      <h3>Pre-Show Review Process</h3>
      <p>Establish a systematic review process for rundowns before going live:</p>
      <ul>
        <li>Content accuracy verification</li>
        <li>Timing validation</li>
        <li>Technical requirements check</li>
        <li>Team member acknowledgment</li>
      </ul>

      <h3>Regular Optimization Reviews</h3>
      <p>Continuously improve your rundown processes by regularly reviewing what worked well and what could be improved. Gather feedback from all team members and implement changes systematically.</p>

      <h2>Measuring Success</h2>
      <p>Track key metrics to evaluate the effectiveness of your rundown optimization efforts:</p>
      <ul>
        <li>On-time performance for segment transitions</li>
        <li>Frequency of last-minute changes</li>
        <li>Team confidence and satisfaction ratings</li>
        <li>Overall show quality consistency</li>
        <li>Time spent on rundown preparation and updates</li>
      </ul>

      <p>By implementing these optimization strategies, you'll create rundowns that not only support smooth live productions but also enhance team confidence and overall show quality. Remember that optimization is an ongoing process—continue to refine and improve your approach based on experience and feedback.</p>
    `
  }
};

const BlogPost = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  
  const post = postId ? blogPosts[postId as keyof typeof blogPosts] : null;

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-slate-400 mb-8">The blog post you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/blog')} className="bg-blue-600 hover:bg-blue-700">
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
            title="Back to Blog"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CuerLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">
            Blog
          </Link>
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">
            Home
          </Link>
          <Button onClick={() => navigate('/login')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Article Header */}
        <header className="mb-12">
          <div className="flex items-center space-x-4 mb-6 text-sm text-slate-400">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {post.category}
            </Badge>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(post.publishDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{post.readTime}</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-white">
            {post.title}
          </h1>
          
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
            {post.excerpt}
          </p>
          
          <div className="flex items-center space-x-2 text-slate-400">
            <User className="h-5 w-5" />
            <span>By {post.author}</span>
          </div>
        </header>

        {/* Hero Image */}
        <div className="mb-12">
          <img 
            src={post.heroImage}
            alt={post.title}
            className="w-full h-64 md:h-96 object-cover rounded-lg"
            onError={(e) => {
              // Fallback to a gradient background if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-64 md:h-96 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg flex items-center justify-center"><span class="text-slate-400">Image not available</span></div>';
            }}
          />
        </div>

        {/* Article Body */}
        <div 
          className="prose prose-lg prose-invert max-w-none 
                     prose-headings:text-white prose-headings:font-bold 
                     prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-slate-700 prose-h2:pb-2
                     prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-blue-300
                     prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6 prose-p:text-lg
                     prose-ul:text-slate-300 prose-ul:mb-6 prose-ul:space-y-2
                     prose-li:mb-2 prose-li:leading-relaxed prose-li:text-slate-300
                     prose-strong:text-white prose-strong:font-semibold
                     prose-code:text-blue-400 prose-code:bg-slate-800 prose-code:px-2 prose-code:py-1 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Back to Blog CTA */}
        <div className="mt-16 pt-8 border-t border-slate-700">
          <Button 
            onClick={() => navigate('/blog')}
            variant="outline" 
            className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </div>
      </article>
    </div>
  );
};

export default BlogPost;