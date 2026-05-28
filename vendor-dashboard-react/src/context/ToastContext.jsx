import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setVisible(true);
    setTimeout(() => { setVisible(false); }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`px-6 py-3 rounded-xl shadow-2xl text-white font-medium backdrop-blur-sm ${
            toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};