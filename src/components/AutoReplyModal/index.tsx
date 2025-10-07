import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import Lucide from '@/components/Base/Lucide';
import Button from '@/components/Base/Button';

interface AutoReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrigger: (autoReplyHours: number) => void;
  isLoading?: boolean;
}

const AutoReplyModal: React.FC<AutoReplyModalProps> = ({
  isOpen,
  onClose,
  onTrigger,
  isLoading = false
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'hours' | 'date'>('hours');
  const [hours, setHours] = useState<number>(6);
  const [days, setDays] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  const calculateHoursFromDate = () => {
    if (!selectedDate || !selectedTime) return 0;
    
    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    const now = new Date();
    const diffInMs = now.getTime() - selectedDateTime.getTime();
    const diffInHours = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60)));
    
    return diffInHours;
  };

  const calculateTotalHours = () => {
    if (selectedMethod === 'hours') {
      return (days * 24) + hours;
    } else {
      return calculateHoursFromDate();
    }
  };

  const handleTrigger = () => {
    const totalHours = calculateTotalHours();
    if (totalHours > 0) {
      onTrigger(totalHours);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Set default date to today
  React.useEffect(() => {
    if (!selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [selectedDate]);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="fixed inset-0 z-[60] overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />

        {/* Modal */}
        <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/30 p-8 w-full max-w-md mx-auto transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Lucide icon="Zap" className="w-5 h-5 text-white" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Trigger Auto-Reply
                </Dialog.Title>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manually trigger auto-reply for messages
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Lucide icon="X" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedMethod('hours')}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedMethod === 'hours'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Lucide icon="Clock" className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Hours/Days</span>
              </button>
              
              <button
                onClick={() => setSelectedMethod('date')}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedMethod === 'date'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Lucide icon="Calendar" className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Date/Time</span>
              </button>
            </div>
          </div>

          {/* Hours/Days Input */}
          {selectedMethod === 'hours' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Days
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Hours
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="6"
                />
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <strong>Total:</strong> {calculateTotalHours()} hours ({Math.floor(calculateTotalHours() / 24)} days, {calculateTotalHours() % 24} hours)
              </div>
            </div>
          )}

          {/* Date/Time Input */}
          {selectedMethod === 'date' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {selectedDate && selectedTime && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <strong>Hours from selected time:</strong> {calculateHoursFromDate()} hours
                  <br />
                  <span className="text-xs opacity-75">
                    Messages from {selectedDate} {selectedTime} onwards will be processed
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline-secondary"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              variant="primary"
              onClick={handleTrigger}
              disabled={isLoading || calculateTotalHours() === 0}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              {isLoading ? (
                <>
                  <Lucide icon="Loader" className="w-4 h-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <Lucide icon="Zap" className="w-4 h-4 mr-2" />
                  Trigger Auto-Reply
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            This will trigger auto-reply for messages that haven't been responded to within the specified timeframe.
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AutoReplyModal;