import { useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className="bg-white border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px]">
        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
        <p className="text-gray-900 font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}