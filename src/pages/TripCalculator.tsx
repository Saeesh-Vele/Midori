import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { useToast } from "@/hooks/use-toast";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    increment,
    serverTimestamp
} from "firebase/firestore";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    Car,
    Bus,
    Train,
    Bike,
    Footprints,
    ArrowLeft,
    MapPin,
    Navigation,
    Leaf,
    TrendingDown,
    Loader2,
    Save,
    RotateCcw,
    Zap,
    Award,
    Calculator
} from "lucide-react";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const startIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background: #22c55e; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">A</div>`,
    className: "custom-start-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

const endIcon = L.divIcon({
    html: `<div style="width: 24px; height: 24px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">B</div>`,
    className: "custom-end-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Default center (Pune, India)
const defaultCenter: [number, number] = [18.5204, 73.8567];

// Carbon emission factors (kg CO2 per km)
const transportModes = [
    { id: "car", name: "Car", icon: Car, factor: 0.21, color: "#ef4444", emoji: "🚗" },
    { id: "bus", name: "Bus", icon: Bus, factor: 0.089, color: "#f59e0b", emoji: "🚌" },
    { id: "train", name: "Train", icon: Train, factor: 0.041, color: "#22c55e", emoji: "🚆" },
    { id: "bike", name: "Bike", icon: Bike, factor: 0, color: "#10b981", emoji: "🚴" },
    { id: "walk", name: "Walk", icon: Footprints, factor: 0, color: "#06b6d4", emoji: "🚶" }
];

interface RouteResult {
    distance: number;
    duration: number;
    carbonEmissions: { [key: string]: number };
    savings: { [key: string]: number };
}

// Map controller component
const MapController = ({ bounds, route }: { bounds: L.LatLngBounds | null; route: [number, number][] }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

const TripCalculator = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    const [startAddress, setStartAddress] = useState("");
    const [endAddress, setEndAddress] = useState("");
    const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
    const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [selectedMode, setSelectedMode] = useState<string>("car");
    const [isSaving, setIsSaving] = useState(false);

    // Geocode address using Nominatim (free)
    const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                { headers: { "User-Agent": "EcoFy App" } }
            );
            const data = await response.json();
            if (data && data.length > 0) {
                return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            }
            return null;
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    };

    // Get route using OSRM (free routing service)
    const getRoute = async (start: [number, number], end: [number, number]) => {
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
            );
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords: [number, number][] = route.geometry.coordinates.map(
                    (c: [number, number]) => [c[1], c[0]]
                );
                return {
                    distance: route.distance / 1000, // km
                    duration: Math.round(route.duration / 60), // minutes
                    coords
                };
            }
            return null;
        } catch (error) {
            console.error("Routing error:", error);
            return null;
        }
    };

    // Calculate route
    const calculateRoute = async () => {
        if (!startAddress || !endAddress) {
            toast({
                title: "Missing addresses",
                description: "Please enter both start and end addresses",
                variant: "destructive"
            });
            return;
        }

        setIsCalculating(true);

        try {
            // Geocode both addresses
            const start = await geocodeAddress(startAddress);
            const end = await geocodeAddress(endAddress);

            if (!start) {
                toast({
                    title: "Address not found",
                    description: "Could not find the start location. Try a more specific address.",
                    variant: "destructive"
                });
                setIsCalculating(false);
                return;
            }

            if (!end) {
                toast({
                    title: "Address not found",
                    description: "Could not find the destination. Try a more specific address.",
                    variant: "destructive"
                });
                setIsCalculating(false);
                return;
            }

            setStartCoords(start);
            setEndCoords(end);

            // Get route
            const routeData = await getRoute(start, end);

            if (!routeData) {
                toast({
                    title: "Route not found",
                    description: "Could not calculate a route between these locations.",
                    variant: "destructive"
                });
                setIsCalculating(false);
                return;
            }

            setRouteCoords(routeData.coords);

            // Set map bounds
            const bounds = L.latLngBounds([start, end]);
            routeData.coords.forEach(coord => bounds.extend(coord));
            setMapBounds(bounds);

            // Calculate emissions
            const carbonEmissions: { [key: string]: number } = {};
            const savings: { [key: string]: number } = {};

            transportModes.forEach(mode => {
                carbonEmissions[mode.id] = parseFloat((routeData.distance * mode.factor).toFixed(2));
                savings[mode.id] = parseFloat((carbonEmissions.car - carbonEmissions[mode.id]).toFixed(2));
            });

            setRouteResult({
                distance: parseFloat(routeData.distance.toFixed(1)),
                duration: routeData.duration,
                carbonEmissions,
                savings
            });

            toast({
                title: "Route calculated! 🗺️",
                description: `Distance: ${routeData.distance.toFixed(1)} km • Duration: ${routeData.duration} min`,
            });

        } catch (error) {
            console.error("Route calculation error:", error);
            toast({
                title: "Error",
                description: "Failed to calculate route. Please try again.",
                variant: "destructive"
            });
        }

        setIsCalculating(false);
    };

    // Save trip and award points
    const saveTrip = async () => {
        if (!user || !routeResult) return;

        const savings = routeResult.savings[selectedMode];
        if (selectedMode === "car" || savings <= 0) {
            toast({
                title: "No savings",
                description: "Choose a greener transport mode to earn points!",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, "savedTrips"), {
                userId: user.uid,
                userName: userProfile?.name || "Anonymous",
                startAddress,
                endAddress,
                distance: routeResult.distance,
                transportMode: selectedMode,
                carbonSaved: savings,
                createdAt: serverTimestamp()
            });

            const bonusPoints = Math.floor(savings * 10);
            const totalPoints = 5 + bonusPoints;

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                totalPoints: increment(totalPoints),
                totalCarbonSaved: increment(savings)
            });

            toast({
                title: "Trip Saved! 🌱",
                description: `You saved ${savings.toFixed(2)} kg CO₂! +${totalPoints} points!`,
            });

            resetCalculator();

        } catch (error) {
            console.error("Error saving trip:", error);
            toast({
                title: "Error",
                description: "Failed to save trip. Please try again.",
                variant: "destructive"
            });
        }
        setIsSaving(false);
    };

    const resetCalculator = () => {
        setStartAddress("");
        setEndAddress("");
        setStartCoords(null);
        setEndCoords(null);
        setRouteCoords([]);
        setMapBounds(null);
        setRouteResult(null);
        setSelectedMode("car");
    };

    const getRecommendation = () => {
        if (!routeResult) return null;

        if (routeResult.distance < 3) {
            return { mode: "walk", message: "This is a short trip - walking is perfect! 🚶" };
        } else if (routeResult.distance < 10) {
            return { mode: "bike", message: "Great distance for cycling! Stay fit and eco-friendly! 🚴" };
        } else if (routeResult.distance < 50) {
            return { mode: "bus", message: "Public transit is ideal for this distance! 🚌" };
        } else {
            return { mode: "train", message: "Consider taking the train for this journey! 🚆" };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 relative overflow-hidden">

            {/* ── Decorative eco background elements ── */}
            {/* Corner clusters */}
            <div className="absolute top-0 left-0 text-5xl opacity-20 -rotate-12 select-none pointer-events-none">🌿🍃🌱</div>
            <div className="absolute top-8 right-16 text-4xl opacity-15 rotate-45 select-none pointer-events-none">🌿</div>
            <div className="absolute bottom-10 left-8 text-5xl opacity-20 select-none pointer-events-none">🌱🌿</div>
            <div className="absolute bottom-8 right-10 text-3xl opacity-15 -rotate-12 select-none pointer-events-none">♻️</div>

            {/* Floating animated leaves */}
            <div className="absolute top-1/4 left-6 text-3xl opacity-30 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0s', animationDuration: '3s' }}>🍃</div>
            <div className="absolute top-1/3 right-8 text-2xl opacity-20 animate-bounce select-none pointer-events-none" style={{ animationDelay: '1s', animationDuration: '4s' }}>🌿</div>
            <div className="absolute bottom-1/3 left-14 text-2xl opacity-25 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>🌱</div>
            <div className="absolute top-2/3 right-12 text-2xl opacity-20 animate-bounce select-none pointer-events-none" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}>🍃</div>

            {/* Soft green blur blobs */}
            <div className="absolute top-16 left-1/3 w-56 h-56 bg-green-200 rounded-full blur-3xl opacity-25 pointer-events-none" />
            <div className="absolute bottom-24 right-1/4 w-64 h-64 bg-emerald-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-4 w-32 h-32 bg-green-300 rounded-full blur-2xl opacity-20 pointer-events-none" />
            <div className="absolute top-1/4 right-1/3 w-40 h-40 bg-teal-200 rounded-full blur-3xl opacity-15 pointer-events-none" />

            {/* Bottom accent strip */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-50 pointer-events-none" />

            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/")}
                    >
                        <img src="/ecofy-logo.png" alt="EcoFy" className="w-10 h-10" />
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            Midori
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/carbon")}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                        >
                            <Calculator className="w-4 h-4 mr-1" />
                            Lifestyle Calculator
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

            <div className="max-w-6xl mx-auto px-4 py-10 relative z-10">
                {/* ── Hero Section ── */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-green-100/80 text-green-700 px-4 py-2 rounded-full mb-5 border border-green-200/60 shadow-sm backdrop-blur-sm">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-semibold">Compare Carbon Emissions</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
                        Trip Carbon{" "}
                        <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                            Calculator
                        </span>{" "}
                        🚗➡️🌱
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        Enter your journey and see how different transport modes compare. Choose greener options to earn points!
                    </p>

                    {/* Decorative divider */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-green-300" />
                        <span className="text-green-400 text-lg">🌿</span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-green-300" />
                    </div>

                    {/* Quick-stat pills */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full">
                            🚗 Car — 0.21 kg CO₂/km
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
                            🚌 Bus — 0.09 kg CO₂/km
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
                            🚆 Train — 0.04 kg CO₂/km
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                            🚴 Bike / 🚶 Walk — Zero emissions!
                        </span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* ── Input Section ── */}
                    <div className="space-y-6">
                        {/* Address Inputs Card */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-green-100/80 hover:shadow-lg transition-shadow duration-300">
                            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                                    <MapPin className="w-4 h-4 text-white" />
                                </div>
                                Enter Your Route
                            </h2>

                            <div className="space-y-4">
                                {/* Start Location */}
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 flex items-center gap-2 mb-1.5">
                                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">A</span>
                                        Start Location
                                    </label>
                                    <Input
                                        placeholder="e.g., Pune Railway Station, Pune"
                                        value={startAddress}
                                        onChange={(e) => setStartAddress(e.target.value)}
                                        className="border-green-200 focus:border-green-400 focus:ring-green-300 bg-green-50/50 placeholder:text-gray-400 transition-all duration-200"
                                    />
                                </div>

                                {/* Connector */}
                                <div className="flex justify-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-0.5 h-3 bg-gradient-to-b from-green-300 to-red-300 rounded-full" />
                                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                                        <div className="w-0.5 h-3 bg-gradient-to-b from-red-300 to-red-400 rounded-full" />
                                    </div>
                                </div>

                                {/* Destination */}
                                <div>
                                    <label className="text-sm font-semibold text-gray-600 flex items-center gap-2 mb-1.5">
                                        <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">B</span>
                                        Destination
                                    </label>
                                    <Input
                                        placeholder="e.g., Mumbai Central, Mumbai"
                                        value={endAddress}
                                        onChange={(e) => setEndAddress(e.target.value)}
                                        className="border-red-200 focus:border-red-400 focus:ring-red-300 bg-red-50/50 placeholder:text-gray-400 transition-all duration-200"
                                    />
                                </div>

                                {/* Tip */}
                                <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50/70 border border-amber-100 p-3 rounded-xl">
                                    <span className="text-base mt-0.5">💡</span>
                                    <p>Include city name for better accuracy <span className="font-medium text-gray-600">(e.g., "Phoenix Mall, Viman Nagar, Pune")</span></p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <Button
                                        onClick={calculateRoute}
                                        disabled={isCalculating || !startAddress || !endAddress}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 font-semibold"
                                    >
                                        {isCalculating ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Navigation className="w-4 h-4 mr-2" />
                                        )}
                                        {isCalculating ? "Calculating…" : "Calculate Route"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={resetCalculator}
                                        className="px-4 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                                        title="Reset"
                                    >
                                        <RotateCcw className="w-4 h-4 text-gray-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* ── Results Card ── */}
                        {routeResult && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-green-100/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Results Header */}
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center shadow-sm">
                                            <Zap className="w-4 h-4 text-white" />
                                        </div>
                                        Carbon Comparison
                                    </h2>
                                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                                        <span className="text-sm font-semibold text-gray-700">{routeResult.distance} km</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-sm text-gray-500">{routeResult.duration} min</span>
                                    </div>
                                </div>

                                {/* Recommendation Banner */}
                                {getRecommendation() && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-5 border border-green-200/60 flex items-start gap-2">
                                        <span className="text-lg mt-0.5">💡</span>
                                        <p className="text-green-700 font-medium text-sm leading-relaxed">
                                            {getRecommendation()?.message}
                                        </p>
                                    </div>
                                )}

                                {/* Transport Mode Comparison */}
                                <div className="space-y-3">
                                    {transportModes.map((mode) => {
                                        const emissions = routeResult.carbonEmissions[mode.id];
                                        const savings = routeResult.savings[mode.id];
                                        const isSelected = selectedMode === mode.id;
                                        const maxEmission = routeResult.carbonEmissions.car;
                                        const percentage = maxEmission > 0 ? (emissions / maxEmission) * 100 : 0;

                                        return (
                                            <button
                                                key={mode.id}
                                                onClick={() => setSelectedMode(mode.id)}
                                                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left hover:-translate-y-0.5 active:scale-[0.99] ${isSelected
                                                    ? "border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                                                    : "border-gray-200 hover:border-green-200 bg-white/60 hover:bg-white/90 hover:shadow-sm"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl leading-none">{mode.emoji}</span>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-800 text-sm">{mode.name}</span>
                                                                {isSelected && (
                                                                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-medium">✓ Selected</span>
                                                                )}
                                                                {(mode.id === "bike" || mode.id === "walk") && (
                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">Zero CO₂</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-gray-800 text-sm">{emissions.toFixed(2)} kg CO₂</p>
                                                        {savings > 0 && (
                                                            <p className="text-xs text-green-600 font-semibold">
                                                                −{savings.toFixed(2)} kg vs car
                                                            </p>
                                                        )}
                                                        {savings === 0 && mode.id === "car" && (
                                                            <p className="text-xs text-red-400 font-medium">baseline</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-700 ease-out"
                                                        style={{
                                                            width: `${Math.max(percentage, 5)}%`,
                                                            backgroundColor: mode.color
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Save Trip Button */}
                                {selectedMode !== "car" && routeResult.savings[selectedMode] > 0 && (
                                    <Button
                                        onClick={saveTrip}
                                        disabled={isSaving || !user}
                                        className="w-full mt-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 py-6 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 font-semibold text-base"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Trip & Earn Points (+{5 + Math.floor(routeResult.savings[selectedMode] * 10)} pts)
                                    </Button>
                                )}

                                {!user && (
                                    <p className="text-center text-sm text-gray-400 mt-4">
                                        <button
                                            onClick={() => navigate("/auth")}
                                            className="text-green-600 hover:text-green-700 hover:underline font-medium transition-colors"
                                        >
                                            Sign in
                                        </button>{" "}
                                        to save trips and earn points!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Map Section ── */}
                    <div className="lg:sticky lg:top-[73px] lg:self-start bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-green-100/80 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        {/* Map chrome header */}
                        <div className="px-5 py-3 border-b border-green-100/60 flex items-center justify-between bg-gradient-to-r from-green-50/80 to-emerald-50/80">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                <div className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="ml-2 text-xs text-gray-400 font-medium">Live Route Map</span>
                            </div>
                            {/* Map legend */}
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block border-2 border-white shadow-sm" />
                                    Start
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block border-2 border-white shadow-sm" />
                                    End
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-5 h-1 rounded-full bg-green-400 inline-block" />
                                    Route
                                </span>
                            </div>
                        </div>
                        <div className="h-[560px]">
                            <MapContainer
                                center={defaultCenter}
                                zoom={10}
                                style={{ height: "100%", width: "100%" }}
                                className="z-0"
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapController bounds={mapBounds} route={routeCoords} />

                                {/* Start marker */}
                                {startCoords && (
                                    <Marker position={startCoords} icon={startIcon} />
                                )}

                                {/* End marker */}
                                {endCoords && (
                                    <Marker position={endCoords} icon={endIcon} />
                                )}

                                {/* Route line */}
                                {routeCoords.length > 0 && (
                                    <Polyline
                                        positions={routeCoords}
                                        pathOptions={{
                                            color: "#22c55e",
                                            weight: 5,
                                            opacity: 0.8
                                        }}
                                    />
                                )}
                            </MapContainer>
                        </div>
                    </div>
                </div>

                {/* ── Info Cards ── */}
                <div className="grid md:grid-cols-3 gap-5 mt-10">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-green-100/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <Leaf className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Eco Impact</h3>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            The average car emits 0.21 kg CO₂ per km. Choosing public transit can reduce emissions by up to 80%!
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-blue-100/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-sky-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <TrendingDown className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Save More</h3>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Short trips under 5 km contribute most to urban pollution. Walking or cycling these trips makes a big difference!
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-purple-100/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Earn Points</h3>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Save trips with eco-friendly transport to earn points. The more carbon you save, the more points you get!
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 mt-8 mb-2">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-green-200" />
                    <p className="text-center text-xs text-gray-400">
                        Powered by OpenStreetMap & OSRM · Midori Trip Calculator
                    </p>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-green-200" />
                </div>
            </div>

            {/* Custom styles */}
            <style>{`
                .custom-start-marker, .custom-end-marker {
                    background: none !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
};

export default TripCalculator;
