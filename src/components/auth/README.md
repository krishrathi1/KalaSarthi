# Authentication Guards

This directory contains authentication and authorization components for the KalaMitra application.

## Components

### AuthGuard

The main authentication guard that protects routes based on user authentication status and role.

**Features:**

* Redirects unauthenticated users to `/auth` for protected routes
* Redirects authenticated users away from auth pages to `/dashboard`
* Role-based route protection (artisan vs buyer)
* Shows loading states during authentication checks
* Handles incomplete user profiles

**Route Categories:**

**Public Routes:**

* `/auth` - Authentication page

**Artisan Access:**

* **Full Access** - Artisans can access ALL routes in the application

**Buyer Restrictions:**

* **Restricted Routes** (Buyers cannot access):
  * `/artisan-buddy` - Digital twin chat for artisans
  * `/arth-saarthi` - Government scheme advisor
  * `/price-engine` - Pricing suggestions
  * `/smart-product-creator` - Smart product creation with AI
  * `/scheme-sahayak` - Scheme recommendations

**Shared Routes (Both Roles):**

* `/dashboard` - Main dashboard
* `/matchmaking` - Artisan-buyer matching
* `/multi-marketplace` - Marketplace access
* `/trend-mapper` - Market trends
* `/trust-layer` - Trust and verification
* `/profile` - User profile
* `/settings` - User settings
* `/browse` - Browse products
* `/search` - Search functionality
* `/orders` - Order management

### Role-Specific Guards

#### ArtisanGuard

Restricts access to artisan-only features.

```tsx
import { ArtisanGuard } from '@/components/auth/AuthGuard';

export default function ArtisanOnlyPage() {
  return (
    <ArtisanGuard>
      <div>This content is only visible to artisans</div>
    </ArtisanGuard>
  );
}
```

#### BuyerGuard

Restricts access to buyer-only features.

```tsx
import { BuyerGuard } from '@/components/auth/AuthGuard';

export default function BuyerOnlyPage() {
  return (
    <BuyerGuard>
      <div>This content is only visible to buyers</div>
    </BuyerGuard>
  );
}
```

#### AdminGuard

Restricts access to admin-only features.

```tsx
import { AdminGuard } from '@/components/auth/AuthGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div>This content is only visible to admins</div>
    </AdminGuard>
  );
}
```

## Usage

The `AuthGuard` is automatically applied to all routes through the `LayoutWrapper` component in the main layout. Role-based routing is handled automatically.

### Automatic Role-Based Protection

Routes are automatically protected with buyer restrictions:

```tsx
// Artisan tools - buyers are redirected to dashboard
export default function ArtisanBuddyPage() {
  return <ArtisanBuddyComponent />; // Artisans: ✅ Access, Buyers: ❌ Restricted
}

// Shared route - both roles can access
export default function BrowsePage() {
  return <BrowseComponent />; // Artisans: ✅ Access, Buyers: ✅ Access
}
```

### Manual Role Guards (Optional)

For additional protection within components:

```tsx
import { ArtisanGuard, BuyerGuard } from '@/components/auth/AuthGuard';

export default function MixedPage() {
  return (
    <div>
      <h1>Welcome to KalaMitra</h1>
      
      <ArtisanGuard>
        <div>Artisan-specific content</div>
      </ArtisanGuard>
      
      <BuyerGuard>
        <div>Buyer-specific content</div>
      </BuyerGuard>
    </div>
  );
}
```

### Route Access Utilities

Check route access programmatically:

```tsx
import { useRouteAccess, canAccessRoute } from '@/components/auth/AuthGuard';

function MyComponent() {
  const { canAccess, isBuyerRestrictedRoute, isArtisan, isBuyer, userRole } = useRouteAccess();
  
  // Check specific route access
  const canAccessPricing = canAccessRoute('/price-engine', userRole);
  
  return (
    <div>
      {canAccess && <div>You can access this route</div>}
      {isBuyerRestrictedRoute && <div>This route is restricted for buyers</div>}
      {isArtisan && <button>Access All Features</button>}
      {isBuyer && canAccessPricing && <button>Go to Pricing</button>}
    </div>
  );
}
```

## Authentication Flow


1. User visits any route
2. `AuthGuard` checks authentication status
3. If not authenticated → redirects to `/auth`
4. If authenticated but no profile → redirects to `/auth`
5. If accessing role-restricted route → checks user role
6. If wrong role → shows access denied or redirects to `/dashboard`
7. If everything is valid → renders the content

## Role-Based Redirects

* **Artisan** → Full access to all routes ✅
* **Buyer** accessing artisan tools → redirected to `/dashboard` ❌
* **Unauthenticated** user → redirected to `/auth`
* **Authenticated** user on `/auth` → redirected to `/dashboard`

## Customization

To add new buyer restrictions, update the array in `AuthGuard.tsx`:

```tsx
// Add new routes that buyers cannot access
const buyerRestrictedRoutes = [
  '/artisan-buddy',
  '/arth-saarthi',
  '/price-engine',
  '/smart-product-creator',
  '/scheme-sahayak',
  '/your-new-artisan-tool'  // Add here
];
```

## Notes

* Simple and lightweight implementation
* Automatic role-based protection
* Clear access denied messages
* Utility functions for programmatic checks
* All routes default to "shared" unless explicitly categorized


