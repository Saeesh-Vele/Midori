import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [hasSpoken, setHasSpoken] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  /**
   * Retrieves an Indian English female voice for a warm, human-like tone.
   * Focuses on natural sounding Indian voices across different platforms.
   */
  const getBestFemaleVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = speechSynthesis.getVoices();

    // Priority list of Indian English voices with a focus on natural, human-like tones
    const indianVoicePriority = [
      'Microsoft Neerja Online (Natural)', // Windows Edge - highly natural
      'Microsoft Heera',      // Windows Indian English
      'Veena',                // macOS/iOS Indian English
      'Geeta',                // Android/Chrome Indian English
      'Google UK English Female', // Good quality natural fallback
      'Google US English'
    ];

    for (const name of indianVoicePriority) {
      const match = voices.find(v => v.name.includes(name));
      if (match) return match;
    }

    // Find any Indian English female voice
    const indianFemale = voices.find(v =>
      (v.lang.includes('en-IN') || v.lang.includes('en_IN')) &&
      /female|woman|girl/i.test(v.name)
    );
    if (indianFemale) return indianFemale;

    // Fallback to any Indian English voice
    const anyIndian = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en_IN'));
    if (anyIndian) return anyIndian;

    // Wider fallback: any female English voice
    return voices.find(v =>
      v.lang.startsWith('en') && /female|woman|girl/i.test(v.name)
    );
  };

  // Apply shared voice settings to an utterance
  const applyVoiceSettings = (utterance: SpeechSynthesisUtterance) => {
    utterance.rate = 0.95;  // Slightly closer to normal speed for a more natural flow
    utterance.pitch = 1.05; // Closer to 1.0 to avoid sounding cartoonish and maintain a human tone
    utterance.volume = 0.9;
    const voice = getBestFemaleVoice();
    if (voice) utterance.voice = voice;
  };

  // Midori Voice - warm, encouraging, friendly
  const speakWelcome = (manual = false) => {
    if ('speechSynthesis' in window && (!hasSpoken || manual)) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(
        "Hello there! I'm Midori , your friendly eco companion. I'm here to help you discover amazing ways to reuse, recycle, and give new life to everyday items. Let's make the planet a little greener together!"
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
      -
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
    <div className="min-h-screen bg-gradient-to-br from-green-50/80 via-white to-emerald-100/60 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative Greenery Elements */}

      {/* Top left leaf cluster */}
      <div className="absolute top-0 left-0 text-7xl opacity-10 -rotate-12 select-none pointer-events-none drop-shadow-sm">
        🌿🍃🌱
      </div>

      {/* Top right corner vine */}
      <div className="absolute top-10 right-20 text-5xl opacity-10 rotate-45 select-none pointer-events-none blur-[1px]">
        🌿
      </div>

      {/* Bottom left plants */}
      <div className="absolute bottom-10 left-10 text-6xl opacity-10 select-none pointer-events-none drop-shadow-sm">
        🌱🌿
      </div>

      {/* Floating leaves animation */}
      <div className="absolute top-1/4 left-10 text-3xl opacity-20 animate-bounce select-none pointer-events-none mix-blend-multiply" style={{ animationDelay: '0s', animationDuration: '4s' }}>
        🍃
      </div>
      <div className="absolute top-1/3 left-1/4 text-2xl opacity-15 animate-bounce select-none pointer-events-none mix-blend-multiply" style={{ animationDelay: '1s', animationDuration: '5s' }}>
        🌿
      </div>
      <div className="absolute bottom-1/4 left-20 text-3xl opacity-20 animate-bounce select-none pointer-events-none mix-blend-multiply" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>
        🌱
      </div>

      {/* Decorative green circles/blobs */}
      <div className="absolute top-10 left-1/4 w-64 h-64 bg-green-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-20 left-10 w-80 h-80 bg-emerald-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute top-1/2 left-20 w-48 h-48 bg-teal-200/30 rounded-full blur-[60px] pointer-events-none mix-blend-multiply"></div>

      {/* Bottom decorative grass/leaves strip */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent blur-sm"></div>

      {/* Voice Control Button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={handleVoiceButton}
          variant="outline"
          size="icon"
          className={`
            bg-white/70 backdrop-blur-xl border-white/50 hover:border-primary/30 hover:bg-white/90
            transition-all duration-500 rounded-2xl w-14 h-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
            ${isSpeaking ? 'animate-pulse shadow-primary/20' : ''}
          `}
        >
          {isSpeaking ? (
            <VolumeX className="h-6 w-6 text-primary" />
          ) : (
            <Volume2 className="h-6 w-6 text-primary" />
          )}
        </Button>
      </div>

      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center z-10">
        {/* Left side - Text content */}
        <div className="space-y-6 text-center lg:text-left fade-in px-4 sm:px-0">
          <div>
            {/* Logo with tagline words */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-emerald-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
                <img
                  src="/ecofy-logo.png"
                  alt="EcoFy Logo"
                  className="w-28 h-28 lg:w-32 lg:h-32 relative z-10 drop-shadow-lg transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 mt-4 sm:mt-0">
                <span className="text-sm lg:text-lg font-bold text-gray-400 tracking-[0.2em] uppercase">Reimagine</span>
                <span className="text-sm lg:text-lg font-bold text-primary/70 tracking-[0.2em] uppercase">Recycle</span>
                <span className="text-sm lg:text-lg font-bold text-emerald-600/80 tracking-[0.2em] uppercase">Reuse</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-gray-900">
                Hi, I'm <br className="hidden lg:block" />
                <span className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400 bg-clip-text text-transparent inline-block pb-2 drop-shadow-sm">
                  Midori.
                </span>
              </h1>
              <h2 className="text-2xl lg:text-3xl font-semibold text-gray-600 mt-4 leading-snug">
                Your elegant <span className="text-primary">waste companion.</span>
              </h2>
            </div>
          </div>

          <p className="text-lg lg:text-xl text-gray-500 max-w-lg font-medium leading-relaxed mx-auto lg:mx-0">
            Let's see what your waste can become.
            Together, we'll discover creative ways to reuse, recycle, and make a positive impact on our planet. 🌱
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-6">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/95 hover:to-emerald-600/95 text-white text-lg px-10 py-7 font-bold shadow-xl shadow-emerald-500/20 rounded-full group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30"
            >
              Start Creating
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/about")}
              className="border-2 border-primary/10 bg-white/50 backdrop-blur-sm text-gray-700 hover:text-primary hover:bg-white/80 hover:border-primary/20 text-lg px-8 py-7 font-semibold rounded-full shadow-sm transition-all duration-300 hover:-translate-y-1"
            >
              Learn More
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
            title="Midori - Your Eco Companion"
          />
          {/* Cover to hide Spline watermark */}
          <div className="absolute bottom-0 right-0 w-48 h-14  bg-[#e4faef] pointer-events-none z-10"></div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;