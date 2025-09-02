
import { ArtisanGuard } from "@/components/auth/AuthGuard";
import { DigitalTwinChat } from "@/components/digital-twin-chat";

export default function ArtisanBuddyPage() {
  return (
      <div className="w-full h-full">
        <DigitalTwinChat />
      </div>
  );
}
