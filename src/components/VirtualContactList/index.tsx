import React, { useEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact } from '@/types';

interface VirtualContactListProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  selectedChatId: string | null;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

interface Size {
  width: number;
  height: number;
}

const ITEM_HEIGHT = 72; // Height of each contact item
const LOAD_MORE_THRESHOLD = 10; // Number of items before the end to trigger load more

const VirtualContactList: React.FC<VirtualContactListProps> = ({
  contacts,
  onContactClick,
  selectedChatId,
  isLoading,
  onLoadMore,
  hasMore
}) => {
  const listRef = useRef<List>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const ContactItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const contact = contacts[index];
    if (!contact) return null;

    const isSelected = contact.chat_id === selectedChatId;
    const lastMessage = contact.last_message?.text?.body || '';
    const timestamp = contact.last_message?.timestamp 
      ? new Date(contact.last_message.timestamp * 1000).toLocaleString()
      : '';

    return (
      <div
        style={style}
        className={`flex items-center p-4 cursor-pointer border-b ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => onContactClick(contact)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex justify-between">
            <span className="font-medium truncate">
              {contact.contactName || contact.phone}
            </span>
            <span className="text-sm text-gray-500">{timestamp}</span>
          </div>
          <div className="text-sm text-gray-500 truncate">{lastMessage}</div>
        </div>
      </div>
    );
  };

  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
    if (scrollUpdateWasRequested || isLoadingMore || !hasMore) return;

    const scrollThreshold = contacts.length * ITEM_HEIGHT - LOAD_MORE_THRESHOLD * ITEM_HEIGHT;
    if (scrollOffset > scrollThreshold) {
      setIsLoadingMore(true);
      onLoadMore();
    }
  };

  useEffect(() => {
    setIsLoadingMore(false);
  }, [contacts.length]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }: Size) => (
          <List
            ref={listRef}
            height={height}
            itemCount={contacts.length}
            itemSize={ITEM_HEIGHT}
            width={width}
            onScroll={handleScroll}
          >
            {ContactItem}
          </List>
        )}
      </AutoSizer>
      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="loader">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default VirtualContactList; 