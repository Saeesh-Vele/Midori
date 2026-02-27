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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-[1000]">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
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
                            Back to Chat
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-medium">Compare Carbon Emissions</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                        Trip Carbon Calculator 🚗➡️🌱
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Enter your journey and see how different transport modes compare. Choose greener options to earn points!
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        {/* Address Inputs */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-green-500" />
                                Enter Your Route
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">A</span>
                                        Start Location
                                    </label>
                                    <Input
                                        placeholder="e.g., Pune Railway Station, Pune"
                                        value={startAddress}
                                        onChange={(e) => setStartAddress(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <div className="flex justify-center">
                                    <div className="w-0.5 h-8 bg-gray-200"></div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">B</span>
                                        Destination
                                    </label>
                                    <Input
                                        placeholder="e.g., Mumbai Central, Mumbai"
                                        value={endAddress}
                                        onChange={(e) => setEndAddress(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>

                                <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                    💡 Tip: Include city name for better accuracy (e.g., "Phoenix Mall, Viman Nagar, Pune")
                                </p>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={calculateRoute}
                                        disabled={isCalculating || !startAddress || !endAddress}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                    >
                                        {isCalculating ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Navigation className="w-4 h-4 mr-2" />
                                        )}
                                        Calculate Route
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={resetCalculator}
                                        className="px-4"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {routeResult && (
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-500" />
                                        Carbon Comparison
                                    </h2>
                                    <span className="text-sm text-gray-500">
                                        {routeResult.distance} km • {routeResult.duration} min
                                    </span>
                                </div>

                                {/* Recommendation */}
                                {getRecommendation() && (
                                    <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
                                        <p className="text-green-700 font-medium">
                                            💡 {getRecommendation()?.message}
                                        </p>
                                    </div>
                                )}

                                {/* Transport mode comparison */}
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
                                                className={`w-full p-4 rounded-xl border-2 transition-all ${isSelected
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{mode.emoji}</span>
                                                        <span className="font-semibold text-gray-800">{mode.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-gray-800">{emissions.toFixed(2)} kg CO₂</p>
                                                        {savings > 0 && (
                                                            <p className="text-xs text-green-600 font-medium">
                                                                Save {savings.toFixed(2)} kg vs car
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full transition-all"
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
                                        className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 py-6"
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
                                    <p className="text-center text-sm text-gray-500 mt-3">
                                        <button
                                            onClick={() => navigate("/auth")}
                                            className="text-green-600 hover:underline"
                                        >
                                            Sign in
                                        </button>{" "}
                                        to save trips and earn points!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Map Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
                        <div className="h-[500px] lg:h-full min-h-[400px]">
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

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Eco Impact</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            The average car emits 0.21 kg CO₂ per km. Choosing public transit can reduce emissions by up to 80%!
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <TrendingDown className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Save More</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Short trips under 5 km contribute most to urban pollution. Walking or cycling these trips makes a big difference!
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Earn Points</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Save trips with eco-friendly transport to earn points. The more carbon you save, the more points you get!
                        </p>
                    </div>
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
