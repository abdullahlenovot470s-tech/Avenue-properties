import { BRAND_CONFIG } from '../config/brand.config';

const shortBrand = BRAND_CONFIG.identity.brandShortName;
const country = BRAND_CONFIG.locale.country;

export const URGLISH_COPY = {
  hero: {
    subtitle: `${country} ki top residential societies mein verified architectural excellence aur long-term value ke sath modern living ka tajurba karein.`,
  },
  servicesSection: {
    subtitle: `${shortBrand} har step par aapki rehnumai karta hai — chahe aap family home buy kar rahe hon, overseas se rental property manage kar rahe hon, ya high-value investment secure kar rahe hon.`,
    cardDescriptions: {
      '01': 'Local aur overseas clients ke liye targeted property sourcing, market valuation, fard verification aur complete society transfer support.',
      '02': 'Corporate aur diplomatic tenants ki complete screening, solar system servicing aur har mahine transparent rental transfer ki zimmedari.',
      '03': 'Prime commercial floors, plot banking, FBR tax planning aur verified buyers ke darmiyan confidential private deals.',
    } as Record<string, string>,
  },
  portfolioSection: {
    guaranteeBody:
      'Hamare signature portfolio ki har property list karne se pehle LDA, CDA, KDA title scrutiny aur engineering audit se guzarti hai.',
  },
  homePickSection: {
    introNote:
      'Verified architecture, clear transfer records aur family comfort ke sath muntakhib residences.',
  },
  contactCta: {
    intro: `${shortBrand} ka managing partner working days mein 2 ghante ke andar khud jawab deta hai. Aap WhatsApp ya office phone par bhi direct baat kar sakte hain.`,
    confirmationPrefix: 'Hamara managing partner',
    confirmationSuffix: 'aap se 2 business hours ke andar direct contact karega.',
  },
  footer: {
    missionTagline: `${country} ke behtareen architectural houses, plots aur verified property transfers ke liye aapka trusted partner.`,
  },
  aboutPage: {
    manifestoBody: `Is yaqeen par qaim ke ghar aik family ki buniyad aur legacy hota hai, ${shortBrand} modern architecture ko clear legal titles aur transparent transfers ke sath jorta hai. Hum aam property dealers ki tarah nahi, balkay ${country} ki top family residences ke liye trusted advisors ke tor par kaam karte hain.`,
    principlesBody: `Aam agents ke baraks, ${shortBrand} ${BRAND_CONFIG.locale.mainCities.slice(0, 3).join(', ')} mein sirf vetted luxury residences pesh karta hai. Har property ka complete audit hota hai jisme clear fard aur registry, society NOC approval (LDA, CDA, DHA, Bahria), structural quality aur solar/utility systems check kiye jate hain.`,
    principlesChecks: [
      '100% verified society transfers aur clean possession',
      'PCATP-registered architects ke sath direct consultation',
      'Overseas clients ke liye Power of Attorney aur transfer guidance',
      'Load-shedding-free solar system aur generator ki mukammal inspection',
    ],
    leadershipSubtitle: `Senior ${BRAND_CONFIG.locale.nationalityAdjective} real estate aur architecture professionals ki team jo design aur business ke top idaron se qualified hain.`,
    ctaBody: `Chahe aap residential plot dekh rahe hon ya ${BRAND_CONFIG.locale.mainCities.slice(0, 3).join(', ')} mein tayyar luxury home buy karna chahte hon, hamare senior partners mukammal rehnumai faraham karte hain.`,
  },
  servicesPage: {
    headerBody: `Hum modern architecture aur family property safety ke sangam par kaam karte hain, taake local buyers aur overseas families ko complete transparency, verified documents aur private advisory mile.`,
    specialisedSubtitle:
      'Family groups, corporate investors aur overseas clients ke liye khas property solutions.',
    familyOfficeCards: [
      {
        title: 'Family Property Management',
        description:
          'Hum business families ke property portfolios manage karte hain — jisme society transfers, verified tenant placement aur annual valuation reviews shamil hain.',
      },
      {
        title: 'Architect & Builder Coordination',
        description: `Custom ghar banwane wale clients ke liye hum ${BRAND_CONFIG.locale.mainCities.slice(0, 3).join(', ')} mein licensed architects aur trusted builders ke sath rabta aur supervision karwate hain.`,
      },
      {
        title: 'Discreet Private Sales',
        description:
          'Bina kisi public board ya ghair-mutaliqa visits ke apni premium property sale karein. Tamam deals sirf verified buyers aur sellers ke darmiyan confidential hoti hain.',
      },
    ],
  },
  projectsPage: {
    headerSubtitle: `${country} ke mashhoor architects, licensed engineers aur master builders ki tayyar karda signature residences dekhein.`,
    emptyState: 'Apni search keywords ya city filter change karke dobara check karein.',
  },
  buyPage: {
    headerSubtitle: `${BRAND_CONFIG.locale.mainCities.join(', ')} mein guaranteed clean titles aur verified documentation ke sath houses, apartments aur plots.`,
    emptyState: 'City, budget range ya plot/house type filter adjust karke dobara search karein.',
  },
  rentPage: {
    headerSubtitle: `${BRAND_CONFIG.locale.mainCities.join(', ')} mein verified houses, luxury apartments aur independent portions rent ke liye dastiyab hain.`,
    emptyState: 'City, property type, rent bracket ya furnishing filter tabdeel karke dekhein.',
  },
  contactPage: {
    headerSubtitle: `Hamare managing partners ${BRAND_CONFIG.locale.mainCities.slice(0, 3).join(', ')} ke offices se kaam karte hain, aur local buyers ke sath overseas clients ko bhi mukammal support dete hain.`,
    officeHoursSubtitle: `Private consultation Monday se Saturday, 9:00 AM se 6:00 PM ${BRAND_CONFIG.locale.timezoneLabel} tak dastiyab hai.`,
    overseasOfficeAddress:
      'UK, USA, UAE, Saudi Arabia aur Canada mein muqeem overseas clients ke liye dedicated advisory desk.',
    faqIntro: `${country} mein title verification, overseas property transfers aur sarkari/society fees ke mutaliq ahem sawalon ke jawabat.`,
    dialogueBody:
      'Tamam guftagu aur maloomat mukammal tor par confidential rakhi jati hain. Chahe aap ghar buy kar rahe hon ya portfolio sale ka plan bana rahe hon, hamare senior partners aapki khidmat mein hazir hain.',
    responseWindow: `Response time: Working hours mein 2 ghante ke andar (${BRAND_CONFIG.locale.timezoneLabel})`,
    directRep: 'Direct managing partner representation guaranteed',
    confirmationText: 'ka managing director jald aapse khud rabta karega.',
  },
  detailPages: {
    financingExclusionNote: 'Stamp duty, CVT aur society transfer fee is hisab mein shamil nahi hain',
    buyViewingSubtext: `Site visits ${shortBrand} partner khud society security clearance ke sath arrange karte hain.`,
    buyVerificationNote:
      'Visit se pehle mukammal registry, fard, NDC aur society transfer verification ki jati hai.',
    buyConfirmationSuffix: 'aapka private property visit coordinate karega.',
    projectViewingSubtext: `Visits ${shortBrand} directors ke zariye confirmed society appointment ke sath arrange hoti hain.`,
    projectVerificationNote:
      'Verified consultation par architectural drawings, registry/fard records aur society NOC approvals share kiye jate hain.',
    projectConfirmationSuffix: 'aapke liye private site visit schedule karega.',
    rentViewingSubtext: 'Is ghar ka in-person visit ya live video tour schedule karein.',
    rentConfirmationSuffix:
      'key handover aur society gate entry confirm karne ke liye aapse call par rabta karega.',
    consultationModalSubtext: `Discreet property buying, transfer verification aur investment mashware ke liye ${shortBrand} ke senior partners se rabta karein.`,
    consultationConfirmationSuffix: 'aapse consultation coordinate karne ke liye contact karega.',
    propertyModalVerification:
      'Request par mukammal fard, registry aur society NOC verification records dikhaye jate hain.',
  },
  auth: {
    loginSubtitle:
      'Apni saved properties, private viewing schedules aur verified client profile tak rasai hasil karein.',
    loginQuote: '"Behtareen architecture rozmarra ki zindagi ko aik shahkar bana deti hai."',
    signupSubtitle: `${country} ki verified architectural properties tak confidential rasai ke liye account banayein.`,
    signupTermsLabel: `Main ${shortBrand} ke client representation rules, privacy aur verified legal standards ko tasleem karta/karti hoon.`,
    signupQuote: '"Legal yaqeen aur bharose ke sath architectural legacies banana."',
    signupQuoteSubtext: `${country} ki modern estates, verified fards aur vetted luxury properties ki premier registry mein shamil hon.`,
  },
  statsSublabels: {
    '6,000+': 'DHA, CDA aur top societies mein mukammal transfers',
    '3,600+': 'Verified possession aur NOC approvals ke sath delivered homes',
  } as Record<string, string>,
  portfolioSummaries: {
    'aspen-retreat':
      'Bhurban ki khubsurat pahari par waqia modern mountain villa, jisme heated flooring, local stone work aur pine forest ka nazara shamil hai.',
    'obsidian-monolith':
      'Clifton Block 2 Karachi mein waqia modern coastal villa — private pool, soundproof double-glazing, guard room aur 99-year verified KDA lease ke sath.',
    'zenith-pavilion':
      'Sector F-7 Islamabad mein Margalla Hills ke daman mein pur-sukoon ghar — solid deodar lakri ka kaam, 15kW hybrid solar aur clear CDA title ke sath.',
    'ironwood-gallery':
      'DHA Phase 6 Lahore ke main boulevard par architecture-designed residence — Italian porcelain tiles, solar microgrid aur fori transfer ke liye tayyar.',
    'reflection-residence':
      'Bahria Enclave mein Margalla foothills ke samne 10 Marla modern ghar — open courtyard aur khubsurat skylights ke sath design kiya gaya hai.',
  } as Record<string, string>,
  propertyListings: {
    'clifton-coastal-monolith': {
      description:
        'Clifton Block 2 Karachi mein modern fair-face concrete villa, jisme private swimming pool, soundproof double-glazing, guard room aur verified 99-year KDA lease shamil hai.',
      extendedStory:
        'Clifton Karachi ki premier coastal residence. Oonchi boundary walls, meetha pani (sweet water line), standby generator ke sath full solar setup aur clear title registry dastiyab hai.',
    },
    'zenith-margalla-pavilion': {
      description:
        'Margalla Hills ke qareeb pur-sukoon bungalow jisme solid deodar wood, white travertine stone aur water features hain. Full solar setup, car porch aur servant quarter bhi shamil hai.',
      extendedStory:
        'Sector F-7 Islamabad mein CDA-approved property jiski fard aur registry verified hai. Natural mountain light, khulay terraces, underground water tank aur pur-fiza mahol iski khas khubi hai.',
    },
    'ironwood-boulevard-estate': {
      description:
        'Solid teak wood, double-height drawing room, lawn aur swimming pool ke sath khula modern bungalow. Full solar backup aur generator wiring pehle se mojood hai.',
      extendedStory:
        'DHA Phase 6 Lahore ke main boulevard par waqia. Clear possession, tamam society dues ada shuda aur bank transfer ya pay order ke zariye fori transfer ke liye tayyar.',
    },
    'aspen-ridge-lodge': {
      description:
        'Bhurban mein valley view wala shandar mountain villa, jisme local pine wood, heavy thermal insulation, heated floors aur backup generator shamil hai.',
      extendedStory:
        'Mukammal approved registry aur intiqal (mutation) clean revenue record ke sath. Pearl Continental Bhurban se sirf 5 minute ki doori par, saal bhar paki sarak ki access ke sath behtareen holiday home.',
    },
    'reflection-foothills-villa': {
      description:
        'Bahria Enclave mein Margalla foothills ki taraf rukh wala 10 Marla modern ghar, jo khulay courtyard aur skylights ke sath design kiya gaya hai.',
      extendedStory:
        'Clear title ke sath verified Bahria transfer. Modern open kitchen, rooftop terrace, underground water storage aur solar backup ki sahulat mojood hai.',
    },
    'dha-10-marla': {
      description:
        'DHA Phase 5 Lahore mein bilkul naya 10 Marla ghar. Double-height lobby, Spanish tiles, imported sanitary fittings aur khubsurat lawn shamil hai.',
      extendedStory:
        'Tamam dues cleared hain aur DHA transfer ke liye tayyar hai. Ring Road, international schools aur sports complex ke bilkul qareeb waqia hai.',
    },
    'f8-kanal-house': {
      description:
        'Islamabad ke sar-sabz Sector F-8 mein 1 Kanal executive residence — solid woodwork, khuli driveway, thandi hawa aur clear CDA title ke sath.',
      extendedStory:
        'Prime location par waqia jahan fori CDA registry aur intiqal mumkin hai. Pur-sukoon gali aur high-security mahol.',
    },
    'dha-karachi-500': {
      description:
        'DHA Phase 8 Karachi mein hawadar coastal villa — private plunge pool, modular kitchen, sea-facing rooftop lounge aur 24/7 DHA security ke sath.',
      extendedStory:
        'Bina kisi uljhan ke clean DHA transfer. Underground sweet water tanks, solar panels aur driver room ki sahulat mojood hai.',
    },
    'askari-11-house': {
      description:
        'Askari 11 Lahore mein saf-suthra double-storey 8 Marla ghar. Sakht gated security, musalsal gas aur pani ki supply aur qareeb park mojood hai.',
      extendedStory:
        'GHQ/Askari direct transfer ke sath fori possession. Bachon aur family ke liye nihayat mehfooz aur pur-sukoon rihaishi mahol.',
    },
    'bahria-rawalpindi-7-marla': {
      description:
        'Bahria Town Phase 7 Rawalpindi mein height par corner house. Khubsurat views, double kitchen aur Bahria power grid se zero load-shedding.',
      extendedStory:
        'Tamam society dues clear hain aur Bahria transfer ke liye ready hai. Clock Tower commercial aur Safari Park ke qareeb.',
    },
    'gulberg-apartment': {
      description:
        'Gulberg III Lahore ke markaz mein high-end 3-bed apartment. Balcony view, reserved basement parking aur full generator backup shamil hai.',
      extendedStory:
        'Registered sublease ke sath LDA-approved high-rise building. MM Alam Road ke restaurants aur business centers se walking distance par.',
    },
    'bahria-5-marla': {
      description:
        'Bahria Town Lahore mein solid woodwork, designer ceilings aur fori possession ke sath khubsurat 5 Marla modern ghar.',
      extendedStory:
        'Verified NOC ke sath Bahria Town direct transfer. Grand Jamia Mosque aur commercial area ke bilkul qareeb.',
    },
    'clifton-2-bed': {
      description:
        'Clifton Block 4 Karachi mein samundari hawa wali balcony, standby generator aur reserved parking ke sath modern 2-bed apartment.',
      extendedStory:
        'Verified 99-year KDA lease bina kisi encumbrance ke. Supermarkets, cafes aur Clifton beach se qareeb tareen.',
    },
    'e11-apartment': {
      description:
        'Sector E-11 Islamabad mein affordable modern 1-bed apartment — khubsurat hills view, lift aur achi monthly rental income ke sath.',
      extendedStory:
        'Behtar manage ki gayi residential tower mein registered sublease, jahan 24/7 security aur maintenance mojood hai.',
    },
  } as Record<string, { description: string; extendedStory?: string }>,
  servicesOffered: {
    'acquisition-strategy': {
      description:
        'Hum Pakistan ki top societies mein aapka agla ghar dhoondne ka behtareen tareeqa pesh karte hain. Hamari service mein property sourcing, private visits, fard/registry verification aur price negotiation shamil hai taake aapko sukoon aur behtar investment mile.',
      expandedDetails: [
        'Verified society transfer aur registry documents ki mukammal checking',
        'FBR filer tax guidance aur stamp duty / CVT planning',
        'Overseas Pakistanis ke liye Power of Attorney aur remote transfer support',
        'Building quality check, solar system audit aur gas meter verification',
      ],
      deliverables: [
        'Property Due Diligence Report (LDA / CDA / DHA / Bahria NOC Status)',
        'Haliya society transfers ke mutabiq Comparative Price Analysis',
        'Mukammal Registry, Transfer aur Possession Handover Coordination',
      ],
    },
    'portfolio-management': {
      description:
        'Pakistan aur overseas mein muqeem malikan ke liye hum aapki properties ki mukammal hifazat aur management karte hain. Corporate aur diplomatic tenants ki tasdeeq se lekar maintenance aur kiraye ki wasooli tak har kaam zimmedari se hota hai.',
      expandedDetails: [
        'Diplomatic aur multinational corporate tenants ki proper verification',
        'Har 3 mahine baad preventative maintenance, solar aur generator servicing',
        'Local rental laws ke mutabiq mazboot aur clear tenancy agreements',
        'Property tax, utility bills aur society maintenance ki mukammal dekh-bhal',
      ],
      deliverables: [
        'Digital Property Statement aur Rental Income Reports',
        'Solar System aur Generator Maintenance ka Schedule',
        'Verified aur Pre-Screened Tenant Placement Service',
      ],
    },
    'capital-transactions': {
      description: `${country} mein bari property deals ke liye gehri local samajh darkar hoti hai. ${shortBrand} verified buyers aur sellers ke darmiyan prime plots, commercial floors aur confidential resales organize karta hai.`,
      expandedDetails: [
        'Gulberg, DHA aur Blue Area Islamabad mein prime commercial plots',
        'High-rental commercial floors aur corporate office spaces',
        'Approved new projects ke installment plans par behtar mashwara',
        'Verified principals ke darmiyan bilkul confidential resale deals',
      ],
      deliverables: [
        'PKR 15 Crore se zyada ki properties ke liye Investment Analysis',
        'FBR Filer aur Non-Filer Tax Comparison Report',
        'High-Value Private Deals ke liye Discreet Buyer/Seller Matching',
      ],
    },
  } as Record<
    string,
    { description: string; expandedDetails: string[]; deliverables: string[] }
  >,
  buyDescriptions: {
    'buy-bahria-5m-lhr':
      'Bahria Town Lahore Sector C mein shandar finished 5 Marla double-storey ghar. Solid ash wood doors, Spanish porcelain tiles, imported fittings aur car porch shamil hai.',
    'buy-dha5-10m-lhr':
      'DHA Phase 5 Lahore Sector C mein architect-designed 10 Marla bungalow. Oonchi chhatain, khula open lounge, Turkish bath fittings aur 2 gariyon ka porch mojood hai.',
    'buy-clifton-3b-khi':
      'Clifton Block 2 Karachi mein corner 3-bedroom luxury apartment. Samundar aur city ka khubsurat view, tez speed lifts aur 24/7 standby generator backup.',
    'buy-dha7-1k-plot-lhr':
      'Sector U, DHA Phase 7 Lahore mein 60-foot wide road par 1 Kanal residential plot. Tamam development charges aur possession paid hain, ghar banane ke liye bilkul tayyar.',
    'buy-bahria8-7m-rwp':
      'Bahria Town Phase 8 Rawalpindi mein bilkul naya 7 Marla architect-built villa. Musalsal bijli, valley view wala rooftop terrace aur European fittings shamil hain.',
    'buy-e11-2b-isb':
      'Sector E-11 Islamabad mein 3rd floor par high-demand 2-bedroom executive apartment. Margalla Hills ka nazara, achi rental income, double lifts aur underground parking.',
    'buy-margalla-2k-isb':
      'Sector F-7 Islamabad mein 2 Kanal par bana shandar diplomatic-grade estate. Heated indoor pool, 25kW solar system, Turkish stone walls aur security post shamil hai.',
    'buy-raya-2k-lhr':
      'Defence Raya DHA Phase 6 Lahore mein golf course ke samne bana luxury villa. Deodar wood ka kaam, infinity plunge pool aur khubsurat courtyard lounge.',
    'buy-murree-1k-resort':
      'Bhurban ki pahariyon mein khubsurat pine residence. Central gas heating, cedar wood chhatain, pine valley ka khula terrace aur har mausam ke liye paki sarak.',
  } as Record<string, string>,
  rentalDescriptions: {
    'rent-1':
      'DHA Phase 5 Lahore mein saf-suthra 10 Marla independent ghar. Solid ash wood doors, khula drawing room, imported tile flooring aur park/masjid ke bilkul qareeb.',
    'rent-2':
      'Central Gulberg III mein 5th floor par furnished 2-bedroom luxury apartment. MM Alam Road ke qareeb, complete generator backup aur dedicated parking ke sath.',
    'rent-3':
      'Sector F-7 Islamabad mein shandar 1 Kanal villa. Diplomats, corporate executives aur badi families ke liye ideal — sukoon, privacy, solar power aur CDA sahuliyat ke sath.',
    'rent-4':
      'Bahria Town Phase 4 Rawalpindi mein 3rd floor par modern 3-bed corner apartment. Bahria grid se zero load-shedding, lift aur qareebi commercial market.',
    'rent-5':
      'Bahria Town Lahore Sector C mein saf-suthra 5 Marla family ghar. Double unit design separate gates ke sath, stylish cupboards aur gas/pani ki mukammal supply.',
    'rent-6':
      'DHA Phase 6 Lahore mein 1 Kanal modern bungalow ka khula upper portion. Apna alag gate, separate electricity/gas meters, bada terrace aur 3 attached-bath bedrooms.',
    'rent-7':
      'Clifton Block 2 Karachi mein 8th floor par furnished coastal apartment. Taza samundari hawa, 24/7 security, sweet water line aur Bilawal Chowrangi ke bilkul qareeb.',
    'rent-8':
      'DHA Phase 8 Karachi mein bilkul naya 500 Sq. Yards designer ghar. Oonchi chhatain, private swimming pool, basement lounge aur bijli bachane wala heavy solar system.',
    'rent-9':
      'DHA Phase 6 Karachi mein Bukhari Commercial ke qareeb premium 3-bed apartment. Khubsurat furniture, high-speed lift, sweet water aur 24-hour generator ke sath move-in ready.',
    'rent-10':
      'Sector E-11 Islamabad mein 2nd floor par cozy aur modern 1-bed furnished apartment. Single professionals ya couples ke liye ideal — hills view, lift aur munasib kiraya.',
    'rent-11':
      'Askari 11 Lahore mein mehfooz aur family-friendly 8 Marla ghar. Sakht gated entry, musalsal utilities, Ring Road interchange ke qareeb aur bachon ke liye safe mahol.',
    'rent-12':
      'PC Hotel Bhurban ke qareeb khubsurat 2-bed hillside cottage. Electric heating, pine woodwork, Murree valley ke nazare wali private balcony aur taza pahari hawa.',
  } as Record<string, string>,
  teamBios: {
    'Ahmed Raza Khan':
      'Pakistani residential property advisory mein 20 saal se zyada ka tajurba — DHA, CDA sectors aur Bahria Town mein prime deals aur transfers ka wasee experience.',
    'Ayesha Siddiqui': `NCA Lahore ki graduate aur PCATP ki member. Ayesha ${shortBrand} ki architectural verification, structural checking aur design standards ko lead karti hain.`,
    'Hamza Malik':
      'Karachi ki luxury coastal real estate aur corporate/diplomatic leasing mein 14 saal ka tajurba, khas tor par Clifton aur DHA Phase 6–8 mein.',
    'Fatima Noor':
      'Overseas clients ke liye Power of Attorney, banking channels aur remote digital property verification ke tamam maamlat ko coordinate karti hain.',
  } as Record<string, string>,
  faqsById: {
    'faq-1': {
      question: `${shortBrand} property titles aur society approvals ki tasdeeq kaise karta hai?`,
      answer:
        'Har property ki listing se pehle mutaliqa authority (DHA, CDA, LDA, KDA ya Bahria Town) se documents check kiye jate hain — jisme allotment status, cleared dues aur tax records ki mukammal tasdeeq shamil hoti hai.',
    },
    'faq-2': {
      question: 'Kya overseas clients door baith kar property buy ya rent kar sakte hain?',
      answer:
        'Ji haan. Hamara Overseas Desk live video inspections, embassy se attested Power of Attorney ki tayyari, legal banking channels aur final biometric transfer tak mukammal madad karta hai.',
    },
    'faq-3': {
      question: 'Kya property ki qeemat mein society transfer fees bhi shamil hoti hain?',
      answer:
        'Di gayi qeematein sirf property ki asking valuation hoti hain. Sarkari stamp duty, FBR tax aur society transfer fees har deal sheet mein alag se aur bilkul wazeh likhi jati hain.',
    },
  } as Record<string, { question: string; answer: string }>,
  faqsByQuestion: {
    [`How does ${shortBrand} verify property titles and society approvals?`]: {
      question: `${shortBrand} property titles aur society approvals ki tasdeeq kaise karta hai?`,
      answer:
        'Har property ki listing se pehle mutaliqa authority (DHA, CDA, LDA, KDA ya Bahria Town) se documents check kiye jate hain — jisme allotment status, cleared dues aur tax records ki mukammal tasdeeq shamil hoti hai.',
    },
    'Can overseas clients purchase or lease remotely?': {
      question: 'Kya overseas clients door baith kar property buy ya rent kar sakte hain?',
      answer:
        'Ji haan. Hamara Overseas Desk live video inspections, embassy se attested Power of Attorney ki tayyari, legal banking channels aur final biometric transfer tak mukammal madad karta hai.',
    },
    'Are listed valuations inclusive of society transfer fees?': {
      question: 'Kya property ki qeemat mein society transfer fees bhi shamil hoti hain?',
      answer:
        'Di gayi qeematein sirf property ki asking valuation hoti hain. Sarkari stamp duty, FBR tax aur society transfer fees har deal sheet mein alag se aur bilkul wazeh likhi jati hain.',
    },
  } as Record<string, { question: string; answer: string }>,
};
