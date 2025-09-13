'use client';

import { usePermissions, withPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Example component showing how to use permissions
export function PermissionExample() {
  const permissions = usePermissions();

  if (permissions.isLoading) {
    return <div>Loading permissions...</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Permission Example</CardTitle>
        <CardDescription>
          This component demonstrates how to use the permissions system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">User Status</h3>
            <div className="space-y-1">
              <Badge variant={permissions.isAuthenticated ? "default" : "secondary"}>
                {permissions.isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </Badge>
              <Badge variant={permissions.hasProfile ? "default" : "secondary"}>
                {permissions.hasProfile ? "Has Profile" : "No Profile"}
              </Badge>
              {permissions.isArtisan && <Badge variant="outline">Artisan</Badge>}
              {permissions.isBuyer && <Badge variant="outline">Buyer</Badge>}
              {permissions.isAdmin && <Badge variant="destructive">Admin</Badge>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Feature Access</h3>
            <div className="space-y-1 text-sm">
              <div className={permissions.canCreateProducts ? "text-green-600" : "text-red-600"}>
                Create Products: {permissions.canCreateProducts ? "✓" : "✗"}
              </div>
              <div className={permissions.canUseArtisanBuddy ? "text-green-600" : "text-red-600"}>
                Artisan Buddy: {permissions.canUseArtisanBuddy ? "✓" : "✗"}
              </div>
              <div className={permissions.canUseMatchmaking ? "text-green-600" : "text-red-600"}>
                Matchmaking: {permissions.canUseMatchmaking ? "✓" : "✗"}
              </div>
              <div className={permissions.canUsePriceEngine ? "text-green-600" : "text-red-600"}>
                Price Engine: {permissions.canUsePriceEngine ? "✓" : "✗"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Conditional Rendering Examples</h3>
          
          {permissions.canCreateProducts && (
            <Button variant="default" size="sm">
              Create New Product (Artisan Only)
            </Button>
          )}
          
          {permissions.canPurchaseProducts && (
            <Button variant="outline" size="sm">
              Browse Products (Buyer/Artisan)
            </Button>
          )}
          
          {permissions.isAdmin && (
            <Button variant="destructive" size="sm">
              Admin Panel (Admin Only)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Example of using withPermission HOC
const ArtisanOnlyComponent = () => (
  <div className="p-4 bg-primary/10 rounded-lg">
    <h3 className="font-semibold text-primary">Artisan Only Content</h3>
    <p className="text-sm text-muted-foreground">
      This content is only visible to artisans using the withPermission HOC.
    </p>
  </div>
);

const FallbackComponent = () => (
  <div className="p-4 bg-muted rounded-lg">
    <p className="text-sm text-muted-foreground">
      You need to be an artisan to see the special content.
    </p>
  </div>
);

export const ProtectedArtisanComponent = withPermission(
  ArtisanOnlyComponent,
  'isArtisan',
  FallbackComponent
);