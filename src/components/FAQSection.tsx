import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQSection = () => {
  const faqs = [
    {
      question: "What is rundown software?",
      answer: "Rundown software is a digital tool used by broadcast professionals to plan, organize, and execute live productions. It replaces traditional paper rundowns with real-time collaborative tools that help teams coordinate segments, timing, scripts, and resources during live broadcasts, streams, and events."
    },
    {
      question: "How does Cuer compare to traditional rundown tools?",
      answer: "Cuer modernizes broadcast production with real-time collaboration, AI-assisted workflows, automatic timing calculations, and cloud-based access. Unlike traditional tools, Cuer offers instant sync across your team, smart templates with Blueprint mode, read-only sharing for stakeholders, and integrated prompter functionality - all in a modern, intuitive interface."
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
        <Card className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-white">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
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
