import React from 'react';

interface MessageSkeletonProps {
  count?: number;
}

const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="flex flex-col space-y-4 p-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
            i % 3 === 0 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            <div className="space-y-2">
              <div className={`h-3 bg-gray-300 dark:bg-gray-600 rounded ${
                i % 4 === 0 ? 'w-full' : i % 4 === 1 ? 'w-4/5' : i % 4 === 2 ? 'w-3/4' : 'w-2/3'
              }`}></div>
              {i % 5 === 0 && (
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              )}
              <div className="flex justify-between items-center mt-2">
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-12"></div>
                <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;