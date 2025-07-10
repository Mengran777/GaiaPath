import React from "react";

const FloatingActions: React.FC = () => {
  const fabBtnClass = `w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600
                       text-white text-2xl shadow-xl hover:shadow-2xl
                       flex items-center justify-center cursor-pointer
                       transition-all duration-300 ease-in-out hover:scale-110 hover:-translate-y-1 active:scale-95`;

  const handleFabClick = (action: string) => {
    console.log(`${action} feature under development...`);
    alert(`${action} feature under development...`);
  };

  return (
    <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-50">
      <button
        className={fabBtnClass}
        title="Save Itinerary"
        onClick={() => handleFabClick("Save Itinerary")}
      >
        💾
      </button>
      <button
        className={fabBtnClass}
        title="Share"
        onClick={() => handleFabClick("Share")}
      >
        📤
      </button>
      <button
        className={fabBtnClass}
        title="Chat Assistant"
        onClick={() => handleFabClick("Chat Assistant")}
      >
        💬
      </button>
    </div>
  );
};

export default FloatingActions;
