import React from 'react';
import { X, User, Phone, Link as LinkIcon } from 'lucide-react';

interface DeveloperInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeveloperInfoModal: React.FC<DeveloperInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Developer Details</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Developer</p>
              <p className="text-gray-900 font-medium">E. Shanmuka</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Phone className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <a href="tel:+919515490871" className="text-gray-900 font-medium hover:underline">+91 95154 90871</a>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <LinkIcon className="h-5 w-5 text-green-600 mt-1" />
            <div>
              <p className="text-sm text-gray-500">URL</p>
              <a href="https://eshanmuka.onrender.com" target="_blank" rel="noreferrer" className="text-green-700 font-medium hover:underline">eshanmuka.onrender.com</a>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Tip: Press Ctrl + M to open this dialog. On mobile, tap the footer area 4 times.</p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperInfoModal;
