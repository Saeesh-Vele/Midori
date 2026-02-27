import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  Recycle,
  Camera,
  MessageCircle,
  Users,
  Calculator,
  Award,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "Smart AI Recognition",
      description:
        "Upload a photo of any item and our AI instantly identifies it, telling you exactly how to recycle or repurpose it creatively.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: MessageCircle,
      title: "EcoFy Chatbot",
      description:
        "Get personalized eco-tips, DIY upcycling ideas, and sustainability advice through our friendly AI companion.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Recycle,
      title: "Reuse & Recycle Guide",
      description:
        "Discover creative ways to give new life to everyday items. Turn waste into treasures with step-by-step DIY guides.",
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: Calculator,
      title: "Carbon Calculator",
      description:
        "Track your environmental impact and see how your recycling efforts contribute to reducing carbon emissions.",
      color: "from-cyan-500 to-blue-500",
    },
    {
      icon: Users,
      title: "Eco Community",
      description:
        "Connect with like-minded eco-warriors, share your upcycling projects, and inspire others to live sustainably.",
      color: "from-emerald-500 to-green-500",
    },
    {
      icon: Award,
      title: "Eco Points & Rewards",
      description:
        "Earn points for every eco-friendly action. Track your progress and unlock achievements as you help save the planet.",
      color: "from-green-500 to-lime-500",
    },
  ];

  const impactStats = [
    { number: "50M+", label: "Items Recycled", icon: Recycle },
    { number: "10K+", label: "Active Users", icon: Users },
    { number: "25K+", label: "DIY Ideas Shared", icon: Sparkles },
    { number: "1M kg", label: "CO₂ Saved", icon: Leaf },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/40 to-white antialiased">
      {/* ===== Improved Header / Hero ===== */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
          >
            <img src="/ecofy-logo.png" alt="EcoFy" className="w-11 h-11" />
            <span className="text-2xl font-extrabold tracking-tight">
              EcoFy
            </span>
          </button>

          <Button
            onClick={() => navigate("/auth")}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-medium">
                Empowering Sustainable Living
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                How EcoFy Helps
              </span>
              <br />
              <span className="text-gray-800">Save Our Planet</span>
            </h1>

            <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              EcoFy is your AI-powered companion for sustainable living. We help you discover
              creative ways to reuse, recycle, and reduce waste — one item at a time.
            </p>
          </div>
        </div>
      </div>

      {/* Impact Stats */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {impactStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg shadow-primary/5 border border-primary/10 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl md:text-4xl font-black text-primary mb-1 tracking-tight">
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 tracking-tight">
            Everything You Need to Live
            <span className="text-primary"> Sustainably</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Discover our powerful features designed to make eco-friendly living easy and fun.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-7 md:p-8 shadow-lg shadow-primary/5 border border-primary/10 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-primary/40"
            >
              <div
                className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-br from-primary/5 via-emerald-50 to-secondary/5 py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 tracking-tight">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Getting started with EcoFy is simple. Follow these easy steps to begin your eco-journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Upload or Describe",
                desc: "Take a photo of any item or describe it to our AI chatbot",
              },
              {
                step: "2",
                title: "Get Smart Suggestions",
                desc: "Receive personalized ideas for recycling, reusing, or upcycling",
              },
              {
                step: "3",
                title: "Make an Impact",
                desc: "Follow the guides, earn eco-points, and track your environmental contribution",
              },
            ].map((item, index) => (
              <div key={index} className="text-center px-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm md:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <Leaf className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg md:text-xl leading-relaxed opacity-90 mb-8">
              We believe that everyone can make a difference. EcoFy is on a mission to make
              sustainable living accessible, engaging, and rewarding. Together, we can create
              a cleaner, greener future for generations to come.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {["Reduce Waste", "Inspire Action", "Build Community", "Save the Planet"].map(
                (item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm md:text-base"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{item}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 tracking-tight">
          Ready to Make a <span className="text-primary">Difference</span>?
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto mb-8 text-sm md:text-base">
          Join thousands of eco-warriors who are already making an impact. Start your sustainable journey today!
        </p>
        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="bg-primary hover:bg-primary/90 text-white text-lg px-10 py-6 font-bold shadow-xl shadow-primary/30 rounded-xl group focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Get Started Now
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/ecofy-logo.png" alt="EcoFy" className="w-8 h-8" />
            <span className="font-bold text-primary">EcoFy</span>
          </div>
          <p className="text-sm">
            Making sustainability simple, one item at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
