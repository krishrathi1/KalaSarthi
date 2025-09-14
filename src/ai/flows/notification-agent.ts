import { TranslatedScheme } from './translation-agent';

export interface Notification {
  id: string;
  artisanId: string;
  message: string;
  type: 'scheme_match' | 'reminder' | 'deadline';
  timestamp: string;
  method: string;
}

export async function sendNotifications({
  translatedSchemes,
  artisanId,
  notificationMethods,
  contactInfo
}: {
  translatedSchemes: TranslatedScheme[];
  artisanId: string;
  notificationMethods: string[];
  contactInfo: any;
}) {
  const notifications: Notification[] = translatedSchemes.map(scheme => ({
    id: `notif-${Date.now()}-${Math.random()}`,
    artisanId,
    message: `New scheme available: ${scheme.title}`,
    type: 'scheme_match',
    timestamp: new Date().toISOString(),
    method: notificationMethods[0] || 'push'
  }));

  return { notifications };
}
