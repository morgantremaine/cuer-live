import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const HowToSection = () => {
  const steps = [
    {
      name: "Sign up for free",
      text: "Create your Cuer account in seconds. No credit card required for Cuer's free plan.",
      image: "https://cuer.live/lovable-uploads/92cc1c01-74f2-43f6-851d-5043628cac07.png",
      url: "https://cuer.live/login?tab=signup"
    },
    {
      name: "Create your first rundown",
      text: "Start with a blank rundown or use Cuer AI to generate templates from a text description of your show. Add segments, timing, scripts, and custom columns to match your workflow.",
      image: "https://cuer.live/uploads/cuer-on-laptop-mockup.png",
      url: "https://cuer.live/dashboard"
    },
    {
      name: "Invite your team",
      text: "Share rundowns with your team for real-time collaboration. Everyone sees updates instantly. Use read-only links for stakeholders and talent.",
      image: "https://cuer.live/uploads/mobile-mockups-v2.png",
      url: "https://cuer.live/dashboard"
    },
    {
      name: "Go live with confidence",
      text: "Use showcaller controls to keep everyone synchronized during your live broadcast. Floating segments adapt to timing changes automatically.",
      image: "https://cuer.live/uploads/cuer-on-laptop-mockup.png",
      url: "https://cuer.live/dashboard"
    }
  ];

  // Generate HowTo Schema for SEO
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Create a Professional Broadcast Rundown with Cuer",
    "description": "Step-by-step guide to creating and managing professional broadcast rundowns using Cuer's collaborative platform",
    "totalTime": "PT10M",
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "name": step.name,
      "text": step.text,
      "image": step.image,
      "url": step.url,
      "position": index + 1
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            How to Create a Professional Rundown with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">
              Cuer
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Get your team collaborating on live productions in minutes
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-blue-400">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{step.name}</h3>
                    <p className="text-slate-300 text-lg">{step.text}</p>
                  </div>
                  <div className="flex-shrink-0 hidden md:block">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default HowToSection;
