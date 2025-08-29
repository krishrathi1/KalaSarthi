
'use client';

import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const schemes = [
  {
    title: "Pradhan Mantri MUDRA Yojana (PMMY)",
    description: "Provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises. Artisans can avail this for working capital and expansion.",
    eligibility: "Any Indian Citizen who has a business plan for a non-farm sector income generating activity such as manufacturing, processing, trading or service sector.",
    link: "https://www.mudra.org.in/"
  },
  {
    title: "Scheme of Fund for Regeneration of Traditional Industries (SFURTI)",
    description: "Organizes traditional industries and artisans into clusters to make them competitive and provide support for long-term sustainability.",
    eligibility: "Artisans, NGOs, institutions of the Central and State Governments and semi-Government institutions, field functionaries of State and Central Govt., Panchayati Raj institutions (PRIs).",
    link: "https://sfurti.msme.gov.in/"
  },
  {
    title: "Ambedkar Hastshilp Vikas Yojana (AHVY)",
    description: "Aims at promoting Indian handicrafts by developing artisans' clusters into professionally managed and self-reliant community enterprises.",
    eligibility: "Handicraft artisans who are members of a self-help group or a cooperative society.",
    link: "https://handicrafts.nic.in/"
  }
];

export function YojanaMitra() {
  return (
    <Card id="yojana-mitra">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <ScrollText className="size-6 text-primary" />
          Yojana Mitra (Scheme Friend)
        </CardTitle>
        <CardDescription>
          Discover government schemes and benefits tailored for artisans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {schemes.map((scheme, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="font-headline text-lg">{scheme.title}</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p className="text-sm">{scheme.description}</p>
                <p className="text-sm"><strong className="font-semibold">Eligibility:</strong> {scheme.eligibility}</p>
                <a href={scheme.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Learn More
                </a>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
