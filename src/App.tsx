import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import EcoChatbot from "./components/EcoChatbot";
import Community from "./pages/Community";
import CarbonCalculator from "./pages/CarbonCalculator";
import TripCalculator from "./pages/TripCalculator";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import About from "./pages/About";
import EcoMap from "./pages/EcoMap";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chat" element={<EcoChatbot />} />
            <Route path="/community" element={<Community />} />
            <Route path="/carbon" element={<CarbonCalculator />} />
            <Route path="/trip-calculator" element={<TripCalculator />} />
            <Route path="/eco-map" element={<EcoMap />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
