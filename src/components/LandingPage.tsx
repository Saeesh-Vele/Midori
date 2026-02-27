import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [hasSpoken, setHasSpoken] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  /**
   * Picks the sweetest, cleanest female English voice available.
   * Priority order (highest → lowest):
   *   macOS/iOS  : Samantha, Karen, Moira, Tessa
   *   Windows    : Zira (Microsoft)
   *   Chrome/Web : Google US English Female
   *   Generic    : any voice whose name/lang signals female + English
   * Returns undefined if none found (browser will use its default).
   */
  const getBestFemaleVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = speechSynthesis.getVoices();

    // Strict priority list of known sweet female voices
    const femaleVoicePriority = [
      'Samantha',           // macOS – warm, natural, most popular
      'Karen',              // macOS Australian – clear & friendly
      'Moira',              // macOS Irish – melodic
      'Tessa',              // macOS South African – bright
      'Microsoft Zira',     // Windows 10/11 – clean female
      'Google US English',  // Chrome Android/desktop female
      'Google UK English Female',
    ];

    for (const name of femaleVoicePriority) {
      const match = voices.find(v => v.name.includes(name));
      if (match) return match;
    }

    // Wider fallback: any voice hinted as female AND English
    const fallback = voices.find(v =>
      v.lang.startsWith('en') &&
      (/female|woman|girl/i.test(v.name))
    );
    return fallback; // may still be undefined – that's fine
  };

  // Apply shared voice settings to an utterance
  const applyVoiceSettings = (utterance: SpeechSynthesisUtterance) => {
    utterance.rate = 0.88;  // slightly slower → clearer, sweeter
    utterance.pitch = 1.25;  // bright but not cartoon-ish
    utterance.volume = 0.85;
    const voice = getBestFemaleVoice();
    if (voice) utterance.voice = voice;
  };

  // EcoFy Buddy Voice - warm, encouraging, friendly
  const speakWelcome = (manual = false) => {
    if ('speechSynthesis' in window && (!hasSpoken || manual)) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(
        "Hello there! I'm EcoFy Buddy, your friendly eco companion. I'm here to help you discover amazing ways to reuse, recycle, and give new life to everyday items. Let's make the planet a little greener together!"
      );
      applyVoiceSettings(utterance);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
      if (!manual) setHasSpoken(true);
    }
  };

  const speakLaunch = () => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(
        "Wonderful! Let's see what we can do with your item. Every small action counts!"
      );
      applyVoiceSettings(utterance);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceButton = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speakWelcome(true);
    }
  };

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const trySpeak = () => {
      // Only auto-speak once; voices must be loaded first
      if (!hasSpoken && speechSynthesis.getVoices().length > 0) {
        const timer = setTimeout(() => speakWelcome(), 800);
        return () => clearTimeout(timer);
      }
    };

    // Voices may already be loaded (Chrome sometimes loads instantly)
    const cleanup = trySpeak();
    if (cleanup) return cleanup;

    // Otherwise wait for voices to load, then speak
    const onVoicesChanged = () => {
      speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      setTimeout(() => speakWelcome(), 800);
    };
    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetStarted = () => {
    speakLaunch();
    setTimeout(() => {
      navigate("/chat");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Greenery Elements */}

      {/* Top left leaf cluster */}
      <div className="absolute top-0 left-0 text-6xl opacity-20 -rotate-12 select-none pointer-events-none">
        🌿🍃🌱
      </div>

      {/* Top right corner vine */}
      <div className="absolute top-10 right-20 text-4xl opacity-15 rotate-45 select-none pointer-events-none">
        🌿
      </div>

      {/* Bottom left plants */}
      <div className="absolute bottom-10 left-10 text-5xl opacity-20 select-none pointer-events-none">
        🌱🌿
      </div>

      {/* Floating leaves animation */}
      <div className="absolute top-1/4 left-10 text-3xl opacity-30 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0s', animationDuration: '3s' }}>
        🍃
      </div>
      <div className="absolute top-1/3 left-1/4 text-2xl opacity-20 animate-bounce select-none pointer-events-none" style={{ animationDelay: '1s', animationDuration: '4s' }}>
        🌿
      </div>
      <div className="absolute bottom-1/4 left-20 text-2xl opacity-25 animate-bounce select-none pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}>
        🌱
      </div>

      {/* Decorative green circles/blobs */}
      <div className="absolute top-20 left-1/3 w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-32 left-10 w-48 h-48 bg-emerald-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-5 w-24 h-24 bg-green-300 rounded-full blur-2xl opacity-25 pointer-events-none"></div>

      {/* Bottom decorative grass/leaves strip */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 opacity-60"></div>

      {/* Voice Control Button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={handleVoiceButton}
          variant="outline"
          size="icon"
          className={`
            bg-white/80 backdrop-blur-md border-primary/40 hover:border-primary
            transition-all duration-300 rounded-full w-14 h-14 shadow-lg
            ${isSpeaking ? 'animate-pulse bg-primary/20' : 'hover:bg-primary/10'}
          `}
        >
          {isSpeaking ? (
            <VolumeX className="h-6 w-6 text-primary" />
          ) : (
            <Volume2 className="h-6 w-6 text-primary" />
          )}
        </Button>
      </div>

      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Text content */}
        <div className="space-y-4 text-center lg:text-left fade-in">
          <div>
            {/* Logo with tagline words */}
            <div className="flex items-center justify-center lg:justify-start gap-6 mb-6">
              <img
                src="/ecofy-logo.png"
                alt="EcoFy Logo"
                className="w-24 h-24 lg:w-36 lg:h-36 "
              />
              <div className="flex flex-col">
                <span className="text-xl lg:text-3xl font-bold text-primary/80 tracking-wide">Reimagine</span>
                <span className="text-xl lg:text-3xl font-bold text-primary tracking-wide">Recycle</span>
                <span className="text-xl lg:text-3xl font-bold text-secondary tracking-wide">Reuse</span>
              </div>
            </div>
            <h1 className="text-6xl lg:text-8xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              EcoFy
            </h1>
            <h2 className="text-xl lg:text-2xl font-extrabold text-primary mt-1">
              Your Friendly Waste Companion
            </h2>
          </div>

          <p className="text-lg lg:text-xl text-gray-600 max-w-xl font-medium">
            Hi! I'm EcoFy Buddy 🌱 Let's see what your waste can become.
            Together, we'll discover creative ways to reuse, recycle, and make a positive impact on our planet.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-white text-lg px-10 py-6 font-bold shadow-xl shadow-primary/30 rounded-xl group"
            >
              Get Started
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/about")}
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white text-lg px-8 py-6 font-bold rounded-xl"
            >
              How EcoFy Helps
            </Button>
          </div>
        </div>

        {/* Right side - Spline 3D Model */}
        <div className="h-[550px] lg:h-[700px] w-full relative overflow-hidden">
          <iframe
            src='https://my.spline.design/ecofriendsforsamokat-eEsCPHhw4fOL3qDyB1sufwzX/'
            frameBorder='0'
            width='100%'
            height='100%'
            className="border-0"
            title="EcoFy Buddy - Your Eco Companion"
          />
          {/* Cover to hide Spline watermark */}
          <div className="absolute bottom-0 right-0 w-48 h-14  bg-[#f1fdf8] pointer-events-none z-10"></div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;