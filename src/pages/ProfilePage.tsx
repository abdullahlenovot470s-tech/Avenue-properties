import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { useToast } from '../context/ToastContext';
import { formatRent } from '../data/rentalsData';
import { SafeImage } from '../components/common/SafeImage';
import { PillButton } from '../components/common/PillButton';
import {
  Heart,
  LogOut,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Building,
  ArrowUpRight,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  CheckCircle2,
  Edit2,
  X,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    logout,
    savedPropertyIds,
    toggleSaveProperty,
    updateUserPhone,
  } = useAuth();
  const { showToast } = useToast();
  const { propertyListings, portfolioProjects, buyProperties, rentalListings } = useCatalog();
  const navigate = useNavigate();

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone || '');
  const [phoneError, setPhoneError] = useState('');

  React.useEffect(() => {
    document.title = 'Client Profile & Shortlist | Avenue Luxury Properties';
  }, []);

  React.useEffect(() => {
    if (currentUser?.phone) {
      setPhoneInput(currentUser.phone);
    }
  }, [currentUser?.phone]);

  // Protected route check
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace state={{ from: { pathname: '/profile' } }} />;
  }

  const handleLogout = () => {
    logout();
    showToast('You have been logged out.', 'info');
    navigate('/');
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');

    const clean = phoneInput.trim();
    if (!clean) {
      // Cleared phone number
      updateUserPhone('');
      setEditingPhone(false);
      showToast('Phone number removed.', 'info');
      return;
    }

    const pakistaniPhoneRegex = /^(\+92|0)3\d{9}$/;
    if (!pakistaniPhoneRegex.test(clean)) {
      setPhoneError('Please enter a valid Pakistani mobile number (e.g. 03XX XXXXXXX or +923XXXXXXXXX).');
      return;
    }

    updateUserPhone(clean);
    setEditingPhone(false);
    showToast('Phone number saved successfully.', 'success');
  };

  // Resolve saved properties across listings, portfolio items, buy properties, and rentals
  const allProperties = [
    ...buyProperties.map((b) => ({
      id: b.id,
      name: b.title,
      location: b.location,
      price: b.price,
      beds: b.beds,
      baths: b.baths,
      sqft: b.area,
      exteriorImage: b.image,
      category: b.city,
      architecturalStyle: b.type,
      description: b.description,
      isRental: false,
      link: `/buy/${b.id}`,
    })),
    ...propertyListings.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
      price: p.price,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft,
      exteriorImage: p.exteriorImage,
      category: p.category,
      architecturalStyle: p.architect,
      description: p.description,
      isRental: false,
      link: `/projects/${p.id}`,
    })),
    ...portfolioProjects.map((p) => ({
      id: p.id,
      name: p.title,
      location: p.location,
      price: p.valuation,
      beds: p.beds,
      baths: p.baths,
      sqft: p.size,
      exteriorImage: p.image,
      category: p.category,
      architecturalStyle: p.architect,
      description: p.summary,
      isRental: false,
      link: `/projects/${p.id}`,
    })),
    ...rentalListings.map((r) => ({
      id: r.id,
      name: r.title,
      location: r.areaSociety,
      price: formatRent(r.monthlyRent),
      beds: r.beds,
      baths: r.baths,
      sqft: r.sizeOrFloor,
      exteriorImage: r.image,
      category: r.city,
      architecturalStyle: r.furnished,
      description: r.description,
      isRental: true,
      link: `/rent/${r.id}`,
    })),
  ];

  const savedHomes = allProperties.filter((item) => savedPropertyIds.includes(item.id));

  const handleRemoveSaved = (id: string, name: string) => {
    toggleSaveProperty(id);
    showToast(`Removed "${name}" from your shortlist.`, 'info');
  };

  // Format date as DD/MM/YYYY according to Pakistani standard
  const formatPakistaniDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-3 sm:px-6 md:px-8 max-w-[1440px] mx-auto">
      {/* Profile Header Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-white rounded-[28px] sm:rounded-[36px] overflow-hidden p-6 sm:p-10 md:p-12 shadow-xl border border-slate-100 mb-10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex items-center gap-5">
            {/* Avatar: Google Photo if available, otherwise Initials */}
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-lg border-2 border-white shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#1B2A44] text-white flex items-center justify-center font-display font-extrabold text-2xl sm:text-3xl tracking-wider shadow-lg border-2 border-white shrink-0">
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 text-[#1B2A44] text-[10px] font-display uppercase tracking-widest font-semibold border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2F4B73]" />
                  <span>Avenue Client</span>
                </div>
                {currentUser.emailVerified && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-display uppercase tracking-widest font-semibold border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Email Verified</span>
                  </div>
                )}
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1B2A44] tracking-tight">
                {currentUser.name}
              </h1>
              <p className="text-xs text-slate-500 font-body">
                Verified Investor & Property Holder
              </p>
            </div>
          </div>

          {/* Logout Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-display text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Contact Information & Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs sm:text-sm text-slate-600 font-body">
          {/* Registered Email */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-[#2F4B73] shrink-0" />
            <div className="truncate">
              <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">
                Registered Email
              </span>
              <span className="font-medium text-slate-800 truncate block">{currentUser.email}</span>
            </div>
          </div>

          {/* Optional Direct Telephone */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-display tracking-wider">
                <Phone className="w-3.5 h-3.5 text-[#2F4B73] shrink-0" />
                <span>Phone (Optional)</span>
              </div>
              {!editingPhone && (
                <button
                  type="button"
                  onClick={() => setEditingPhone(true)}
                  className="text-[10px] font-display uppercase tracking-wider text-[#2F4B73] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{currentUser.phone ? 'Edit' : 'Add'}</span>
                </button>
              )}
            </div>

            {editingPhone ? (
              <form onSubmit={handleSavePhone} className="mt-1 space-y-2">
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setPhoneError('');
                    }}
                    placeholder="03XX XXXXXXX"
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#2F4B73]"
                  />
                  {phoneInput && (
                    <button
                      type="button"
                      onClick={() => setPhoneInput('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {phoneError && (
                  <p className="text-[10px] text-rose-500 font-body leading-tight">{phoneError}</p>
                )}
                <div className="flex gap-1.5 pt-0.5">
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 rounded-full bg-[#1B2A44] hover:bg-[#2F4B73] text-white text-[10px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPhone(false);
                      setPhoneInput(currentUser.phone || '');
                      setPhoneError('');
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-display uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {currentUser.phone ? (
                  <span className="font-medium text-slate-800 text-sm block">
                    {currentUser.phone}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-body italic block">
                    No phone added (optional)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Member Since */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Calendar className="w-4 h-4 text-[#2F4B73] shrink-0" />
            <div>
              <span className="block text-[10px] uppercase font-display tracking-wider text-slate-400">
                Member Since (DD/MM/YYYY)
              </span>
              <span className="font-medium text-slate-800">
                {formatPakistaniDate(currentUser.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Saved Residences Section */}
      <section id="saved" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="font-display font-extrabold text-2xl text-[#1B2A44] uppercase tracking-tight">
                SAVED RESIDENCES
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-body mt-1">
              Architectural residences and properties saved to your private shortlist.
            </p>
          </div>

          <span className="text-xs font-display font-semibold text-[#2F4B73] bg-[#E6ECF5] px-3.5 py-1.5 rounded-full">
            {savedHomes.length} {savedHomes.length === 1 ? 'Property' : 'Properties'}
          </span>
        </div>

        {savedHomes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {savedHomes.map((property) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl overflow-hidden shadow-lg border border-slate-100 flex flex-col justify-between group hover:shadow-xl transition-all duration-300"
              >
                {/* Photo with category badge & Unsave Heart */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <SafeImage
                    src={property.exteriorImage}
                    alt={property.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="glass-panel-dark px-3 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-white">
                      {property.category}
                    </span>
                    {property.isRental && (
                      <span className="glass-panel-dark px-2.5 py-1 rounded-full text-[10px] uppercase font-display tracking-widest text-emerald-300 font-bold">
                        For Rent
                      </span>
                    )}
                  </div>

                  {/* Remove from Saved button */}
                  <button
                    onClick={() => handleRemoveSaved(property.id, property.name)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full glass-panel flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500/80 transition-all cursor-pointer shadow-md"
                    title="Remove from shortlist"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#2F4B73] font-semibold mb-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{property.location}</span>
                    </div>

                    <h3 className="font-display font-bold text-lg text-[#1B2A44] uppercase tracking-tight group-hover:text-[#2F4B73] transition-colors">
                      {property.name}
                    </h3>

                    <div className="font-display font-bold text-base text-[#1B2A44] mt-1">
                      {property.price}
                    </div>

                    <p className="text-xs text-slate-500 font-body line-clamp-2 mt-2 leading-relaxed">
                      {property.description}
                    </p>
                  </div>

                  {/* Specs row */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-[11px] text-slate-600 font-body">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-slate-400" /> {property.beds} Beds
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-slate-400" /> {property.baths} Baths
                    </span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-slate-400" /> {property.sqft}
                    </span>
                  </div>

                  {/* View Details Link */}
                  <Link
                    to={property.link}
                    className="w-full py-2.5 px-4 rounded-full bg-slate-100 hover:bg-[#1B2A44] text-[#1B2A44] hover:text-white font-display text-[11px] uppercase tracking-widest font-semibold transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <span>{property.isRental ? 'View Rental Lease' : 'View Property Details'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-md space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E6ECF5] text-[#2F4B73] flex items-center justify-center mx-auto">
              <Building className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#1B2A44] uppercase">
              No Saved Residences Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-body">
              Explore our signature portfolio or verified residences and click the heart icon on any home to save it here for private review.
            </p>
            <div className="pt-2">
              <PillButton variant="dark" size="md" onClick={() => navigate('/projects')}>
                Explore Signature Projects
              </PillButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
