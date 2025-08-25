import React, { useEffect, useState } from 'react';
import { Contact } from '@/types';
import Lucide from '@/components/Base/Lucide';

interface VirtualContactListProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  selectedChatId: string | null;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  employeeList?: any[]; // Add employeeList prop for filtering employee tags
}

const LOAD_MORE_THRESHOLD = 200; // pixels from bottom to trigger load more

const VirtualContactList: React.FC<VirtualContactListProps> = ({
  contacts,
  onContactClick,
  selectedChatId,
  isLoading,
  onLoadMore,
  hasMore,
  employeeList = []
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const scrollThreshold = scrollHeight - clientHeight - LOAD_MORE_THRESHOLD;

    if (scrollTop > scrollThreshold) {
      setIsLoadingMore(true);
      onLoadMore();
    }
  };

  useEffect(() => {
    setIsLoadingMore(false);
  }, [contacts.length]);

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      {contacts.map((contact) => {
        const isSelected = contact.chat_id === selectedChatId;
        const lastMessage = contact.last_message?.text?.body || '';
        const timestamp = contact.last_message?.timestamp 
          ? new Date(contact.last_message.timestamp * 1000).toLocaleString()
          : '';

        // Filter and categorize tags
        const employeeTags = contact.tags?.filter((tag) =>
          employeeList.some(
            (employee) =>
              (employee.name?.toLowerCase() || "") ===
              (typeof tag === "string" ? tag : String(tag)).toLowerCase()
          )
        ) || [];

        const otherTags = contact.tags?.filter(
          (tag) =>
            !employeeList.some(
              (employee) =>
                (employee.name?.toLowerCase() || "") ===
                (typeof tag === "string" ? tag : String(tag)).toLowerCase()
            )
        ) || [];

        const uniqueTags = Array.from(new Set([...otherTags]));

        return (
          <div
            key={contact.chat_id}
            className={`flex items-center p-4 cursor-pointer transition-all duration-300 ease-out ${
              isSelected 
                ? 'bg-white/25 dark:bg-gray-800/40 backdrop-blur-md border border-white/40 dark:border-gray-600/40 shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20' 
                : 'hover:bg-white/15 dark:hover:bg-gray-700/25 backdrop-blur-sm border border-transparent hover:border-white/30 dark:hover:border-gray-600/40'
            } bg-gradient-to-r from-white/5 to-white/10 dark:from-gray-800/10 dark:to-gray-800/15 backdrop-blur-sm rounded-xl mx-2 my-1.5 shadow-sm hover:shadow-md transition-all duration-300`}
            onClick={() => onContactClick(contact)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                  {contact.contactName || contact.phone}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{timestamp}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">{lastMessage}</div>
              
              {/* Tags Section */}
              <div className="flex flex-nowrap gap-1 overflow-hidden">
                {/* Regular tags */}
                {uniqueTags
                  .filter(
                    (tag) =>
                      (typeof tag === "string" ? tag : String(tag)).toLowerCase() !== "stop bot"
                  )
                  .slice(0, 2) // Show first 2 tags to avoid overflow
                  .map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="bg-blue-100/80 dark:bg-blue-600/40 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-1 py-0.5 rounded-full flex items-center backdrop-blur-sm border border-blue-200/50 dark:border-blue-500/30 shadow-sm flex-shrink-0"
                      title={typeof tag === "string" ? tag : String(tag)}
                    >
                      <Lucide
                        icon="Tag"
                        className="w-2.5 h-2.5 inline-block mr-0.5"
                      />
                      <span className="truncate max-w-[50px]">
                        {typeof tag === "string" ? tag : String(tag)}
                      </span>
                    </span>
                  ))}
                {uniqueTags.filter(
                  (tag) =>
                    (typeof tag === "string" ? tag : String(tag)).toLowerCase() !== "stop bot"
                ).length > 2 && (
                  <span className="bg-blue-100/80 dark:bg-blue-600/40 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-1 py-0.5 rounded-full backdrop-blur-sm border border-blue-200/50 dark:border-blue-500/30 shadow-sm flex-shrink-0">
                    +{uniqueTags.filter(
                      (tag) =>
                        (typeof tag === "string" ? tag : String(tag)).toLowerCase() !== "stop bot"
                    ).length - 2}
                  </span>
                )}

                {/* Employee tags */}
                {employeeTags.slice(0, 2).map((tag, tagIndex) => (
                  <span
                    key={`emp-${tagIndex}`}
                    className="bg-green-100/80 dark:bg-green-600/40 text-green-700 dark:text-green-300 text-[10px] font-medium px-1 py-0.5 rounded-full flex items-center backdrop-blur-sm border border-green-200/50 dark:border-green-500/30 shadow-sm flex-shrink-0"
                    title={typeof tag === "string" ? tag : String(tag)}
                  >
                    <Lucide
                      icon="Users"
                      className="w-2.5 h-2.5 inline-block mr-0.5"
                    />
                    <span className="truncate max-w-[50px]">
                      {employeeList.find(
                        (e) =>
                          (e.name?.toLowerCase() || "") ===
                          (typeof tag === "string" ? tag : String(tag)).toLowerCase()
                      )?.employeeId ||
                      (typeof tag === "string" ? tag : String(tag))}
                    </span>
                  </span>
                ))}
                {employeeTags.length > 2 && (
                  <span className="bg-green-100/80 dark:bg-green-600/40 text-green-700 dark:text-green-300 text-[10px] font-medium px-1 py-0.5 rounded-full backdrop-blur-sm border border-green-200/50 dark:border-green-500/30 shadow-sm flex-shrink-0">
                    +{employeeTags.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="loader">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default VirtualContactList; 