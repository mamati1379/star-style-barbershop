import { motion } from "motion/react";

interface HeroIntroProps {
  isLightTheme: boolean;
}

export default function HeroIntro({ isLightTheme }: HeroIntroProps) {
  const themeClass = (lightClass: string, darkClass: string) =>
    isLightTheme ? lightClass : darkClass;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Immersive background */}
      <div
        className={themeClass(
          "absolute inset-0 bg-zinc-50",
          "absolute inset-0 bg-zinc-950",
        )}
      >
        {/* Slowly moving glow orbs */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 12,
            ease: "easeInOut",
          }}
          className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[130px] pointer-events-none"
        />
        <motion.div
          animate={{
            x: [0, -25, 0],
            y: [0, 15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 14,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-120px] right-[-120px] w-[600px] h-[600px] bg-zinc-300/60 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{
            x: [0, 15, 0],
            y: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"
        />
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center px-4">
        {/* Real logo with golden glow */}
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
          }}
          className="mx-auto mb-6 sm:mb-8 w-32 h-32 sm:w-40 sm:h-40 lg:w-44 lg:h-44 relative"
        >
          {/* Golden glow behind logo */}
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          <img
            src="/logo.png"
            alt="Star Style Logo"
            className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
          />
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        >
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white mb-3 sm:mb-4"
            style={{ fontFamily: "'Morabba', sans-serif" }}
          >
            شمارا به زیبایی دعوت میکند
          </h1>
        </motion.div>

        {/* Subtle tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
          className="text-amber-500 text-xs sm:text-sm font-bold tracking-[0.3em] animate-intense-blink"
        >
          🌟 STAR STYLE VIP
        </motion.p>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 0.8, ease: "easeOut" }}
          className="mt-5 sm:mt-6 mb-3 sm:mb-4 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto max-w-xs"
        />
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        className="absolute bottom-10 sm:bottom-14 text-zinc-500 text-sm sm:text-base font-bold flex flex-col items-center gap-2"
      >
        <span>به پایین بکشید</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
        >
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </motion.div>
    </section>
  );
}
