import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Heart, LogOut, ChevronDown, SlidersHorizontal, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PillButton } from './common/PillButton';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { currentUser, isAuthenticated, isManagement, logout, savedPropertyIds } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Projects', path: '/projects' },
    { label: 'Buy', path: '/buy' },
    { label: 'Rent', path: '/rent' },
    ...(isManagement
      ? [
          { label: 'Manage Inventory', path: '/manage' },
          { label: 'Client Records', path: '/records' },
        ]
      : []),
    { label: 'Contact', path: '/contact' },
  ];

  const handleLogout = () => {
    logout();
    showToast('You have been signed out.', 'info');
    navigate('/');
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'AV';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header
        className={`w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'fixed top-3 left-0 right-0 px-3 sm:px-6 md:px-8'
            : 'absolute top-0 left-0 right-0 pt-5 px-3 sm:px-6 md:px-8'
        }`}
      >
        {/* 
          Transparent glass bar:
          bg-[#1B2A44]/45 (unscrolled) / bg-[#1B2A44]/85 with backdrop-blur-xl (scrolled)
        */}
        <div
          className={`max-w-[1440px] mx-auto flex items-center justify-between transition-all duration-300 rounded-full px-5 sm:px-6 py-2.5 sm:py-3 border border-white/20 ${
            scrolled
              ? 'bg-[#101B2E]/95 backdrop-blur-2xl shadow-2xl'
              : 'bg-[#142036]/90 backdrop-blur-xl shadow-xl'
          }`}
        >
          {/* Brand Wordmark on Left */}
          <Link
            to="/"
            className="flex items-center gap-2 group whitespace-nowrap shrink-0 select-none"
          >
            <span className="font-display font-bold text-xl sm:text-2xl tracking-tighter text-white">
              Avenue
            </span>
          </Link>

          {/* Centered Desktop Nav Links: text white, text-sm, font-medium, clear hover state */}
          <nav className="hidden lg:flex items-center gap-4 lg:gap-5 xl:gap-6">
            {navLinks.map((link, idx) => {
              const isActive =
                link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path);

              return (
                <NavLink
                  key={`${link.label}-${idx}`}
                  to={link.path}
                  className={`text-sm font-medium tracking-wide transition-colors relative py-1 flex flex-col items-center group whitespace-nowrap ${
                    isActive ? 'text-white font-semibold' : 'text-white/85 hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  {/* Subtle active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Top Right Zone: Login text link + Sign Up pill button with even spacing */}
          <div className="flex items-center gap-4 sm:gap-5">
            {isAuthenticated && currentUser ? (
              /* User logged in: Circular avatar with glass dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2.5 rounded-full glass-panel hover:bg-white/20 transition-all border border-white/20 cursor-pointer text-white"
                  aria-label="User account menu"
                >
                  <span className="text-xs font-display font-medium hidden sm:inline-block max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-white/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1B2A44] text-white border border-white/30 flex items-center justify-center font-display font-bold text-xs tracking-wider">
                      {getUserInitials(currentUser.name)}
                    </div>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 mr-1 transition-transform ${
                      userDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel-dark text-white p-2 shadow-2xl border border-white/20 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                    <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                      <div className="font-display font-bold text-xs text-white truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-white/60 font-body truncate">
                        {currentUser.email}
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 transition-colors"
                    >
                      <User className="w-4 h-4 text-white/70" />
                      <span>Profile & Settings</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-400" />
                        <span>Saved Residences</span>
                      </div>
                      {savedPropertyIds.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                          {savedPropertyIds.length}
                        </span>
                      )}
                    </Link>

                    {isManagement && (
                      <>
                        <Link
                          to="/manage"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 transition-colors"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                          <span>Manage Inventory</span>
                        </Link>
                        <Link
                          to="/records"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs hover:bg-white/10 transition-colors"
                        >
                          <Users className="w-4 h-4 text-sky-300" />
                          <span>Client Records</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-white/10 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* User logged out: "Login" text link and filled pill "Sign Up" button */
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-white px-3.5 py-1.5 rounded-full hover:bg-white/15 transition-all tracking-wide"
                >
                  Login
                </Link>

                <PillButton
                  variant="white"
                  size="sm"
                  className="!text-xs !py-1.5 !pl-4 !pr-1.5"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
                </PillButton>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu: Full-screen slate-blue menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-[#2F4B73] text-white flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="font-display font-bold text-2xl tracking-tighter text-white"
            >
              Avenue
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-white cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-5 py-6">
            {navLinks.map((link, idx) => (
              <NavLink
                key={`mobile-${link.label}-${idx}`}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }: { isActive: boolean }) =>
                  `text-2xl font-display uppercase tracking-wider transition-colors flex items-center justify-between ${
                    isActive ? 'text-white font-bold' : 'text-white/75 hover:text-white'
                  }`
                }
              >
                <span>{link.label}</span>
                {location.pathname === link.path && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </NavLink>
            ))}
          </div>

          {/* Bottom actions for mobile */}
          <div className="pt-6 border-t border-white/15 flex flex-col gap-3">
            {isAuthenticated && currentUser ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-2xl glass-card-subtle mb-1">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-white/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1B2A44] flex items-center justify-center font-display font-bold text-sm text-white shrink-0">
                      {getUserInitials(currentUser.name)}
                    </div>
                  )}
                  <div>
                    <div className="font-display font-bold text-sm text-white">{currentUser.name}</div>
                    <div className="text-xs text-white/60 font-body">{currentUser.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 px-4 rounded-full glass-panel text-center text-xs font-display uppercase tracking-wider font-semibold"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="py-3 px-4 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30 text-center text-xs font-display uppercase tracking-wider font-semibold"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 px-6 rounded-full glass-panel text-center font-display uppercase tracking-widest text-xs font-bold hover:bg-white/20 transition-all text-white"
                >
                  Login to Account
                </Link>

                <PillButton
                  variant="white"
                  size="lg"
                  className="w-full justify-between"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/signup');
                  }}
                >
                  Create Account
                </PillButton>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
