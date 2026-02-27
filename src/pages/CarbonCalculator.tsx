import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebase";
import { doc, updateDoc, increment, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
    Leaf,
    Car,
    Zap,
    Home,
    Plane,
    ArrowLeft,
    TrendingDown,
    Award,
    Calculator,
    Save,
    RefreshCw,
    Lightbulb,
    ChevronRight,
    Fuel,
    Droplets,
    ShoppingCart,
    Utensils,
    Recycle,
    MapPin
} from "lucide-react";

// Emission factors (kg CO2)
const EMISSION_FACTORS = {
    electricity: 0.417, // kg CO2 per kWh (India average)
    petrol: 2.31, // kg CO2 per liter
    diesel: 2.68, // kg CO2 per liter
    cng: 1.88, // kg CO2 per kg
    lpg: 2.98, // kg CO2 per kg
    water: 0.149, // kg CO2 per 1000 liters
    domesticFlight: 0.255, // kg CO2 per km
    internationalFlight: 0.195, // kg CO2 per km
    meat: 27, // kg CO2 per kg (beef average)
    dairy: 3.2, // kg CO2 per kg
};

// Average Indian benchmarks per month
const INDIA_AVERAGES = {
    electricity: 120, // kWh per month (household)
    petrol: 40, // liters per month
    lpg: 14, // kg per month (1 cylinder)
    water: 6000, // liters per month
    footprint: 1.5, // tons CO2 per year per person
};

interface FormData {
    // Transport
    petrolLiters: number;
    dieselLiters: number;
    cngKg: number;
    twoWheelerKm: number;
    carKm: number;
    publicTransportKm: number;

    // Energy
    electricityKwh: number;
    lpgKg: number;
    waterLiters: number;

    // Flights
    domesticFlightKm: number;
    internationalFlightKm: number;

    // Food & Shopping
    meatKg: number;
    dairyKg: number;
    monthlyShoppingRs: number;

    // Waste
    recyclingPercentage: number;
}

const CarbonCalculator = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { toast } = useToast();

    const [formData, setFormData] = useState<FormData>({
        petrolLiters: 0,
        dieselLiters: 0,
        cngKg: 0,
        twoWheelerKm: 0,
        carKm: 0,
        publicTransportKm: 0,
        electricityKwh: 0,
        lpgKg: 0,
        waterLiters: 0,
        domesticFlightKm: 0,
        internationalFlightKm: 0,
        meatKg: 0,
        dairyKg: 0,
        monthlyShoppingRs: 0,
        recyclingPercentage: 0,
    });

    const [showResults, setShowResults] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (field: keyof FormData, value: string) => {
        const numValue = parseFloat(value) || 0;
        setFormData(prev => ({ ...prev, [field]: numValue }));
    };

    const calculateFootprint = () => {
        // Transport emissions
        const petrolEmission = formData.petrolLiters * EMISSION_FACTORS.petrol;
        const dieselEmission = formData.dieselLiters * EMISSION_FACTORS.diesel;
        const cngEmission = formData.cngKg * EMISSION_FACTORS.cng;
        const transportTotal = petrolEmission + dieselEmission + cngEmission;

        // Energy emissions
        const electricityEmission = formData.electricityKwh * EMISSION_FACTORS.electricity;
        const lpgEmission = formData.lpgKg * EMISSION_FACTORS.lpg;
        const waterEmission = (formData.waterLiters / 1000) * EMISSION_FACTORS.water;
        const energyTotal = electricityEmission + lpgEmission + waterEmission;

        // Flight emissions
        const domesticFlightEmission = formData.domesticFlightKm * EMISSION_FACTORS.domesticFlight;
        const internationalFlightEmission = formData.internationalFlightKm * EMISSION_FACTORS.internationalFlight;
        const flightTotal = domesticFlightEmission + internationalFlightEmission;

        // Food emissions (monthly estimates)
        const meatEmission = formData.meatKg * EMISSION_FACTORS.meat;
        const dairyEmission = formData.dairyKg * EMISSION_FACTORS.dairy;
        const shoppingEmission = (formData.monthlyShoppingRs / 1000) * 0.5; // ~0.5 kg CO2 per ₹1000
        const foodTotal = meatEmission + dairyEmission + shoppingEmission;

        // Recycling offset (up to 10% reduction)
        const recyclingReduction = (formData.recyclingPercentage / 100) * 0.1;

        const totalMonthly = (transportTotal + energyTotal + flightTotal + foodTotal) * (1 - recyclingReduction);
        const totalYearly = totalMonthly * 12 / 1000; // Convert to tons

        return {
            transport: transportTotal,
            energy: energyTotal,
            flights: flightTotal,
            food: foodTotal,
            monthly: totalMonthly,
            yearly: totalYearly,
            breakdown: {
                petrol: petrolEmission,
                diesel: dieselEmission,
                cng: cngEmission,
                electricity: electricityEmission,
                lpg: lpgEmission,
                water: waterEmission,
                domesticFlight: domesticFlightEmission,
                internationalFlight: internationalFlightEmission,
                meat: meatEmission,
                dairy: dairyEmission,
                shopping: shoppingEmission,
            }
        };
    };

    const getLevel = (yearly: number) => {
        if (yearly < 1) return { level: "Eco Warrior", color: "text-green-600", bg: "bg-green-100", emoji: "🌟" };
        if (yearly < 2) return { level: "Green Champion", color: "text-emerald-600", bg: "bg-emerald-100", emoji: "🌿" };
        if (yearly < 4) return { level: "Eco Learner", color: "text-yellow-600", bg: "bg-yellow-100", emoji: "🌱" };
        return { level: "Needs Improvement", color: "text-orange-600", bg: "bg-orange-100", emoji: "🔥" };
    };

    const saveResults = async () => {
        if (!user) {
            navigate("/auth");
            return;
        }

        setIsSaving(true);
        const results = calculateFootprint();

        try {
            await addDoc(collection(db, "carbonFootprints"), {
                userId: user.uid,
                userName: userProfile?.name || "Anonymous",
                monthlyEmission: results.monthly,
                yearlyEmission: results.yearly,
                breakdown: results.breakdown,
                formData,
                createdAt: serverTimestamp()
            });

            // Award points based on eco-friendly score
            let points = 10;
            if (results.yearly < 2) points += 15;
            if (results.yearly < 1) points += 25;

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                totalPoints: increment(points),
                lastCarbonFootprint: results.yearly
            });

            toast({
                title: "Saved! 🌱",
                description: `Your footprint was saved. You earned +${points} points!`,
            });

        } catch (error) {
            console.error("Error saving:", error);
            toast({
                title: "Error",
                description: "Failed to save. Please try again.",
                variant: "destructive"
            });
        }
        setIsSaving(false);
    };

    const resetForm = () => {
        setFormData({
            petrolLiters: 0,
            dieselLiters: 0,
            cngKg: 0,
            twoWheelerKm: 0,
            carKm: 0,
            publicTransportKm: 0,
            electricityKwh: 0,
            lpgKg: 0,
            waterLiters: 0,
            domesticFlightKm: 0,
            internationalFlightKm: 0,
            meatKg: 0,
            dairyKg: 0,
            monthlyShoppingRs: 0,
            recyclingPercentage: 0,
        });
        setShowResults(false);
    };

    const results = calculateFootprint();
    const level = getLevel(results.yearly);

    // Render input function (not a component to avoid re-creation)
    const renderInput = (
        label: string,
        field: keyof FormData,
        unit: string,
        Icon: any,
        placeholder = "0",
        hint?: string
    ) => (
        <div key={field} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-green-600" />
                <Label className="text-sm font-medium text-gray-700">{label}</Label>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min="0"
                    step="any"
                    defaultValue=""
                    value={formData[field] === 0 ? "" : formData[field]}
                    onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({
                            ...prev,
                            [field]: val === "" ? 0 : parseFloat(val) || 0
                        }));
                    }}
                    placeholder={placeholder}
                    className="flex-1 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 min-w-[50px]">{unit}</span>
            </div>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );


    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-green-100 py-4 px-6 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
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
                            variant="outline"
                            onClick={() => navigate("/trip-calculator")}
                            className="text-green-700 border-green-200 hover:bg-green-50"
                        >
                            <MapPin className="w-4 h-4 mr-1" />
                            Trip Calculator
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

            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
                        <Calculator className="w-4 h-4" />
                        <span className="text-sm font-medium">Practical Carbon Calculator</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                        Calculate Your Carbon Footprint 🌍
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Enter your actual monthly consumption to get an accurate estimate of your carbon emissions.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Input Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Transport Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Car className="w-5 h-5 text-green-600" />
                                🚗 Transportation (Monthly)
                            </h2>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {renderInput("Petrol Used", "petrolLiters", "liters", Fuel, "0", "Check fuel receipts")}
                                {renderInput("Diesel Used", "dieselLiters", "liters", Fuel)}
                                {renderInput("CNG Used", "cngKg", "kg", Fuel)}
                            </div>
                        </div>

                        {/* Energy Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                ⚡ Home Energy (Monthly)
                            </h2>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {renderInput("Electricity", "electricityKwh", "kWh", Zap, "0", `Avg: ${INDIA_AVERAGES.electricity} kWh`)}
                                {renderInput("LPG (Cooking Gas)", "lpgKg", "kg", Home, "0", "1 cylinder ≈ 14 kg")}
                                {renderInput("Water Usage", "waterLiters", "liters", Droplets, "0", "Estimate daily × 30")}
                            </div>
                        </div>

                        {/* Flights Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Plane className="w-5 h-5 text-blue-500" />
                                ✈️ Air Travel (This Month)
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {renderInput("Domestic Flights", "domesticFlightKm", "km", Plane, "0", "Delhi-Mumbai ≈ 1400 km")}
                                {renderInput("International Flights", "internationalFlightKm", "km", Plane, "0", "India-Dubai ≈ 2700 km")}
                            </div>
                        </div>

                        {/* Food & Shopping Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Utensils className="w-5 h-5 text-orange-500" />
                                🍽️ Food & Shopping (Monthly)
                            </h2>
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {renderInput("Meat (Red/White)", "meatKg", "kg", Utensils)}
                                {renderInput("Dairy Products", "dairyKg", "kg", Droplets, "0", "Milk, cheese, etc.")}
                                {renderInput("Online Shopping", "monthlyShoppingRs", "₹", ShoppingCart, "0", "Packaging & delivery")}
                            </div>
                        </div>

                        {/* Recycling Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Recycle className="w-5 h-5 text-green-500" />
                                ♻️ Waste Management
                            </h2>
                            {renderInput("How much waste do you recycle?", "recyclingPercentage", "%", Recycle, "0", "0% = none, 100% = everything")}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <Button
                                onClick={() => setShowResults(true)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-6 text-lg"
                            >
                                <Calculator className="w-5 h-5 mr-2" />
                                Calculate My Footprint
                            </Button>
                            <Button
                                variant="outline"
                                onClick={resetForm}
                                className="px-6"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="space-y-4">
                        {/* Live Result Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-green-600" />
                                Your Carbon Footprint
                            </h3>

                            {/* Level Badge */}
                            <div className={`${level.bg} rounded-xl p-4 mb-4 text-center`}>
                                <span className="text-3xl">{level.emoji}</span>
                                <p className={`font-bold ${level.color} mt-1`}>{level.level}</p>
                            </div>

                            {/* Main Numbers */}
                            <div className="text-center mb-6">
                                <p className="text-5xl font-black text-gray-800">
                                    {results.yearly.toFixed(2)}
                                </p>
                                <p className="text-gray-500">tons CO₂ / year</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    {results.monthly.toFixed(1)} kg / month
                                </p>
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-3 mb-6">
                                {[
                                    { label: "Transport", value: results.transport, icon: "🚗", color: "bg-red-500" },
                                    { label: "Energy", value: results.energy, icon: "⚡", color: "bg-yellow-500" },
                                    { label: "Flights", value: results.flights, icon: "✈️", color: "bg-blue-500" },
                                    { label: "Food", value: results.food, icon: "🍽️", color: "bg-orange-500" },
                                ].map((item) => {
                                    const total = results.transport + results.energy + results.flights + results.food;
                                    const percentage = total > 0 ? (item.value / total) * 100 : 0;
                                    return (
                                        <div key={item.label}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="flex items-center gap-1">
                                                    {item.icon} {item.label}
                                                </span>
                                                <span className="font-medium">{item.value.toFixed(1)} kg</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${item.color} transition-all`}
                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Comparison */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-gray-600 text-center">
                                    🇮🇳 India average: <strong>{INDIA_AVERAGES.footprint} tons/year</strong>
                                </p>
                                <p className="text-xs text-gray-400 text-center mt-1">
                                    {results.yearly < INDIA_AVERAGES.footprint
                                        ? `You're ${((1 - results.yearly / INDIA_AVERAGES.footprint) * 100).toFixed(0)}% below average! 🎉`
                                        : `You're ${((results.yearly / INDIA_AVERAGES.footprint - 1) * 100).toFixed(0)}% above average`}
                                </p>
                            </div>

                            {/* Save Button */}
                            {showResults && (
                                <Button
                                    onClick={saveResults}
                                    disabled={isSaving}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                                >
                                    {isSaving ? (
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save & Earn Points
                                </Button>
                            )}
                        </div>

                        {/* Tips Card */}
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5" />
                                Quick Tips to Reduce
                            </h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Switch to LED bulbs (75% less energy)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Carpool or use public transport once a week</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>One meat-free day saves 3 kg CO₂/week</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Fix leaky taps (saves 500L water/month)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarbonCalculator;
