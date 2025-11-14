import React, { useState, useEffect } from "react";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: "small" | "medium" | "large";
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = "medium",
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  // 尺寸配置
  const sizeClasses = {
    small: "w-8 h-8 text-xl",
    medium: "w-10 h-10 text-2xl",
    large: "w-12 h-12 text-3xl",
  };

  const particleSizes = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  const handleClick = () => {
    if (!isFavorite) {
      // 只在收藏时显示动画
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 1500);
    }
    onToggle();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center
          transition-all duration-300 ease-out relative z-10
          ${
            isFavorite
              ? "bg-gradient-to-br from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 shadow-lg hover:shadow-xl"
              : "bg-gray-100 hover:bg-gray-200 shadow-md hover:shadow-lg"
          }
          hover:scale-110 active:scale-95
          group
        `}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {/* 月桂花环图标 */}
        <span
          className={`transform transition-all duration-300
            ${isFavorite ? "scale-100 rotate-0" : "scale-90 rotate-12"}
            ${isFavorite ? "opacity-100" : "opacity-60 group-hover:opacity-100"}
          `}
        >
          {isFavorite ? "🏆" : "⭐"}
        </span>

        {/* 悬停提示效果 */}
        {!isFavorite && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/0 to-amber-500/0 group-hover:from-yellow-400/20 group-hover:to-amber-500/20 transition-all duration-300"></span>
        )}
      </button>

      {/* 古希腊神话风格的粒子动画 */}
      {showAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 金色光环扩散 */}
          <div className="absolute inset-0 -inset-4 animate-ping-once">
            <div className="w-full h-full rounded-full border-4 border-yellow-400 opacity-75"></div>
          </div>

          {/* 月桂叶片粒子 */}
          {[...Array(8)].map((_, i) => {
            const angle = (i * 360) / 8;
            const radius = 40;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <div
                key={i}
                className={`absolute top-1/2 left-1/2 ${particleSizes[size]} animate-particle-float`}
                style={{
                  transform: `translate(-50%, -50%)`,
                  animation: `particle-float-${i} 1.2s ease-out`,
                  animationFillMode: "forwards",
                }}
              >
                <span className="inline-block animate-spin-slow">🍃</span>
              </div>
            );
          })}

          {/* 闪光效果 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-sparkle">
            <span className="text-4xl">✨</span>
          </div>

          {/* 荣耀光芒 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-24 h-24 bg-gradient-radial from-yellow-300/50 via-amber-400/30 to-transparent rounded-full animate-pulse-glow"></div>
          </div>
        </div>
      )}

      {/* 添加自定义动画样式 */}
      <style jsx>{`
        @keyframes ping-once {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-ping-once {
          animation: ping-once 0.8s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes particle-float-0 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(40px, -40px) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-1 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(56px, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-2 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(40px, 40px) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-3 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, 56px) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-4 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-40px, 40px) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-5 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-56px, 0) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-6 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-40px, -40px) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-float-7 {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, -56px) rotate(360deg); opacity: 0; }
        }

        @keyframes sparkle {
          0%, 100% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.5) rotate(180deg); opacity: 1; }
        }

        .animate-sparkle {
          animation: sparkle 1s ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }

        .animate-pulse-glow {
          animation: pulse-glow 1.2s ease-in-out;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FavoriteButton;
