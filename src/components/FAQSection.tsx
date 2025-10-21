import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleHelp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQSection = () => {
  const faqs = [
    {
      question: "What is a rundown?",
      answer: "A rundown is your show's game plan - a live document that organizes segments, timing, scripts, and production notes in one place. Whether you're running a Twitch stream or a large-scale event, a rundown keeps everyone on the same page about what's happening when. It's the difference between winging it and running a professional show where your team knows exactly what comes next, how long each segment takes, and what they need to execute."
    },
    {
      question: "How is Cuer different from other rundown solutions?",
      answer: "Cuer combines the power of expensive enterprise broadcast software with the ease of Google Sheets. Unlike spreadsheets, Cuer offers automatic timing calculations, purpose-built features for live production, and real-time collaboration that actually works. Unlike complicated enterprise systems, Cuer has an intuitive interface your team can learn in minutes - with features like AI-assisted scripting, AI template generation, and integrated prompter functionality."
    },
    {
      question: "What types of shows can I produce with Cuer?",
      answer: "Cuer works for any live production - from large-scale events and TV shows to podcasts, esports tournaments, and Twitch streams. Whether you're running a solo stream or coordinating a full production crew, Cuer's flexible tools adapt to your workflow. Our live showcaller controls, floating segments, and real-time collaboration features scale from intimate streams to major broadcast productions."
    },
    {
      question: "Does Cuer work with multiple team members?",
      answer: "Absolutely. Cuer is built for team collaboration. Multiple users can edit the same rundown simultaneously with instant synchronization. You can share rundowns with stakeholders using read-only links (no login required), and everyone sees changes in real-time. Perfect for directors, producers, talent, and technical crew working together."
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes! You can get started with Cuer for free. Our free tier includes core rundown features so you can test the platform with your team. No credit card required to start. Upgrade to paid plans when you're ready for advanced features like unlimited rundowns, AI assistance, and blueprint templates."
    },
    {
      question: "What makes Cuer different from spreadsheet-based rundowns?",
      answer: "Cuer is purpose-built for broadcast production, not adapted from generic spreadsheet software. We offer automatic timing calculations, status tracking, drag-and-drop reordering, custom column layouts, AI-powered scripting assistance, and features specifically designed for live production workflows. Plus, real-time collaboration that actually works - unlike shared spreadsheets that often conflict or lag."
    },
    {
      question: "Can I import my existing rundowns into Cuer?",
      answer: "Yes! Cuer supports CSV import, making it easy to migrate your existing rundowns from spreadsheets or other tools. Simply export your current rundowns to CSV format and import them into Cuer. You can also use our Blueprint mode to create reusable templates from your existing show formats."
    }
  ];

  // Generate FAQ Schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CircleHelp className="w-10 h-10 text-blue-400" />
            <h2 className="text-3xl font-bold text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about Cuer's rundown software
          </p>
        </div>
        <Card className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30">
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-slate-200 hover:text-white">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-300">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FAQSection;
