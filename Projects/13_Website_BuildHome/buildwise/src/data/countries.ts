export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  currencyCode: string;
  region: string;
  baseCostUSD: number; // Base cost per sqft in USD for Standard quality
  luxuryMultiplier: number;
  premiumMultiplier: number;
  economyMultiplier: number;
  popularCities: string[];
  heroImage: string;
  description: string;
  avgBuildTimeMonths: number;
  landCostMultiplier: number;
}

export const COUNTRIES: Country[] = [
  {
    code: "US", name: "United States", flag: "🇺🇸",
    currency: "US Dollar", currencySymbol: "$", currencyCode: "USD",
    region: "North America", baseCostUSD: 150,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.6,
    popularCities: ["New York", "Los Angeles", "Houston", "Dallas", "Miami", "Chicago", "Phoenix", "Seattle", "Denver", "Atlanta"],
    heroImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80",
    description: "The American housing market offers diverse construction options from affordable midwest builds to ultra-luxury coastal estates.",
    avgBuildTimeMonths: 12, landCostMultiplier: 1.8
  },
  {
    code: "GB", name: "United Kingdom", flag: "🇬🇧",
    currency: "British Pound", currencySymbol: "£", currencyCode: "GBP",
    region: "Europe", baseCostUSD: 175,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.65,
    popularCities: ["London", "Manchester", "Birmingham", "Edinburgh", "Bristol", "Leeds", "Liverpool", "Glasgow"],
    heroImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=80",
    description: "UK construction costs reflect high material and labour standards with significant regional variation between London and the regions.",
    avgBuildTimeMonths: 14, landCostMultiplier: 2.2
  },
  {
    code: "AU", name: "Australia", flag: "🇦🇺",
    currency: "Australian Dollar", currencySymbol: "A$", currencyCode: "AUD",
    region: "Oceania", baseCostUSD: 145,
    luxuryMultiplier: 3.8, premiumMultiplier: 2.1, economyMultiplier: 0.65,
    popularCities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Darwin"],
    heroImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
    description: "Australia's construction market balances coastal luxury living with practical suburban developments across its vast landscape.",
    avgBuildTimeMonths: 12, landCostMultiplier: 1.9
  },
  {
    code: "CA", name: "Canada", flag: "🇨🇦",
    currency: "Canadian Dollar", currencySymbol: "C$", currencyCode: "CAD",
    region: "North America", baseCostUSD: 130,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.6,
    popularCities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg", "Quebec City"],
    heroImage: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1920&q=80",
    description: "Canadian construction combines North American standards with unique climate considerations, particularly for cold-weather insulation.",
    avgBuildTimeMonths: 13, landCostMultiplier: 1.7
  },
  {
    code: "IN", name: "India", flag: "🇮🇳",
    currency: "Indian Rupee", currencySymbol: "₹", currencyCode: "INR",
    region: "Asia", baseCostUSD: 30,
    luxuryMultiplier: 5.0, premiumMultiplier: 2.5, economyMultiplier: 0.55,
    popularCities: ["Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Kolkata", "Jaipur", "Kochi"],
    heroImage: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1920&q=80",
    description: "India's rapidly growing construction sector offers excellent value with skilled labor and increasing access to premium materials.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.5
  },
  {
    code: "MY", name: "Malaysia", flag: "🇲🇾",
    currency: "Malaysian Ringgit", currencySymbol: "RM", currencyCode: "MYR",
    region: "Asia", baseCostUSD: 55,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.6,
    popularCities: ["Kuala Lumpur", "Penang", "Johor Bahru", "Kota Kinabalu", "Kuching", "Ipoh", "Shah Alam", "Petaling Jaya"],
    heroImage: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1920&q=80",
    description: "Malaysia offers competitive construction costs with a tropical modern aesthetic and growing premium residential market.",
    avgBuildTimeMonths: 15, landCostMultiplier: 1.4
  },
  {
    code: "SG", name: "Singapore", flag: "🇸🇬",
    currency: "Singapore Dollar", currencySymbol: "S$", currencyCode: "SGD",
    region: "Asia", baseCostUSD: 250,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.5, economyMultiplier: 0.7,
    popularCities: ["Singapore City", "Jurong", "Tampines", "Woodlands", "Clementi", "Bedok"],
    heroImage: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1920&q=80",
    description: "Singapore commands premium construction prices reflecting its land scarcity, world-class building standards and architectural excellence.",
    avgBuildTimeMonths: 24, landCostMultiplier: 5.0
  },
  {
    code: "AE", name: "UAE", flag: "🇦🇪",
    currency: "UAE Dirham", currencySymbol: "AED", currencyCode: "AED",
    region: "Middle East", baseCostUSD: 145,
    luxuryMultiplier: 6.0, premiumMultiplier: 3.0, economyMultiplier: 0.65,
    popularCities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"],
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80",
    description: "UAE construction showcases the pinnacle of modern architecture with ambitious luxury projects and world-class building standards.",
    avgBuildTimeMonths: 18, landCostMultiplier: 2.5
  },
  {
    code: "SA", name: "Saudi Arabia", flag: "🇸🇦",
    currency: "Saudi Riyal", currencySymbol: "SAR", currencyCode: "SAR",
    region: "Middle East", baseCostUSD: 110,
    luxuryMultiplier: 5.0, premiumMultiplier: 2.5, economyMultiplier: 0.6,
    popularCities: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "NEOM"],
    heroImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&q=80",
    description: "Saudi Arabia's Vision 2030 is driving unprecedented construction investment with ambitious megaprojects and residential development.",
    avgBuildTimeMonths: 20, landCostMultiplier: 1.8
  },
  {
    code: "DE", name: "Germany", flag: "🇩🇪",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 200,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.7,
    popularCities: ["Munich", "Berlin", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Dusseldorf", "Leipzig"],
    heroImage: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1920&q=80",
    description: "German construction is renowned for quality engineering, energy efficiency standards and meticulous craftsmanship.",
    avgBuildTimeMonths: 16, landCostMultiplier: 2.0
  },
  {
    code: "FR", name: "France", flag: "🇫🇷",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 185,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.68,
    popularCities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Bordeaux", "Montpellier"],
    heroImage: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80",
    description: "French construction blends classic architecture with modern innovation, from Parisian apartments to Mediterranean villas.",
    avgBuildTimeMonths: 15, landCostMultiplier: 2.1
  },
  {
    code: "JP", name: "Japan", flag: "🇯🇵",
    currency: "Japanese Yen", currencySymbol: "¥", currencyCode: "JPY",
    region: "Asia", baseCostUSD: 160,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.65,
    popularCities: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kobe"],
    heroImage: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=80",
    description: "Japan's construction industry combines minimalist aesthetic excellence with cutting-edge seismic engineering technology.",
    avgBuildTimeMonths: 14, landCostMultiplier: 3.0
  },
  {
    code: "KR", name: "South Korea", flag: "🇰🇷",
    currency: "Korean Won", currencySymbol: "₩", currencyCode: "KRW",
    region: "Asia", baseCostUSD: 130,
    luxuryMultiplier: 3.8, premiumMultiplier: 2.1, economyMultiplier: 0.62,
    popularCities: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Jeju"],
    heroImage: "https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?w=1920&q=80",
    description: "South Korea's construction market is driven by technological integration and high-density urban development.",
    avgBuildTimeMonths: 16, landCostMultiplier: 2.8
  },
  {
    code: "ZA", name: "South Africa", flag: "🇿🇦",
    currency: "South African Rand", currencySymbol: "R", currencyCode: "ZAR",
    region: "Africa", baseCostUSD: 45,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.55,
    popularCities: ["Cape Town", "Johannesburg", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London"],
    heroImage: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&q=80",
    description: "South Africa's construction market offers great value with modern designs, particularly in the booming Cape Town market.",
    avgBuildTimeMonths: 14, landCostMultiplier: 1.3
  },
  {
    code: "NZ", name: "New Zealand", flag: "🇳🇿",
    currency: "New Zealand Dollar", currencySymbol: "NZ$", currencyCode: "NZD",
    region: "Oceania", baseCostUSD: 140,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.65,
    popularCities: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin", "Palmerston North"],
    heroImage: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1920&q=80",
    description: "New Zealand offers stunning natural backdrops with modern construction practices and earthquake resilient building standards.",
    avgBuildTimeMonths: 13, landCostMultiplier: 2.0
  },
  {
    code: "PH", name: "Philippines", flag: "🇵🇭",
    currency: "Philippine Peso", currencySymbol: "₱", currencyCode: "PHP",
    region: "Asia", baseCostUSD: 35,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.58,
    popularCities: ["Manila", "Cebu City", "Davao", "Quezon City", "Makati", "Taguig", "Pasig", "Iloilo"],
    heroImage: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1920&q=80",
    description: "The Philippines offers affordable construction with a growing premium segment driven by OFW investment and urban development.",
    avgBuildTimeMonths: 16, landCostMultiplier: 1.2
  },
  {
    code: "ID", name: "Indonesia", flag: "🇮🇩",
    currency: "Indonesian Rupiah", currencySymbol: "Rp", currencyCode: "IDR",
    region: "Asia", baseCostUSD: 40,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.55,
    popularCities: ["Jakarta", "Surabaya", "Bandung", "Medan", "Bali", "Makassar", "Semarang", "Bekasi"],
    heroImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=80",
    description: "Indonesia's construction market is booming with rapid urbanization, particularly in the Jabodetabek mega-region.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.3
  },
  {
    code: "TH", name: "Thailand", flag: "🇹🇭",
    currency: "Thai Baht", currencySymbol: "฿", currencyCode: "THB",
    region: "Asia", baseCostUSD: 50,
    luxuryMultiplier: 4.2, premiumMultiplier: 2.3, economyMultiplier: 0.58,
    popularCities: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Khon Kaen", "Hat Yai", "Samui", "Hua Hin"],
    heroImage: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1920&q=80",
    description: "Thailand combines affordable construction costs with a tropical lifestyle, attracting both local and international buyers.",
    avgBuildTimeMonths: 15, landCostMultiplier: 1.4
  },
  {
    code: "QA", name: "Qatar", flag: "🇶🇦",
    currency: "Qatari Riyal", currencySymbol: "QR", currencyCode: "QAR",
    region: "Middle East", baseCostUSD: 180,
    luxuryMultiplier: 5.5, premiumMultiplier: 3.0, economyMultiplier: 0.7,
    popularCities: ["Doha", "Al Wakrah", "Al Khor", "Al Rayyan", "Lusail", "The Pearl"],
    heroImage: "https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=1920&q=80",
    description: "Qatar's construction market is among the world's most dynamic, driven by massive infrastructure and luxury residential investment.",
    avgBuildTimeMonths: 22, landCostMultiplier: 3.0
  },
  {
    code: "BH", name: "Bahrain", flag: "🇧🇭",
    currency: "Bahraini Dinar", currencySymbol: "BD", currencyCode: "BHD",
    region: "Middle East", baseCostUSD: 120,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.5, economyMultiplier: 0.65,
    popularCities: ["Manama", "Riffa", "Muharraq", "Hamad Town", "A'ali", "Isa Town"],
    heroImage: "https://images.unsplash.com/photo-1568797629192-789acf8e4df3?w=1920&q=80",
    description: "Bahrain offers a competitive construction market with modern designs and strong investor interest from across the GCC.",
    avgBuildTimeMonths: 18, landCostMultiplier: 2.0
  },
  {
    code: "OM", name: "Oman", flag: "🇴🇲",
    currency: "Omani Rial", currencySymbol: "OMR", currencyCode: "OMR",
    region: "Middle East", baseCostUSD: 100,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.62,
    popularCities: ["Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Buraimi"],
    heroImage: "https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=80",
    description: "Oman's construction market combines traditional Arabian architecture with modern sustainability standards.",
    avgBuildTimeMonths: 20, landCostMultiplier: 1.6
  },
  {
    code: "BR", name: "Brazil", flag: "🇧🇷",
    currency: "Brazilian Real", currencySymbol: "R$", currencyCode: "BRL",
    region: "South America", baseCostUSD: 65,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.58,
    popularCities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Curitiba", "Manaus"],
    heroImage: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1920&q=80",
    description: "Brazil's diverse construction market spans affordable housing to high-end beachfront properties across its massive territory.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.4
  },
  {
    code: "MX", name: "Mexico", flag: "🇲🇽",
    currency: "Mexican Peso", currencySymbol: "MX$", currencyCode: "MXN",
    region: "North America", baseCostUSD: 55,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.58,
    popularCities: ["Mexico City", "Guadalajara", "Monterrey", "Cancun", "Puebla", "Tijuana", "Leon", "Merida"],
    heroImage: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1920&q=80",
    description: "Mexico offers competitive construction costs with rich architectural heritage and growing luxury resort-style developments.",
    avgBuildTimeMonths: 16, landCostMultiplier: 1.3
  },
  {
    code: "IT", name: "Italy", flag: "🇮🇹",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 165,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.65,
    popularCities: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Florence", "Venice", "Bologna"],
    heroImage: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1920&q=80",
    description: "Italian construction combines centuries of architectural expertise with contemporary design, from rural villas to urban apartments.",
    avgBuildTimeMonths: 18, landCostMultiplier: 2.0
  },
  {
    code: "ES", name: "Spain", flag: "🇪🇸",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 140,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.62,
    popularCities: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Bilbao", "Alicante"],
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
    description: "Spain's diverse construction market ranges from Andalusian cortijos to Barcelona's iconic modernist-influenced urban housing.",
    avgBuildTimeMonths: 15, landCostMultiplier: 1.8
  },
  {
    code: "NG", name: "Nigeria", flag: "🇳🇬",
    currency: "Nigerian Naira", currencySymbol: "₦", currencyCode: "NGN",
    region: "Africa", baseCostUSD: 35,
    luxuryMultiplier: 5.0, premiumMultiplier: 2.5, economyMultiplier: 0.55,
    popularCities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Enugu"],
    heroImage: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1920&q=80",
    description: "Nigeria's rapidly urbanizing market presents significant construction opportunity, particularly in Lagos and Abuja.",
    avgBuildTimeMonths: 20, landCostMultiplier: 1.5
  },
  {
    code: "KE", name: "Kenya", flag: "🇰🇪",
    currency: "Kenyan Shilling", currencySymbol: "KSh", currencyCode: "KES",
    region: "Africa", baseCostUSD: 40,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.58,
    popularCities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi"],
    heroImage: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80",
    description: "Kenya's construction market is Africa's most dynamic, with Nairobi emerging as a continental hub for premium real estate.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.4
  },
  {
    code: "EG", name: "Egypt", flag: "🇪🇬",
    currency: "Egyptian Pound", currencySymbol: "E£", currencyCode: "EGP",
    region: "Africa", baseCostUSD: 35,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.55,
    popularCities: ["Cairo", "Alexandria", "Giza", "Sharm El-Sheikh", "Hurghada", "Luxor", "New Capital"],
    heroImage: "https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=1920&q=80",
    description: "Egypt's massive housing programme and New Administrative Capital project are transforming the construction landscape.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.3
  },
  {
    code: "VN", name: "Vietnam", flag: "🇻🇳",
    currency: "Vietnamese Dong", currencySymbol: "₫", currencyCode: "VND",
    region: "Asia", baseCostUSD: 40,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.55,
    popularCities: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Haiphong", "Can Tho", "Bien Hoa", "Hue", "Nha Trang"],
    heroImage: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=80",
    description: "Vietnam's booming economy is driving rapid residential construction across its major urban centers.",
    avgBuildTimeMonths: 16, landCostMultiplier: 1.5
  },
  {
    code: "PK", name: "Pakistan", flag: "🇵🇰",
    currency: "Pakistani Rupee", currencySymbol: "Rs", currencyCode: "PKR",
    region: "Asia", baseCostUSD: 25,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.55,
    popularCities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"],
    heroImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=80",
    description: "Pakistan's construction sector is growing rapidly with major housing schemes and urban development projects.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.2
  },
  {
    code: "BD", name: "Bangladesh", flag: "🇧🇩",
    currency: "Bangladeshi Taka", currencySymbol: "৳", currencyCode: "BDT",
    region: "Asia", baseCostUSD: 22,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.55,
    popularCities: ["Dhaka", "Chittagong", "Sylhet", "Khulna", "Rajshahi", "Comilla"],
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80",
    description: "Bangladesh offers extremely competitive construction costs in a rapidly urbanizing economy.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.2
  },
  {
    code: "CH", name: "Switzerland", flag: "🇨🇭",
    currency: "Swiss Franc", currencySymbol: "CHF", currencyCode: "CHF",
    region: "Europe", baseCostUSD: 350,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.7,
    popularCities: ["Zurich", "Geneva", "Basel", "Lausanne", "Bern", "Lugano", "St. Moritz", "Zermatt"],
    heroImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
    description: "Switzerland represents the pinnacle of European construction quality with premium materials and precision engineering.",
    avgBuildTimeMonths: 18, landCostMultiplier: 4.0
  },
  {
    code: "SE", name: "Sweden", flag: "🇸🇪",
    currency: "Swedish Krona", currencySymbol: "kr", currencyCode: "SEK",
    region: "Europe", baseCostUSD: 220,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.68,
    popularCities: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro"],
    heroImage: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1920&q=80",
    description: "Sweden leads in sustainable construction with world-class wood architecture and passive house standards.",
    avgBuildTimeMonths: 15, landCostMultiplier: 2.2
  },
  {
    code: "NO", name: "Norway", flag: "🇳🇴",
    currency: "Norwegian Krone", currencySymbol: "kr", currencyCode: "NOK",
    region: "Europe", baseCostUSD: 280,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.7,
    popularCities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Tromsø", "Drammen"],
    heroImage: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1920&q=80",
    description: "Norway's oil-rich economy supports premium construction standards with excellent energy efficiency requirements.",
    avgBuildTimeMonths: 14, landCostMultiplier: 2.5
  },
  {
    code: "DK", name: "Denmark", flag: "🇩🇰",
    currency: "Danish Krone", currencySymbol: "kr", currencyCode: "DKK",
    region: "Europe", baseCostUSD: 240,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.7,
    popularCities: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Frederiksberg"],
    heroImage: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1920&q=80",
    description: "Denmark is a global leader in sustainable architecture and innovative construction design.",
    avgBuildTimeMonths: 14, landCostMultiplier: 2.3
  },
  {
    code: "NL", name: "Netherlands", flag: "🇳🇱",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 210,
    luxuryMultiplier: 3.8, premiumMultiplier: 2.1, economyMultiplier: 0.68,
    popularCities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg"],
    heroImage: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=1920&q=80",
    description: "The Netherlands is renowned for innovative architecture and engineering, particularly in water management integration.",
    avgBuildTimeMonths: 15, landCostMultiplier: 2.8
  },
  {
    code: "PT", name: "Portugal", flag: "🇵🇹",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 120,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.62,
    popularCities: ["Lisbon", "Porto", "Faro", "Braga", "Coimbra", "Madeira", "Azores"],
    heroImage: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1920&q=80",
    description: "Portugal offers exceptional value in the European market with beautiful architecture and a booming luxury villa market.",
    avgBuildTimeMonths: 16, landCostMultiplier: 1.8
  },
  {
    code: "GR", name: "Greece", flag: "🇬🇷",
    currency: "Euro", currencySymbol: "€", currencyCode: "EUR",
    region: "Europe", baseCostUSD: 110,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.6,
    popularCities: ["Athens", "Thessaloniki", "Mykonos", "Santorini", "Rhodes", "Crete", "Corfu"],
    heroImage: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1920&q=80",
    description: "Greece combines Mediterranean lifestyle with competitive construction costs across mainland and island properties.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.7
  },
  {
    code: "TR", name: "Turkey", flag: "🇹🇷",
    currency: "Turkish Lira", currencySymbol: "₺", currencyCode: "TRY",
    region: "Europe/Asia", baseCostUSD: 65,
    luxuryMultiplier: 4.5, premiumMultiplier: 2.3, economyMultiplier: 0.58,
    popularCities: ["Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Bodrum", "Alanya"],
    heroImage: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1920&q=80",
    description: "Turkey offers excellent value construction with stunning natural settings from the Bosphorus to the Mediterranean coast.",
    avgBuildTimeMonths: 15, landCostMultiplier: 1.5
  },
  {
    code: "IL", name: "Israel", flag: "🇮🇱",
    currency: "Israeli Shekel", currencySymbol: "₪", currencyCode: "ILS",
    region: "Middle East", baseCostUSD: 180,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.68,
    popularCities: ["Tel Aviv", "Jerusalem", "Haifa", "Beersheba", "Petah Tikva", "Herzliya", "Eilat"],
    heroImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80",
    description: "Israel's premium construction market is driven by strong demand, high tech workforce housing needs, and luxury coastal living.",
    avgBuildTimeMonths: 24, landCostMultiplier: 3.5
  },
  {
    code: "ZW", name: "Zimbabwe", flag: "🇿🇼",
    currency: "US Dollar (adopted)", currencySymbol: "$", currencyCode: "USD",
    region: "Africa", baseCostUSD: 30,
    luxuryMultiplier: 3.5, premiumMultiplier: 2.0, economyMultiplier: 0.55,
    popularCities: ["Harare", "Bulawayo", "Mutare", "Gweru", "Kwekwe"],
    heroImage: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80",
    description: "Zimbabwe's construction market uses USD with growing investment in residential development in Harare.",
    avgBuildTimeMonths: 20, landCostMultiplier: 1.0
  },
  {
    code: "GH", name: "Ghana", flag: "🇬🇭",
    currency: "Ghanaian Cedi", currencySymbol: "₵", currencyCode: "GHS",
    region: "Africa", baseCostUSD: 35,
    luxuryMultiplier: 4.0, premiumMultiplier: 2.2, economyMultiplier: 0.55,
    popularCities: ["Accra", "Kumasi", "Tamale", "Sekondi", "Cape Coast", "Tema"],
    heroImage: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1920&q=80",
    description: "Ghana is West Africa's most stable construction market with growing premium residential development.",
    avgBuildTimeMonths: 18, landCostMultiplier: 1.3
  },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.55,
  CAD: 1.36,
  INR: 83.5,
  MYR: 4.72,
  SGD: 1.35,
  AED: 3.67,
  SAR: 3.75,
  JPY: 149.5,
  KRW: 1320.0,
  ZAR: 18.7,
  NZD: 1.63,
  PHP: 56.8,
  IDR: 15750.0,
  THB: 35.4,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  BRL: 4.97,
  MXN: 17.2,
  CHF: 0.89,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.88,
  TRY: 30.5,
  ILS: 3.72,
  VND: 24500.0,
  PKR: 278.5,
  BDT: 110.0,
  KES: 145.0,
  EGP: 30.9,
  NGN: 1500.0,
  GHS: 12.5,
  ZWL: 1.0,
};

export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  const localAmount = amount * rate;
  const symbol = COUNTRIES.find(c => c.currencyCode === currencyCode)?.currencySymbol || '$';

  if (localAmount >= 1_000_000_000) {
    return `${symbol}${(localAmount / 1_000_000_000).toFixed(2)}B`;
  } else if (localAmount >= 1_000_000) {
    return `${symbol}${(localAmount / 1_000_000).toFixed(2)}M`;
  } else if (localAmount >= 1_000) {
    return `${symbol}${(localAmount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${Math.round(localAmount).toLocaleString()}`;
}

export function formatCurrencyFull(amount: number, currencyCode: string): string {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  const localAmount = amount * rate;
  const symbol = COUNTRIES.find(c => c.currencyCode === currencyCode)?.currencySymbol || '$';
  return `${symbol}${Math.round(localAmount).toLocaleString()}`;
}
