
'use client';

import {ShieldCheck} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

export function TrustLayer() {
  return (
    <Card id="trust-layer">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          CertiCraft
        </CardTitle>
        <CardDescription>
          Verify authenticity and build trust with blockchain-backed certification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg text-sm text-center">
          <p>
            Authenticate your craft by creating a unique digital certificate on the
            blockchain.
          </p>
        </div>
        <Button>Generate Trust Certificate</Button>
      </CardContent>
    </Card>
  );
}
