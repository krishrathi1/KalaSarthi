# Authorization System Documentation

## Overview

The KalaBandhu project now implements a comprehensive role-based authorization system that provides different experiences for buyers and artisans. This system ensures proper access control, navigation filtering, and role-based routing.

## User Roles

### Buyer
- **Default Route**: `/marketplace`
- **Access**: Can browse and purchase products
- **Restricted**: Cannot access artisan-specific tools and features

### Artisan
- **Default Route**: `/dashboard/inventory`
- **Access**: Full access to all features including inventory management, product creation, and business tools
- **Unrestricted**: Can access all routes and features

## Authorization Flow

### 1. Authentication
- Users authenticate via Firebase Auth (phone number)
- User profile is fetched from MongoDB with role information
- Role is determined during registration process

### 2. Role-Based Routing
- **After Login**: Users are redirected based on their role
  - Buyers → `/marketplace`
  - Artisans → `/dashboard/inventory`
- **Dashboard Access**: `/dashboard` automatically redirects based on role
- **Auth Page**: Already authenticated users are redirected to their appropriate landing page

### 3. Route Protection
- **Public Routes**: `/auth`, `/` (accessible to everyone)
- **Protected Routes**: All other routes require authentication
- **Role-Restricted Routes**: Certain routes are only accessible to artisans

## Restricted Routes for Buyers

The following routes are hidden from buyers and will redirect them to the marketplace:

- `/dashboard/inventory` - Inventory management
- `/smart-product-creator` - Product creation tools
- `/artisan-buddy` - AI assistant for artisans
- `/arth-saarthi` - Finance tracking
- `/yojana-mitra` - Government scheme alerts
- `/trend-spotter` - Trend analysis
- `/trend-mapper` - Market mapping
- `/voice-enrollment` - Voice-based enrollment

## Implementation Details

### Core Components

#### 1. AuthGuard (`src/components/auth/AuthGuard.tsx`)
- Main authorization component that wraps protected routes
- Handles authentication checks and role-based redirects
- Provides access denied messages for unauthorized access

#### 2. useRoleBasedAccess Hook (`src/hooks/useRoleBasedAccess.ts`)
- Centralized hook for role-based access control
- Provides utilities for checking permissions and route access
- Handles menu item filtering and default path determination

#### 3. SidebarNav (`src/components/sidebar-nav.tsx`)
- Dynamically filters navigation items based on user role
- Buyers only see relevant menu items
- Artisans see all available options

### Key Functions

#### Route Access Control
```typescript
// Check if user can access a specific route
const canAccessRoute = (route: string) => {
  if (publicRoutes.includes(route)) return true;
  if (!userProfile) return false;
  if (isArtisan) return true;
  if (isBuyer && buyerRestrictedRoutes.some(r => route.startsWith(r))) return false;
  return true;
};
```

#### Menu Item Filtering
```typescript
// Filter menu items based on user role
const shouldShowMenuItem = (path: string) => {
  if (!userProfile) return true; // Show all while loading
  if (isArtisan) return true; // Artisans can see everything
  if (isBuyer) {
    return !buyerRestrictedRoutes.some(route => path.startsWith(route));
  }
  return true;
};
```

#### Default Path Determination
```typescript
// Get appropriate redirect path based on user role
const getDefaultPath = () => {
  if (!userProfile) return '/auth';
  if (isBuyer) return '/marketplace';
  if (isArtisan) return '/dashboard/inventory';
  return '/dashboard';
};
```

## User Experience Flow

### For Buyers
1. **Login** → Redirected to `/marketplace`
2. **Navigation** → Only sees buyer-relevant menu items
3. **Access Attempt** → Restricted routes redirect to marketplace
4. **Error Handling** → Clear messages about artisan-only features

### For Artisans
1. **Login** → Redirected to `/dashboard/inventory`
2. **Navigation** → Sees all available menu items
3. **Full Access** → Can access all features and routes
4. **Business Tools** → Complete access to inventory, product creation, etc.

## Security Considerations

### Route Protection
- All protected routes are wrapped with AuthGuard
- Authentication state is checked on every route change
- Role-based access is enforced at the component level

### Data Security
- User roles are stored securely in MongoDB
- Firebase Auth provides secure authentication
- API endpoints validate user roles before processing requests

### Error Handling
- Graceful fallbacks for authentication failures
- Clear error messages for unauthorized access
- Automatic redirects to appropriate pages

## Testing the Authorization System

### Test Scenarios

#### 1. Buyer Login Flow
```bash
# Test buyer login and redirect
1. Login as buyer
2. Verify redirect to /marketplace
3. Check navigation shows only buyer-relevant items
4. Attempt to access /dashboard/inventory
5. Verify redirect to /marketplace with error message
```

#### 2. Artisan Login Flow
```bash
# Test artisan login and redirect
1. Login as artisan
2. Verify redirect to /dashboard/inventory
3. Check navigation shows all menu items
4. Verify access to all restricted routes
5. Test inventory management features
```

#### 3. Route Protection
```bash
# Test route protection
1. Access protected route without authentication
2. Verify redirect to /auth
3. Login and verify proper role-based redirect
4. Test direct URL access to restricted routes
```

## Maintenance and Updates

### Adding New Restricted Routes
1. Add route to `buyerRestrictedRoutes` array in `useRoleBasedAccess.ts`
2. Update `AuthGuard.tsx` if needed
3. Test with both buyer and artisan accounts

### Modifying User Roles
1. Update role types in `auth-context.tsx`
2. Update routing logic in `useRoleBasedAccess.ts`
3. Update UI components as needed
4. Test all role-based functionality

### Performance Considerations
- Role checks are cached in the auth context
- Navigation filtering happens client-side for responsiveness
- Route protection is lightweight and efficient

## Troubleshooting

### Common Issues

#### 1. Infinite Redirect Loops
- Check that `getDefaultPath()` returns valid routes
- Ensure public routes are properly defined
- Verify authentication state is stable

#### 2. Menu Items Not Filtering
- Check that `shouldShowMenuItem()` is being called
- Verify user role is properly set in profile
- Ensure restricted routes array is up to date

#### 3. Access Denied Errors
- Verify user has proper role in database
- Check that route is not in restricted list
- Ensure authentication is working properly

### Debug Tools
- Use browser dev tools to inspect auth context
- Check network requests for user profile data
- Verify route parameters and navigation state

## Future Enhancements

### Potential Improvements
1. **Granular Permissions**: More specific permissions within roles
2. **Role Hierarchy**: Support for multiple roles per user
3. **Dynamic Permissions**: Runtime permission changes
4. **Audit Logging**: Track access attempts and role changes
5. **Admin Panel**: Interface for managing user roles and permissions

### Integration Points
- **API Security**: Extend role-based access to API endpoints
- **Content Management**: Role-based content visibility
- **Feature Flags**: Dynamic feature access based on roles
- **Analytics**: Role-based usage tracking and insights

This authorization system provides a solid foundation for role-based access control while maintaining a smooth user experience for both buyers and artisans.
