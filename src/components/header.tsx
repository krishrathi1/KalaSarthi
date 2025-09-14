'use client';
import React from 'react';
import { ChevronsUpDown, Check, User, LogOut, Settings, FileText, Archive, Package, ShoppingCart, Heart } from 'lucide-react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/context/language-context";
import { languages, LanguageCode, t, translateAsync } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { GlobalTranslationToggle } from "./global-translation-toggle";
import { cn } from '@/lib/utils';
import { IntelligentVoiceButton } from '@/components/ui/IntelligentVoiceButton';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { SimpleOfflineStatus } from './simple-offline-status';

// Group languages by region
const indianLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'indian');
const foreignLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'foreign');

export function Header() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const { user, userProfile, loading, logout, isArtisan, isBuyer } = useAuth();
  const router = useRouter();

  // Add cart and wishlist hooks
  const { cart, getCartCount } = useCart(user?.uid || null);
  const { wishlist, getWishlistCount } = useWishlist(user?.uid || null);

  // Get cart and wishlist counts
  const cartCount = getCartCount();
  const wishlistCount = getWishlistCount();

  console.log('Cart Count:', cartCount);
  console.log('Wishlist Count:', wishlistCount);

  // Get user display name and role title
  const getDisplayName = () => {
    if (userProfile?.name) return userProfile.name;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getRoleTitle = (): string => {
    if (isArtisan) return userProfile?.artisticProfession || 'artisanTitle';
    if (isBuyer) return 'buyerTitle';
    return 'userTitle';
  };

  const getUserAvatar = () => {
    if (userProfile?.profileImage) return userProfile.profileImage;
    if (user?.photoURL) return user.photoURL;
    return null;
  };

  const getUserInitials = () => {
    const name = getDisplayName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const roleKey = getRoleTitle();
        if (roleKey) {
          const title = await translateAsync(roleKey, language);
          setTranslatedTitle(title);
        } else {
          setTranslatedTitle('User');
        }
      } catch (error) {
        console.error('Header translation loading failed:', error);
        // Fallback to static translation
        const roleKey = getRoleTitle();
        setTranslatedTitle(t(roleKey, language) || 'User');
      }
    };

    if (userProfile || user) {
      loadTranslations();
    }
  }, [language, userProfile, user, isArtisan, isBuyer]);

  const mapCustomLanguage = (code: string): LanguageCode => {
    // Map common custom codes to known ones
    const customMap: { [key: string]: LanguageCode } = {
      'spanish': 'es',
      'french': 'fr',
      'german': 'de',
      'chinese': 'zh',
      'japanese': 'ja',
      'arabic': 'ar',
      'portuguese': 'pt',
      'russian': 'ru',
      'italian': 'it',
      'korean': 'ko',
      // Add more mappings
    };
    return customMap[code.toLowerCase()] || 'en';
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth'); // Redirect to login page after logout
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleViewProfile = () => {
    router.push('/profile');
  };

  const handleCartClick = () => {
    router.push('/marketplace/cart');
  };

  const handleWishlistClick = () => {
    router.push('/marketplace/wishlist');
  };

  // Cart/Wishlist Button Component
  const CartWishlistButton = ({
    icon: Icon,
    count,
    onClick,
    tooltip,
    variant = "outline"
  }: {
    icon: React.ElementType;
    count: number;
    onClick: () => void;
    tooltip: string;
    variant?: "outline" | "ghost";
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            className="relative"
            onClick={onClick}
          >
            <Icon className="h-4 w-4" />
            {count > 0 && (
              <Badge
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center bg-red-500 hover:bg-red-500"
                variant="destructive"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip} {count > 0 && `(${count})`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Show loading state or login prompt when no user
  if (loading) {
    return (
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
        <SidebarTrigger className="md:hidden" />
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <GlobalTranslationToggle />
          <div className="animate-pulse">
            <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }

  if (!user) {
    return (
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
        <SidebarTrigger className="md:hidden" />
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <GlobalTranslationToggle />
          <Button variant="outline" onClick={() => router.push('/auth')}>
            Sign In
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <GlobalTranslationToggle />

        {/* Offline Status */}
        <SimpleOfflineStatus className="hidden md:flex" />

        {/* Cart and Wishlist buttons - show for all authenticated users */}
        <CartWishlistButton
          icon={ShoppingCart}
          count={cartCount}
          onClick={handleCartClick}
          tooltip="Shopping Cart"
        />
        <CartWishlistButton
          icon={Heart}
          count={wishlistCount}
          onClick={handleWishlistClick}
          tooltip="Wishlist"
        />

        <IntelligentVoiceButton
          size="md"
          context="header"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {language
                ? (languages[language as keyof typeof languages]?.name || language)
                : "Select language..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput
                placeholder="Search or type language..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>
                  {searchValue && (
                    <CommandItem
                      onSelect={() => {
                        // Handle custom language input
                        const customCode = searchValue.toLowerCase();
                        if (customCode in languages) {
                          setLanguage(customCode as LanguageCode);
                        } else {
                          // For custom, try to map common codes or fallback to en
                          const mappedCode = mapCustomLanguage(customCode);
                          setLanguage(mappedCode);
                        }
                        setOpen(false);
                      }}
                    >
                      Use "{searchValue}" as custom language
                    </CommandItem>
                  )}
                </CommandEmpty>
                <CommandGroup heading="Indian Languages">
                  {indianLanguages.map(([code, lang]) => (
                    <CommandItem
                      key={code}
                      value={lang.name}
                      onSelect={() => {
                        setLanguage(code as LanguageCode);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          language === code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Foreign Languages">
                  {foreignLanguages.map(([code, lang]) => (
                    <CommandItem
                      key={code}
                      value={lang.name}
                      onSelect={() => {
                        setLanguage(code as LanguageCode);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          language === code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex-1 sm:flex-initial max-w-fit">
          <div className="relative font-headline text-right">
            <p className="font-semibold">{getDisplayName()}</p>
            <p className="text-sm text-muted-foreground">{translatedTitle}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage src={getUserAvatar() || undefined} alt={getDisplayName()} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleViewProfile}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>

            {/* Cart and Wishlist in dropdown menu for all users */}
            <DropdownMenuItem onClick={handleCartClick}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <Badge className="ml-auto text-xs" variant="secondary">
                  {cartCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWishlistClick}>
              <Heart className="mr-2 h-4 w-4" />
              <span>Wishlist</span>
              {wishlistCount > 0 && (
                <Badge className="ml-auto text-xs" variant="secondary">
                  {wishlistCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {isArtisan && (
              <>
                <DropdownMenuItem onClick={() => router.push('/drafts')}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Draft Products</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/archived')}>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archived Products</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/smart-product-creator')}>
                  <Package className="mr-2 h-4 w-4" />
                  <span>Create Product</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}