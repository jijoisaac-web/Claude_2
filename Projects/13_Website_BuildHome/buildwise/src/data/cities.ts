export interface City {
  name: string;
  countryCode: string;
  slug: string;
  costMultiplier: number; // relative to country base
  population: string;
  climate: string;
  description: string;
  image: string;
}

export const CITIES: City[] = [
  // USA
  { name: "New York", countryCode: "US", slug: "new-york", costMultiplier: 1.8, population: "8.3M", climate: "Humid Continental", description: "America's most expensive city for construction with premium Manhattan prices", image: "https://images.unsplash.com/photo-1546436836-07a91091f160?w=800&q=80" },
  { name: "Los Angeles", countryCode: "US", slug: "los-angeles", costMultiplier: 1.6, population: "3.9M", climate: "Mediterranean", description: "Premium coastal living with earthquake-resistant construction requirements", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80" },
  { name: "Houston", countryCode: "US", slug: "houston", costMultiplier: 1.1, population: "2.3M", climate: "Humid Subtropical", description: "Affordable Texas construction with no state income tax advantage", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80" },
  { name: "Dallas", countryCode: "US", slug: "dallas", costMultiplier: 1.15, population: "1.3M", climate: "Humid Subtropical", description: "Booming tech hub with competitive construction costs", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80" },
  { name: "Miami", countryCode: "US", slug: "miami", costMultiplier: 1.5, population: "442K", climate: "Tropical", description: "Luxury coastal properties with hurricane-resistant building codes", image: "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80" },
  { name: "Chicago", countryCode: "US", slug: "chicago", costMultiplier: 1.3, population: "2.7M", climate: "Humid Continental", description: "Midwestern hub with cold-weather construction requirements", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80" },
  { name: "Phoenix", countryCode: "US", slug: "phoenix", costMultiplier: 1.05, population: "1.6M", climate: "Desert", description: "Sun Belt boom city with desert construction adaptations", image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80" },
  { name: "Seattle", countryCode: "US", slug: "seattle", costMultiplier: 1.55, population: "737K", climate: "Oceanic", description: "Tech-rich Pacific Northwest with premium lumber construction", image: "https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=800&q=80" },
  // UK
  { name: "London", countryCode: "GB", slug: "london", costMultiplier: 2.0, population: "9M", climate: "Oceanic", description: "World's most competitive prime residential market", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80" },
  { name: "Manchester", countryCode: "GB", slug: "manchester", costMultiplier: 1.2, population: "553K", climate: "Oceanic", description: "Northern England's fastest growing construction market", image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80" },
  { name: "Edinburgh", countryCode: "GB", slug: "edinburgh", costMultiplier: 1.35, population: "524K", climate: "Oceanic", description: "Scotland's capital with a booming new-build market", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80" },
  { name: "Bristol", countryCode: "GB", slug: "bristol", costMultiplier: 1.3, population: "467K", climate: "Oceanic", description: "South West England hub with high demand for new homes", image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80" },
  // Australia
  { name: "Sydney", countryCode: "AU", slug: "sydney", costMultiplier: 1.7, population: "5.3M", climate: "Humid Subtropical", description: "Australia's most expensive construction market with iconic harbour views", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" },
  { name: "Melbourne", countryCode: "AU", slug: "melbourne", costMultiplier: 1.5, population: "5.1M", climate: "Oceanic", description: "Cultural capital with strong residential construction demand", image: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80" },
  { name: "Brisbane", countryCode: "AU", slug: "brisbane", costMultiplier: 1.3, population: "2.5M", climate: "Subtropical", description: "Queensland boom driven by 2032 Olympics infrastructure", image: "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&q=80" },
  { name: "Perth", countryCode: "AU", slug: "perth", costMultiplier: 1.2, population: "2.1M", climate: "Mediterranean", description: "Western Australia gateway with mining industry-driven growth", image: "https://images.unsplash.com/photo-1474524955719-b9f87c50ce47?w=800&q=80" },
  // India
  { name: "Bangalore", countryCode: "IN", slug: "bangalore", costMultiplier: 1.4, population: "12M", climate: "Tropical Savanna", description: "India's Silicon Valley with premium tech worker housing demand", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80" },
  { name: "Mumbai", countryCode: "IN", slug: "mumbai", costMultiplier: 1.8, population: "20M", climate: "Tropical", description: "India's most expensive construction market with extreme land scarcity", image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=800&q=80" },
  { name: "Delhi", countryCode: "IN", slug: "delhi", costMultiplier: 1.3, population: "32M", climate: "Semi-Arid", description: "India's capital region with massive infrastructure development", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80" },
  { name: "Chennai", countryCode: "IN", slug: "chennai", costMultiplier: 1.2, population: "7.1M", climate: "Tropical", description: "South India's auto and tech hub with strong residential demand", image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80" },
  { name: "Hyderabad", countryCode: "IN", slug: "hyderabad", costMultiplier: 1.25, population: "9.7M", climate: "Tropical Savanna", description: "Pharma and IT hub with growing luxury housing market", image: "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800&q=80" },
  { name: "Pune", countryCode: "IN", slug: "pune", costMultiplier: 1.15, population: "6.6M", climate: "Tropical Savanna", description: "Oxford of the East with quality residential developments", image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80" },
  // Malaysia
  { name: "Kuala Lumpur", countryCode: "MY", slug: "kuala-lumpur", costMultiplier: 1.5, population: "1.8M", climate: "Tropical", description: "Malaysia's capital with iconic skyline and luxury high-rise living", image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80" },
  { name: "Penang", countryCode: "MY", slug: "penang", costMultiplier: 1.2, population: "732K", climate: "Tropical", description: "Pearl of the Orient with heritage conservation and modern developments", image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80" },
  { name: "Johor Bahru", countryCode: "MY", slug: "johor-bahru", costMultiplier: 1.1, population: "800K", climate: "Tropical", description: "Singapore's neighbour with strong cross-border investment appeal", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80" },
  // UAE
  { name: "Dubai", countryCode: "AE", slug: "dubai", costMultiplier: 1.5, population: "3.3M", climate: "Desert", description: "Global luxury real estate hub with world-record breaking developments", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80" },
  { name: "Abu Dhabi", countryCode: "AE", slug: "abu-dhabi", costMultiplier: 1.2, population: "1.5M", climate: "Desert", description: "UAE capital with major government-backed residential programmes", image: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80" },
  { name: "Sharjah", countryCode: "AE", slug: "sharjah", costMultiplier: 0.9, population: "1.4M", climate: "Desert", description: "Affordable alternative to Dubai with family-friendly communities", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80" },
  // Singapore
  { name: "Singapore City", countryCode: "SG", slug: "singapore", costMultiplier: 1.0, population: "5.9M", climate: "Tropical Rainforest", description: "City-state with world's most efficient construction standards", image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80" },
  // Saudi Arabia
  { name: "Riyadh", countryCode: "SA", slug: "riyadh", costMultiplier: 1.2, population: "7.7M", climate: "Desert", description: "Saudi capital transforming under Vision 2030 with mega-projects", image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80" },
  { name: "Jeddah", countryCode: "SA", slug: "jeddah", costMultiplier: 1.1, population: "4.7M", climate: "Desert", description: "Red Sea gateway with historic old town and new luxury developments", image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80" },
  // Japan
  { name: "Tokyo", countryCode: "JP", slug: "tokyo", costMultiplier: 2.0, population: "13.9M", climate: "Humid Subtropical", description: "World's most populous metro with premium construction standards", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80" },
  { name: "Osaka", countryCode: "JP", slug: "osaka", costMultiplier: 1.4, population: "2.7M", climate: "Humid Subtropical", description: "Japan's second city with major urban regeneration underway", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
  { name: "Kyoto", countryCode: "JP", slug: "kyoto", costMultiplier: 1.3, population: "1.5M", climate: "Humid Subtropical", description: "Ancient capital with strict heritage preservation building codes", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80" },
  // Germany
  { name: "Munich", countryCode: "DE", slug: "munich", costMultiplier: 1.8, population: "1.5M", climate: "Oceanic/Continental", description: "Germany's most expensive construction market with Bavarian quality", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80" },
  { name: "Berlin", countryCode: "DE", slug: "berlin", costMultiplier: 1.3, population: "3.7M", climate: "Oceanic", description: "Creative capital with massive housing construction programme", image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80" },
  { name: "Frankfurt", countryCode: "DE", slug: "frankfurt", costMultiplier: 1.5, population: "773K", climate: "Oceanic", description: "European finance hub with premium residential construction demand", image: "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80" },
  // France
  { name: "Paris", countryCode: "FR", slug: "paris", costMultiplier: 2.0, population: "2.2M", climate: "Oceanic", description: "Europe's most prestigious address with strict Haussmann-era codes", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80" },
  { name: "Nice", countryCode: "FR", slug: "nice", costMultiplier: 1.4, population: "340K", climate: "Mediterranean", description: "French Riviera luxury with Mediterranean construction requirements", image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80" },
  // South Africa
  { name: "Cape Town", countryCode: "ZA", slug: "cape-town", costMultiplier: 1.5, population: "4.6M", climate: "Mediterranean", description: "Africa's most desirable construction location on the Atlantic seaboard", image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80" },
  { name: "Johannesburg", countryCode: "ZA", slug: "johannesburg", costMultiplier: 1.2, population: "5.6M", climate: "Subtropical Highland", description: "Africa's economic capital with dynamic residential market", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80" },
  // Brazil
  { name: "São Paulo", countryCode: "BR", slug: "sao-paulo", costMultiplier: 1.5, population: "12M", climate: "Subtropical", description: "Latin America's largest city with premium vertical housing market", image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80" },
  { name: "Rio de Janeiro", countryCode: "BR", slug: "rio-de-janeiro", costMultiplier: 1.4, population: "6.7M", climate: "Tropical", description: "Marvelous City with oceanfront luxury and hillside communities", image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80" },
  // Thailand
  { name: "Bangkok", countryCode: "TH", slug: "bangkok", costMultiplier: 1.4, population: "10.5M", climate: "Tropical Savanna", description: "Southeast Asia's premier expat destination with luxury condo market", image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80" },
  { name: "Phuket", countryCode: "TH", slug: "phuket", costMultiplier: 1.3, population: "420K", climate: "Tropical Monsoon", description: "Paradise island with premium villa market for international buyers", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80" },
  { name: "Chiang Mai", countryCode: "TH", slug: "chiang-mai", costMultiplier: 0.9, population: "130K", climate: "Tropical Savanna", description: "Northern Thailand's cultural capital with affordable property", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80" },
];

export function getCitiesByCountry(countryCode: string): City[] {
  return CITIES.filter(c => c.countryCode === countryCode);
}

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find(c => c.slug === slug);
}
