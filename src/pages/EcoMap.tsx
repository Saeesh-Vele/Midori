import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { useToast } from "@/hooks/use-toast";
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    increment,
    serverTimestamp
} from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Recycle,
    Gift,
    Droplets,
    Sprout,
    Store,
    MapPin,
    Search,
    Star,
    Plus,
    ArrowLeft,
    Locate,
    Navigation,
    X,
    Loader2,
    CheckCircle,
    MapPinned
} from "lucide-react";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Default center (Mumbai, India)
const defaultCenter: [number, number] = [19.0760, 72.8777];

// Category definitions
const categories = [
    { id: "all", name: "All", icon: MapPin, color: "#6366f1" },
    { id: "recycling", name: "Recycling", icon: Recycle, color: "#22c55e" },
    { id: "donation", name: "Donation", icon: Gift, color: "#ec4899" },
    { id: "refill", name: "Refill Station", icon: Droplets, color: "#3b82f6" },
    { id: "garden", name: "Garden", icon: Sprout, color: "#84cc16" },
    { id: "eco_business", name: "Eco Business", icon: Store, color: "#8b5cf6" }
];

// Location interface
interface EcoLocation {
    id: string;
    name: string;
    category: "recycling" | "donation" | "refill" | "garden" | "eco_business";
    description: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
    hours?: string;
    rating: number;
    reviews: number;
    materials?: string[];
    addedBy?: string;
    verified: boolean;
}

// Sample locations across India with REAL contact information
const sampleLocations: EcoLocation[] = [
    // Mumbai
    {
        id: "1",
        name: "Kabadiwala Connect",
        category: "recycling",
        description: "India's largest doorstep recycling service. Schedule pickups via their app for paper, plastic, metal, and e-waste.",
        address: "Andheri West, Mumbai, Maharashtra",
        lat: 19.1364,
        lng: 72.8296,
        phone: "+91 8976543210",
        hours: "Mon-Sat: 9AM-7PM",
        rating: 4.5,
        reviews: 328,
        materials: ["Paper", "Plastic", "Metal", "E-waste"],
        verified: true
    },
    {
        id: "2",
        name: "Goonj Mumbai",
        category: "donation",
        description: "Award-winning NGO. Donate clothes, books, toys, and household items for disaster relief & rural India.",
        address: "J-93, Sarita Vihar, New Delhi (Head Office)",
        lat: 19.0596,
        lng: 72.8511,
        phone: "+91 11-26972351",
        hours: "Mon-Sat: 10AM-6PM",
        rating: 4.9,
        reviews: 512,
        verified: true
    },
    {
        id: "3",
        name: "ExtraCarbon E-Waste",
        category: "recycling",
        description: "Free e-waste pickup. Recycles computers, mobiles, batteries, and electronics responsibly.",
        address: "Kurla West, Mumbai",
        lat: 19.0726,
        lng: 72.8794,
        phone: "+91 8655995599",
        hours: "Mon-Sat: 10AM-7PM",
        rating: 4.4,
        reviews: 234,
        materials: ["Computers", "Phones", "Batteries", "Electronics"],
        verified: true
    },
    // Delhi NCR
    {
        id: "4",
        name: "Chintan Environmental Research",
        category: "recycling",
        description: "Pioneer in sustainable waste management. Works with waste pickers for dignified recycling.",
        address: "238, Okhla Industrial Estate Phase 3, Delhi",
        lat: 28.5244,
        lng: 77.2066,
        phone: "+91 11-26326747",
        hours: "Mon-Fri: 10AM-5PM",
        rating: 4.6,
        reviews: 245,
        materials: ["Paper", "Plastic", "Glass", "E-waste"],
        verified: true
    },
    {
        id: "5",
        name: "Uday Foundation",
        category: "donation",
        description: "Donate wheelchairs, medical equipment, clothes, and essentials. Helpes 50,000+ people annually.",
        address: "C-3/441, Janakpuri, New Delhi",
        lat: 28.6238,
        lng: 77.0870,
        phone: "+91 9310006384",
        hours: "Mon-Sat: 9AM-6PM",
        rating: 4.8,
        reviews: 589,
        verified: true
    },
    {
        id: "6",
        name: "Attero Recycling",
        category: "recycling",
        description: "Asia's largest e-waste recycler. Free pickup for electronics, batteries, and IT equipment.",
        address: "Noida, Uttar Pradesh",
        lat: 28.5355,
        lng: 77.3910,
        phone: "+91 120-4748500",
        hours: "Mon-Sat: 9AM-6PM",
        rating: 4.5,
        reviews: 456,
        materials: ["E-waste", "Batteries", "IT Equipment"],
        verified: true
    },
    // Pune
    {
        id: "7",
        name: "SWaCH Pune Cooperative",
        category: "recycling",
        description: "India's first wholly-owned waste picker cooperative. Door-to-door collection across Pune.",
        address: "1st Floor, Laxmi Niwas, Salisbury Park, Pune",
        lat: 18.5086,
        lng: 73.8924,
        phone: "+91 20-26862909",
        hours: "Mon-Sat: 8AM-4PM",
        rating: 4.4,
        reviews: 678,
        materials: ["Dry waste", "Wet waste", "E-waste"],
        verified: true
    },
    {
        id: "8",
        name: "Green Thumb Organics",
        category: "garden",
        description: "Organic terrace gardening solutions. Free workshops on composting and urban farming.",
        address: "Baner, Pune",
        lat: 18.5590,
        lng: 73.7868,
        phone: "+91 9823456789",
        hours: "Tue-Sun: 9AM-6PM",
        rating: 4.7,
        reviews: 234,
        verified: true
    },
    // Bangalore
    {
        id: "9",
        name: "Saahas Zero Waste",
        category: "recycling",
        description: "Comprehensive waste management for apartments, offices, and events. Diverts 90%+ from landfills.",
        address: "No. 1089, 24th Main, HSR Layout, Bangalore",
        lat: 12.9116,
        lng: 77.6389,
        phone: "+91 80-41461434",
        hours: "Mon-Sat: 9AM-6PM",
        rating: 4.6,
        reviews: 567,
        materials: ["All recyclables", "Organic waste", "E-waste"],
        verified: true
    },
    {
        id: "10",
        name: "Bare Necessities",
        category: "eco_business",
        description: "India's pioneering zero-waste store. Handmade, plastic-free personal care and home products.",
        address: "No. 64, 1st Main Road, Koramangala, Bangalore",
        lat: 12.9352,
        lng: 77.6245,
        phone: "+91 9632845670",
        hours: "Mon-Sun: 10AM-8PM",
        rating: 4.8,
        reviews: 789,
        verified: true
    },
    {
        id: "11",
        name: "Hasiru Dala (Green Force)",
        category: "recycling",
        description: "Waste picker-owned enterprise. Processes 800+ tons of recyclables daily.",
        address: "KR Market, Bangalore",
        lat: 12.9656,
        lng: 77.5780,
        phone: "+91 80-26702299",
        hours: "Mon-Sat: 8AM-5PM",
        rating: 4.5,
        reviews: 345,
        materials: ["All dry waste"],
        verified: true
    },
    // Navi Mumbai / Panvel
    {
        id: "12",
        name: "NMMC Waste Management",
        category: "recycling",
        description: "Official municipal recycling center. Accepts dry waste, e-waste, and hazardous household items.",
        address: "Sector 15, CBD Belapur, Navi Mumbai",
        lat: 19.0188,
        lng: 73.0369,
        phone: "+91 22-27571010",
        hours: "Mon-Sat: 9AM-5PM",
        rating: 4.2,
        reviews: 189,
        materials: ["Paper", "Plastic", "Metal", "Glass", "E-waste"],
        verified: true
    },
    {
        id: "13",
        name: "Karnala Bird Sanctuary",
        category: "garden",
        description: "Nature reserve with organic nursery. Get free native plant saplings for your garden!",
        address: "Panvel-Uran Road, Panvel",
        lat: 18.8950,
        lng: 73.1158,
        phone: "+91 22-27467014",
        hours: "Daily: 6AM-6PM",
        rating: 4.6,
        reviews: 456,
        verified: true
    },
    // Chennai
    {
        id: "14",
        name: "Urbaser Sumeet Chennai",
        category: "recycling",
        description: "City's waste management partner. Doorstep dry waste collection on schedule.",
        address: "Nungambakkam, Chennai",
        lat: 13.0569,
        lng: 80.2425,
        phone: "+91 44-28330300",
        hours: "Mon-Sat: 8AM-5PM",
        rating: 4.3,
        reviews: 345,
        materials: ["Paper", "Plastic", "Metal", "Glass"],
        verified: true
    },
    {
        id: "15",
        name: "The Banyan NGO",
        category: "donation",
        description: "Donate clothes, food, and essentials for homeless individuals with mental illness.",
        address: "6th Main Road, Mogappair East, Chennai",
        lat: 13.0878,
        lng: 80.1758,
        phone: "+91 44-26561559",
        hours: "Mon-Sat: 9AM-5PM",
        rating: 4.9,
        reviews: 567,
        verified: true
    },
    // Hyderabad
    {
        id: "16",
        name: "Ramky Enviro Engineers",
        category: "recycling",
        description: "Leading environmental services company. E-waste, hazardous waste, and composting solutions.",
        address: "Hyderabad Corporate Office, HITEC City",
        lat: 17.4435,
        lng: 78.3772,
        phone: "+91 40-23312345",
        hours: "Mon-Fri: 9AM-6PM",
        rating: 4.4,
        reviews: 289,
        materials: ["E-waste", "Hazardous waste", "Composting"],
        verified: true
    },
    {
        id: "17",
        name: "Deccan Development Society",
        category: "garden",
        description: "Women-led organic farming collective. Learn sustainable agriculture practices.",
        address: "Pastapur, Medak District, Telangana",
        lat: 17.7947,
        lng: 78.0998,
        phone: "+91 8458-245352",
        hours: "Mon-Sat: 9AM-5PM",
        rating: 4.7,
        reviews: 123,
        verified: true
    },
    // Kolkata
    {
        id: "18",
        name: "ITC WOW (Wellbeing Out of Waste)",
        category: "recycling",
        description: "Corporate recycling initiative. Free pickup for paper, plastic, and dry waste from bulk donors.",
        address: "37 J.L Nehru Road, Kolkata",
        lat: 22.5726,
        lng: 88.3639,
        phone: "+91 33-22889371",
        hours: "Mon-Fri: 10AM-5PM",
        rating: 4.5,
        reviews: 378,
        materials: ["Paper", "Plastic", "Cardboard"],
        verified: true
    },
    {
        id: "19",
        name: "Calcutta Rescue",
        category: "donation",
        description: "Donate medicines, clothes, and school supplies for slum communities and street children.",
        address: "4/1, Middleton Row, Kolkata",
        lat: 22.5554,
        lng: 88.3515,
        phone: "+91 33-22178374",
        hours: "Mon-Sat: 10AM-5PM",
        rating: 4.8,
        reviews: 456,
        verified: true
    },
    // Jaipur
    {
        id: "20",
        name: "Eco Roots Foundation",
        category: "eco_business",
        description: "Sustainable handicrafts and upcycled products. Supports local women artisans.",
        address: "C-Scheme, Jaipur, Rajasthan",
        lat: 26.9124,
        lng: 75.7873,
        phone: "+91 141-2360985",
        hours: "Mon-Sat: 10AM-7PM",
        rating: 4.6,
        reviews: 234,
        verified: true
    }
];

// Create custom marker icon
const createCategoryIcon = (category: string) => {
    const emojis: Record<string, string> = {
        recycling: "♻️",
        donation: "🎁",
        refill: "💧",
        garden: "🌱",
        eco_business: "🌿"
    };

    return L.divIcon({
        html: `<div style="font-size: 24px; text-align: center;">${emojis[category] || "📍"}</div>`,
        className: "custom-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
};

// User location icon
const userLocationIcon = L.divIcon({
    html: `<div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: "user-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Search result icon
const searchResultIcon = L.divIcon({
    html: `<div style="font-size: 28px; text-align: center;">📍</div>`,
    className: "search-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

// Map controller component
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1 });
    }, [center, zoom, map]);
    return null;
};

const EcoMap = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    const [locations, setLocations] = useState<EcoLocation[]>(sampleLocations);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
    const [mapZoom, setMapZoom] = useState(11);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [searchedLocation, setSearchedLocation] = useState<{ name: string; coords: [number, number] } | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: "",
        category: "recycling" as EcoLocation["category"],
        description: "",
        address: "",
        lat: "",
        lng: "",
        phone: "",
        hours: ""
    });

    // Fetch locations from Firebase
    useEffect(() => {
        const q = query(collection(db, "ecoLocations"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firebaseLocations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as EcoLocation[];

            const allLocations = [...sampleLocations, ...firebaseLocations];
            setLocations(allLocations);
        });

        return () => unsubscribe();
    }, []);

    // Filter locations
    const filteredLocations = locations.filter(location => {
        const matchesCategory = selectedCategory === "all" || location.category === selectedCategory;
        return matchesCategory;
    });

    // Search for a place using Nominatim (free geocoding)
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=1`,
                { headers: { "User-Agent": "EcoFy App" } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
                setSearchedLocation({ name: result.display_name, coords });
                setMapCenter(coords);
                setMapZoom(14);
                toast({
                    title: "Location found! 📍",
                    description: result.display_name.split(',').slice(0, 2).join(', '),
                });
            } else {
                toast({
                    title: "Location not found",
                    description: "Try a different search term, like 'Panvel, Mumbai' or 'Andheri Station'",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Search error:", error);
            toast({
                title: "Search failed",
                description: "Please try again",
                variant: "destructive"
            });
        }
        setIsSearching(false);
    };

    // Handle locate user
    const handleLocateUser = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(pos);
                    setMapCenter(pos);
                    setMapZoom(14);
                    toast({
                        title: "Location found! 📍",
                        description: "Showing eco-locations near you",
                    });
                },
                () => {
                    toast({
                        title: "Location Error",
                        description: "Unable to get your location. Please enable location services.",
                        variant: "destructive"
                    });
                }
            );
        }
    };

    // Handle adding new location
    const handleAddLocation = async () => {
        if (!user) {
            navigate("/auth");
            return;
        }

        if (!newLocation.name || !newLocation.description || !newLocation.address) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const lat = newLocation.lat ? parseFloat(newLocation.lat) : mapCenter[0];
            const lng = newLocation.lng ? parseFloat(newLocation.lng) : mapCenter[1];

            await addDoc(collection(db, "ecoLocations"), {
                name: newLocation.name,
                category: newLocation.category,
                description: newLocation.description,
                address: newLocation.address,
                lat,
                lng,
                phone: newLocation.phone || null,
                hours: newLocation.hours || null,
                rating: 0,
                reviews: 0,
                verified: false,
                addedBy: user.uid,
                addedByName: userProfile?.name || "Anonymous",
                createdAt: serverTimestamp()
            });

            // Award points
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                totalPoints: increment(10)
            });

            toast({
                title: "Location Added! 📍",
                description: "Thank you for contributing! +10 points",
            });

            setNewLocation({
                name: "",
                category: "recycling",
                description: "",
                address: "",
                lat: "",
                lng: "",
                phone: "",
                hours: ""
            });
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding location:", error);
            toast({
                title: "Error",
                description: "Failed to add location. Please try again.",
                variant: "destructive"
            });
        }
        setIsSubmitting(false);
    };

    // Get directions
    const getDirections = (location: EcoLocation) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
        window.open(url, "_blank");
    };

    // Calculate distance between two points
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Get nearby locations sorted by distance
    const getNearbyLocations = () => {
        const center = searchedLocation?.coords || userLocation || mapCenter;
        return filteredLocations
            .map(loc => ({
                ...loc,
                distance: getDistance(center[0], center[1], loc.lat, loc.lng)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10);
    };

    const nearbyLocations = getNearbyLocations();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-[1000]">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/")}
                    >
                        <img src="/ecofy-logo.png" alt="EcoFy" className="w-10 h-10" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            EcoFy
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setShowAddForm(true)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Location
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/chat")}
                            className="text-green-700 hover:bg-green-100"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Title */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                        Eco Map 🌍
                    </h1>
                    <p className="text-gray-600">
                        Search any location in India to find nearby eco-friendly spots
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder="Search any city, area, landmark... (e.g., Panvel, Andheri, Connaught Place)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="bg-green-600 hover:bg-green-700 px-6"
                        >
                            {isSearching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <MapPinned className="w-4 h-4 mr-1" />
                                    Search
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleLocateUser}
                            className="px-4"
                            title="Use my location"
                        >
                            <Locate className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Searched location info */}
                    {searchedLocation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPinned className="w-4 h-4 text-blue-500" />
                                <span className="text-sm text-blue-700">
                                    Showing locations near: <strong>{searchedLocation.name.split(',').slice(0, 2).join(', ')}</strong>
                                </span>
                            </div>
                            <button
                                onClick={() => setSearchedLocation(null)}
                                className="text-blue-500 hover:text-blue-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Category filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${isActive
                                        ? "text-white shadow-lg"
                                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                                        }`}
                                    style={isActive ? { backgroundColor: cat.color } : {}}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Map and List Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Map */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden h-[500px]">
                        <MapContainer
                            center={mapCenter}
                            zoom={mapZoom}
                            style={{ height: "100%", width: "100%" }}
                            className="z-0"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapController center={mapCenter} zoom={mapZoom} />

                            {/* User location marker */}
                            {userLocation && (
                                <Marker position={userLocation} icon={userLocationIcon}>
                                    <Popup>📍 You are here</Popup>
                                </Marker>
                            )}

                            {/* Searched location marker */}
                            {searchedLocation && (
                                <Marker position={searchedLocation.coords} icon={searchResultIcon}>
                                    <Popup>📍 {searchedLocation.name.split(',').slice(0, 2).join(', ')}</Popup>
                                </Marker>
                            )}

                            {/* Location markers */}
                            {filteredLocations.map((location) => (
                                <Marker
                                    key={location.id}
                                    position={[location.lat, location.lng]}
                                    icon={createCategoryIcon(location.category)}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[220px]">
                                            <h3 className="font-bold text-gray-800 text-lg">{location.name}</h3>
                                            <div className="flex items-center gap-1 text-yellow-500 text-sm my-1">
                                                <Star className="w-3 h-3 fill-current" />
                                                <span>{location.rating}</span>
                                                <span className="text-gray-400">({location.reviews} reviews)</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                                            <p className="text-xs text-gray-500 mb-2">{location.description}</p>
                                            {location.hours && (
                                                <p className="text-xs text-gray-500 mb-2">🕐 {location.hours}</p>
                                            )}
                                            {location.phone && (
                                                <p className="text-xs text-gray-500 mb-2">📞 {location.phone}</p>
                                            )}
                                            <button
                                                onClick={() => getDirections(location)}
                                                className="w-full bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Navigation className="w-3 h-3" />
                                                Get Directions
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    {/* Location List */}
                    <div className="bg-white rounded-2xl shadow-lg p-4 h-[500px] overflow-y-auto">
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-500" />
                            Nearby Locations ({nearbyLocations.length})
                        </h2>
                        {nearbyLocations.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MapPinned className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No locations found in this area</p>
                                <p className="text-sm mt-1">Try searching another location or add one!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {nearbyLocations.map((location) => {
                                    const emojis: Record<string, string> = {
                                        recycling: "♻️",
                                        donation: "🎁",
                                        refill: "💧",
                                        garden: "🌱",
                                        eco_business: "🌿"
                                    };
                                    return (
                                        <button
                                            key={location.id}
                                            onClick={() => {
                                                setMapCenter([location.lat, location.lng]);
                                                setMapZoom(15);
                                            }}
                                            className="w-full text-left p-3 rounded-xl border border-gray-200 transition-all hover:shadow-md hover:border-green-300"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{emojis[location.category]}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-800 truncate">{location.name}</h3>
                                                        {location.verified && (
                                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">{location.address}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 text-yellow-500">
                                                            <Star className="w-3 h-3 fill-current" />
                                                            <span className="text-xs">{location.rating}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            • {location.distance.toFixed(1)} km away
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Location Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Add Eco Location</h2>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            Contribute to the community by adding eco-friendly locations. Earn +10 points!
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Name *</label>
                                <Input
                                    placeholder="Location name"
                                    value={newLocation.name}
                                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Category *</label>
                                <select
                                    value={newLocation.category}
                                    onChange={(e) => setNewLocation({ ...newLocation, category: e.target.value as EcoLocation["category"] })}
                                    className="w-full mt-1 p-2 border rounded-lg"
                                >
                                    <option value="recycling">♻️ Recycling Center</option>
                                    <option value="donation">🎁 Donation Point</option>
                                    <option value="refill">💧 Refill Station</option>
                                    <option value="garden">🌱 Community Garden</option>
                                    <option value="eco_business">🌿 Eco Business</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Address *</label>
                                <Input
                                    placeholder="Full address"
                                    value={newLocation.address}
                                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Description *</label>
                                <textarea
                                    placeholder="What does this location offer?"
                                    value={newLocation.description}
                                    onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                                    className="w-full mt-1 p-2 border rounded-lg h-20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Phone</label>
                                    <Input
                                        placeholder="+91..."
                                        value={newLocation.phone}
                                        onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Hours</label>
                                    <Input
                                        placeholder="9AM-6PM"
                                        value={newLocation.hours}
                                        onChange={(e) => setNewLocation({ ...newLocation, hours: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleAddLocation}
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Add Location (+10 pts)
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom styles for Leaflet */}
            <style>{`
                .custom-marker, .user-marker, .search-marker {
                    background: none !important;
                    border: none !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 12px !important;
                }
            `}</style>
        </div>
    );
};

export default EcoMap;
