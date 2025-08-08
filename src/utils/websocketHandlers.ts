// Use the Contact interface from the Chat component
interface Contact {
  [x: string]: any;
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string[] | null;
  businessId?: string | null;
  city?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  country?: string | null;
  customFields?: any[] | null;
  dateAdded?: string | null;
  dateOfBirth?: string | null;
  dateUpdated?: string | null;
  dnd?: boolean | null;
  dndSettings?: any | null;
  email?: string | null;
  firstName?: string | null;
  followers?: string[] | null;
  id?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  source?: string | null;
  state?: string | null;
  tags?: string[] | null;
  type?: string | null;
  website?: string | null;
  chat?: any[] | null;
  last_message?: any | null;
  chat_id?: string | null;
  unreadCount?: number | null;
  pinned?: boolean | null;
  profilePicUrl?: string;
  phoneIndex?: number | null;
  points?: number | null;
  phoneIndexes?: number[] | null;
  notes?: string | null;
  contact_id?: string;
}
import { toast } from 'react-toastify';
import LZString from 'lz-string';

  // Handle bot status updates from WebSocket
export const handleBotStatusUpdate = (
  data: any,
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setLoadedContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setFilteredContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setSelectedContact: React.Dispatch<React.SetStateAction<Contact | null>>,
  selectedContact: Contact | null,
  contacts: Contact[]
) => {
  try {
    console.log("🤖 [WEBSOCKET] Processing bot status update:", data);
    
    const { contactId, botEnabled, updatedTags } = data;
    
    if (!contactId) {
      console.error("🤖 [WEBSOCKET] Missing contactId in bot status update");
      return;
    }

    // Update contact's bot status in all state arrays - preserve all existing data
    const updateContactBotStatus = (contact: Contact) => {
      if (contact.contact_id === contactId || contact.id === contactId) {
        console.log("🤖 [WEBSOCKET] Updating bot status for contact:", contact.contactName);
        return {
          ...contact,
          tags: updatedTags || contact.tags,
          // Explicitly preserve critical fields
          assignedTo: contact.assignedTo,
          notes: contact.notes,
          points: contact.points,
        };
      }
      return contact;
    };

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map(updateContactBotStatus);
      console.log("🤖 [WEBSOCKET] Updated contacts with bot status");
      return updatedContacts;
    });

    setLoadedContacts((prevLoadedContacts) => {
      const updatedLoadedContacts = prevLoadedContacts.map(updateContactBotStatus);
      console.log("🤖 [WEBSOCKET] Updated loaded contacts with bot status");
      return updatedLoadedContacts;
    });

    setFilteredContacts((prevFilteredContacts) => {
      const updatedFilteredContacts = prevFilteredContacts.map(updateContactBotStatus);
      console.log("🤖 [WEBSOCKET] Updated filtered contacts with bot status");
      return updatedFilteredContacts;
    });

    // Update selectedContact if it's the same contact - preserve all fields
    if (selectedContact && (selectedContact.contact_id === contactId || selectedContact.id === contactId)) {
      setSelectedContact((prevContact: Contact) => ({
        ...prevContact,
        tags: updatedTags || prevContact.tags,
        // Explicitly preserve critical fields
        assignedTo: prevContact.assignedTo,
        notes: prevContact.notes,
        points: prevContact.points,
      }));
    }

    // Update localStorage
    const storedContacts = localStorage.getItem("contacts");
    if (storedContacts) {
      try {
        const decompressedContacts = JSON.parse(
          LZString.decompress(storedContacts)!
        );
        const updatedContacts = decompressedContacts.map(updateContactBotStatus);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );
        console.log("🤖 [WEBSOCKET] Updated contacts in localStorage");
      } catch (error) {
        console.error("Error updating contacts in localStorage:", error);
      }
    }

    // Show toast notification
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    if (contact) {
      toast.success(
        `Bot ${botEnabled ? "enabled" : "disabled"} for ${
          contact.contactName || contact.firstName || contact.phone
        }`
      );
    }

  } catch (error) {
    console.error("❌ [WEBSOCKET] Error processing bot status update:", error);
  }
};

// Handle contact assignment updates from WebSocket
export const handleContactAssignmentUpdate = (
  data: any,
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setLoadedContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setFilteredContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setSelectedContact: React.Dispatch<React.SetStateAction<Contact | null>>,
  selectedContact: Contact | null,
  contacts: Contact[]
) => {
  try {
    console.log("👤 [WEBSOCKET] Processing contact assignment update:", data);
    
    const { contactId, assignedTo, updatedTags } = data;
    
    if (!contactId) {
      console.error("👤 [WEBSOCKET] Missing contactId in assignment update");
      return;
    }

    // Update contact's assignment in all state arrays
    const updateContactAssignment = (contact: Contact) => {
      if (contact.contact_id === contactId || contact.id === contactId) {
        console.log("👤 [WEBSOCKET] Updating assignment for contact:", contact.contactName);
        return {
          ...contact,
          tags: updatedTags || contact.tags,
          assignedTo: assignedTo ? [assignedTo] : undefined,
        };
      }
      return contact;
    };

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map(updateContactAssignment);
      console.log("👤 [WEBSOCKET] Updated contacts with assignment");
      return updatedContacts;
    });

    setLoadedContacts((prevLoadedContacts) => {
      const updatedLoadedContacts = prevLoadedContacts.map(updateContactAssignment);
      console.log("👤 [WEBSOCKET] Updated loaded contacts with assignment");
      return updatedLoadedContacts;
    });

    setFilteredContacts((prevFilteredContacts) => {
      const updatedFilteredContacts = prevFilteredContacts.map(updateContactAssignment);
      console.log("👤 [WEBSOCKET] Updated filtered contacts with assignment");
      return updatedFilteredContacts;
    });

    // Update selectedContact if it's the same contact
    if (selectedContact && (selectedContact.contact_id === contactId || selectedContact.id === contactId)) {
      setSelectedContact((prevContact: Contact) => ({
        ...prevContact,
        tags: updatedTags || prevContact.tags,
        assignedTo: assignedTo ? [assignedTo] : undefined,
      }));
    }

    // Update localStorage
    const storedContacts = localStorage.getItem("contacts");
    if (storedContacts) {
      try {
        const decompressedContacts = JSON.parse(
          LZString.decompress(storedContacts)!
        );
        const updatedContacts = decompressedContacts.map(updateContactAssignment);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );
        console.log("👤 [WEBSOCKET] Updated contacts in localStorage");
      } catch (error) {
        console.error("Error updating contacts in localStorage:", error);
      }
    }

    // Show toast notification
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    if (contact) {
      if (assignedTo) {
        toast.success(`Contact assigned to ${assignedTo}`);
      } else {
        toast.success("Contact assignment removed");
      }
    }

  } catch (error) {
    console.error("❌ [WEBSOCKET] Error processing contact assignment update:", error);
  }
};

// Handle contact tags updates from WebSocket
export const handleContactTagsUpdate = (
  data: any,
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setLoadedContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setFilteredContacts: React.Dispatch<React.SetStateAction<Contact[]>>,
  setSelectedContact: React.Dispatch<React.SetStateAction<Contact | null>>,
  selectedContact: Contact | null,
  contacts: Contact[]
) => {
  try {
    console.log("🏷️ [WEBSOCKET] Processing contact tags update:", data);
    
    const { contactId, updatedTags, action, tagName } = data;
    
    if (!contactId) {
      console.error("🏷️ [WEBSOCKET] Missing contactId in tags update");
      return;
    }

    // Update contact's tags in all state arrays
    const updateContactTags = (contact: Contact) => {
      if (contact.contact_id === contactId || contact.id === contactId) {
        console.log("🏷️ [WEBSOCKET] Updating tags for contact:", contact.contactName);
        return {
          ...contact,
          tags: updatedTags || contact.tags,
        };
      }
      return contact;
    };

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map(updateContactTags);
      console.log("🏷️ [WEBSOCKET] Updated contacts with tags");
      return updatedContacts;
    });

    setLoadedContacts((prevLoadedContacts) => {
      const updatedLoadedContacts = prevLoadedContacts.map(updateContactTags);
      console.log("🏷️ [WEBSOCKET] Updated loaded contacts with tags");
      return updatedLoadedContacts;
    });

    setFilteredContacts((prevFilteredContacts) => {
      const updatedFilteredContacts = prevFilteredContacts.map(updateContactTags);
      console.log("🏷️ [WEBSOCKET] Updated filtered contacts with tags");
      return updatedFilteredContacts;
    });

    // Update selectedContact if it's the same contact
    if (selectedContact && (selectedContact.contact_id === contactId || selectedContact.id === contactId)) {
      setSelectedContact((prevContact: Contact) => ({
        ...prevContact,
        tags: updatedTags || prevContact.tags,
      }));
    }

    // Update localStorage
    const storedContacts = localStorage.getItem("contacts");
    if (storedContacts) {
      try {
        const decompressedContacts = JSON.parse(
          LZString.decompress(storedContacts)!
        );
        const updatedContacts = decompressedContacts.map(updateContactTags);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );
        console.log("🏷️ [WEBSOCKET] Updated contacts in localStorage");
      } catch (error) {
        console.error("Error updating contacts in localStorage:", error);
      }
    }

    // Show toast notification
    const contact = contacts.find(c => c.contact_id === contactId || c.id === contactId);
    if (contact) {
      if (action === "add") {
        toast.success(`Tag "${tagName}" added to contact`);
      } else if (action === "remove") {
        toast.success(`Tag "${tagName}" removed from contact`);
      }
    }

  } catch (error) {
    console.error("❌ [WEBSOCKET] Error processing contact tags update:", error);
  }
}; 