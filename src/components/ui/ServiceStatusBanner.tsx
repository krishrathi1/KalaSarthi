/**
 * Service Status Banner Component
 * Shows when fallback services are being used
 */

'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkServiceStatus, getStatusMessages, type ServiceStatus } from '@/lib/utils/service-status';

export function ServiceStatusBanner() {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const status = await checkServiceStatus();
      setServiceStatus(status);
    } catch (error) {
      console.error('Failed to check service status:', error);
      setServiceStatus({
        stt: 'fallback-mock',
        tts: 'fallback-mock', 
        translation: 'fallback-mock'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasAnyFallback = serviceStatus && (
    serviceStatus.stt === 'fallback-mock' || 
    serviceStatus.tts === 'fallback-mock' || 
    serviceStatus.translation === 'fallback-mock'
  );

  if (isLoading || !hasAnyFallback || isDismissed) {
    return null;
  }

  const statusMessages = getStatusMessages(serviceStatus, 'en');

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="font-medium text-amber-800">
            Demo Mode: 
          </span>
          <span className="text-amber-700 ml-1">
            {statusMessages.overall}
          </span>
          <a 
            href="https://console.developers.google.com/apis/library?project=525551372559" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 underline hover:text-amber-800 ml-1"
          >
            Enable Google Cloud APIs →
          </a>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default ServiceStatusBanner;