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
  const { user, userProfile, loading, logout, isArtisan, isBuyer, demoLogin } = useAuth();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

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
    variant = "ghost"
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
            className="relative h-10 w-10 hover:bg-muted"
            onClick={onClick}
          >
            <Icon className="h-5 w-5" />
            {count > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] font-bold flex items-center justify-center bg-red-500 hover:bg-red-500 border-2 border-background shadow-sm"
                variant="destructive"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltip} {count > 0 && `(${count})`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Show loading state or login prompt when no user
  if (loading) {
    return (
      <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <SidebarTrigger className="md:hidden" />
          <div className="flex items-center gap-4 ml-auto">
            <div className="animate-pulse flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-full"></div>
              <div className="hidden sm:flex flex-col gap-2">
                <div className="h-3 w-24 bg-muted rounded"></div>
                <div className="h-2 w-16 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Handle demo login from header
  const handleHeaderDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const success = await demoLogin('+919876543210');

      if (success) {
        console.log('Demo login successful from header');
        // Redirect to dashboard after successful demo login
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } else {
        console.error('Demo login failed');
        alert('Demo login failed. Please try the auth page.');
      }
    } catch (error) {
      console.error('Error during demo login:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  if (!user) {
    return (
      <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">KS</span>
              </div>
              <span className="font-headline font-bold text-lg hidden md:inline">KalaSarthi</span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Demo Login Button - Prominent for judges */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="default"
                    onClick={handleHeaderDemoLogin}
                    disabled={demoLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 gap-2 h-10"
                  >
                    {demoLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Loading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="hidden sm:inline font-medium">Demo Login</span>
                        <span className="sm:hidden font-medium">Demo</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-medium">
                  <p>Quick access for judges - No authentication required</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Regular Sign In Button */}
            <Button 
              variant="outline" 
              onClick={() => router.push('/auth')}
              className="h-10 font-medium"
            >
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Login</span>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Check if in demo mode
  const isDemoMode = typeof window !== 'undefined' && localStorage.getItem('demoMode') === 'true';

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          
          {/* Demo Mode Indicator */}
          {isDemoMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 text-xs px-2.5 py-1 font-semibold shadow-sm">
                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    DEMO
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Demo Mode - Test Profile Active</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">

          {/* Translation Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTranslation}
                  className={cn(
                    'h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center text-lg',
                    isEnabled
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                  aria-label={isEnabled ? 'Disable translation' : 'Enable translation'}
                >
                  🌐
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isEnabled ? 'Disable translation' : 'Enable translation'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Trending Indicator - Hidden on small screens */}
          <div className="hidden md:flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => router.push('/trend-spotter')}
                    className="h-10 gap-2 font-medium"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden lg:inline">Trends</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>View trending opportunities</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Cart and Wishlist */}
          <div className="flex items-center gap-1.5">
            <CartWishlistButton
              icon={ShoppingCart}
              count={cartCount}
              onClick={handleCartClick}
              tooltip="Shopping Cart"
              variant="ghost"
            />
            <CartWishlistButton
              icon={Heart}
              count={wishlistCount}
              onClick={handleWishlistClick}
              tooltip="Wishlist"
              variant="ghost"
            />
          </div>

          {/* Voice Navigation */}
          <div className="flex items-center">
            <GlobalVoiceNavigation
              size="sm"
              position="header"
              className="h-10 w-10"
            />
          </div>

          {/* Language Selector - Desktop only */}
          <div className="hidden lg:flex">
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={(lang) => {
                setLanguage(lang);
                setTranslationLanguage(lang);
              }}
              className="w-[140px] xl:w-[180px]"
              showSearch={true}
              groupByRegion={true}
            />
          </div>

          {/* User Info - Large screens only */}
          <div className="hidden xl:flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
            <div className="text-right">
              <p className="font-semibold text-sm leading-tight">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground leading-tight">{translatedTitle}</p>
            </div>
          </div>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getUserAvatar() || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="text-sm font-semibold">{getUserInitials()}</AvatarFallback>
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
      </div>
    </header>
  );
}