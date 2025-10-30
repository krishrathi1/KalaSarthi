'use client';
import React from 'react';
import { ChevronsUpDown, Check, User, LogOut, Settings, FileText, Archive, Package, ShoppingCart, Heart, TrendingUp } from 'lucide-react';
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
import { LanguageSelector } from "@/components/translation/LanguageSelector";
import { useTranslation } from "@/context/TranslationContext";
import { cn } from '@/lib/utils';
import { GlobalVoiceNavigation } from '@/components/global-voice-navigation';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';




// Group languages by region
const indianLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'indian');
const foreignLanguages = Object.entries(languages).filter(([_, lang]) => lang.region === 'foreign');

export function Header() {
  const { language, setLanguage } = useLanguage();
  const { currentLanguage, setLanguage: setTranslationLanguage, isEnabled, toggleTranslation } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedLanguageName, setTranslatedLanguageName] = useState('');
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

        // Translate language name
        const originalLanguageName = languages[language as keyof typeof languages]?.name || language;
        if (language === 'en') {
          setTranslatedLanguageName(originalLanguageName);
        } else {
          try {
            const translatedLangName = await translateAsync(originalLanguageName, language);
            setTranslatedLanguageName(translatedLangName);
          } catch (error) {
            console.error('Language name translation failed:', error);
            setTranslatedLanguageName(originalLanguageName);
          }
        }
      } catch (error) {
        console.error('Header translation loading failed:', error);
        // Fallback to static translation
        const roleKey = getRoleTitle();
        setTranslatedTitle(t(roleKey, language) || 'User');
        setTranslatedLanguageName(languages[language as keyof typeof languages]?.name || language);
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
          <Button variant="outline" onClick={() => router.push('/auth')}>
            Sign In
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/80 backdrop-blur-sm px-2 sm:px-4 md:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex w-full items-center gap-1 sm:gap-2 md:ml-auto md:gap-2 lg:gap-4">

        {/* Translation Toggle - Always visible but compact on mobile */}
        <div className="flex-shrink-0">
          <button
            onClick={toggleTranslation}
            className={cn(
              'p-2 rounded-md transition-colors',
              isEnabled
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={isEnabled ? 'Disable translation' : 'Enable translation'}
          >
            🌐
          </button>
        </div>



        {/* Trending Indicator - Hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/trend-spotter')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden lg:inline text-sm">Trends</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View trending opportunities</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Cart and Wishlist - Always visible, compact on mobile */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
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
        </div>

        {/* Voice Navigation Microphone */}
        <div className="flex-shrink-0">
          <GlobalVoiceNavigation
            size="sm"
            position="header"
            className="h-8 w-8 sm:h-10 sm:w-10"
          />
        </div>

        {/* Language Selector - Responsive width */}
        <div className="hidden md:flex flex-shrink-0">
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={(lang) => {
              setLanguage(lang);
              setTranslationLanguage(lang);
            }}
            className="w-[120px] lg:w-[180px]"
            showSearch={true}
            groupByRegion={true}
          />
        </div>

        {/* User Info - Hidden on mobile, visible on larger screens */}
        <div className="hidden lg:flex flex-1 sm:flex-initial max-w-fit">
          <div className="relative font-headline text-right">
            <p className="font-semibold text-sm">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground">{translatedTitle}</p>
          </div>
        </div>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0">
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                <AvatarImage src={getUserAvatar() || undefined} alt={getDisplayName()} />
                <AvatarFallback className="text-xs sm:text-sm">{getUserInitials()}</AvatarFallback>
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



            {/* Language selector for mobile */}
            <div className="md:hidden">
              <DropdownMenuItem asChild>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-start h-auto p-2"
                    >
                      <span className="mr-2">🌐</span>
                      <span>
                        Language: {language
                          ? (translatedLanguageName || languages[language as keyof typeof languages]?.name || language)
                          : "Select"}
                      </span>
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
                                const customCode = searchValue.toLowerCase();
                                if (customCode in languages) {
                                  setLanguage(customCode as LanguageCode);
                                } else {
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
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

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

            <DropdownMenuItem onClick={() => router.push('/trend-spotter')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Trend Spotter</span>
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