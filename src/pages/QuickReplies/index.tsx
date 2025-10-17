import React, { useState, useEffect, useCallback, useRef } from "react";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface QuickReply {
  id: string;
  category: string;
  keyword?: string;
  text: string;
  type?: string;
  documents?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
      }[]
    | null;
  images?: string[] | null;
  videos?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
        thumbnail?: string;
      }[]
    | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  // Computed properties for compatibility
  title?: string;
  description?: string;
  scope?: "company" | "user";
  showImage?: boolean;
  showDocument?: boolean;
  createdAt?: any;
  createdBy?: string;
}

const QuickRepliesPage: React.FC = () => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "self">("all");
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [editingDocuments, setEditingDocuments] = useState<File[]>([]);
  const [editingImages, setEditingImages] = useState<File[]>([]);
  const [newQuickReply, setNewQuickReply] = useState({
    keyword: "",
    text: "",
    category: "",
    type: "",
  });
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<{
    [key: string]: { image: boolean; document: boolean };
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: "image" | "document" | "video";
    url: string;
    title: string;
  }>({
    isOpen: false,
    type: "image",
    url: "",
    title: "",
  });

  // Add new state for preview
  const [selectedPreview, setSelectedPreview] = useState<{
    type: "image" | "document" | "video" | null;
    url: string;
    title: string;
  } | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [editingVideos, setEditingVideos] = useState<File[]>([]);
  // Fetch company data from API using user email
  const [companyData, setCompanyData] = useState<any>(null);
  const baseUrl = "https://raucous-joaquin-unexamining.ngrok-free.dev";

  const getCurrentUserEmail = () => {
    try {
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        console.log(`Current user email: ${userData.email}`);
        return userData.email;
      }
    } catch (e) {
      console.error("Error parsing userData from localStorage");
    }
    return null;
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      const email = getCurrentUserEmail();
      if (!email) return;
      try {
        const response = await fetch(
          `${baseUrl}/api/user-context?email=${encodeURIComponent(email)}`
        );
        if (!response.ok) throw new Error("Failed to fetch user context");
        const data = await response.json();
        console.log("Fetched company data:", data);
        setCompanyData({
          baseUrl: data.baseUrl,
          ...data,
        });
      } catch (error) {
        console.error("Error fetching company data:", error);
      }
    };
    fetchCompanyData();
  }, []);

  // Helper to get company data (from state)
  const getCompanyData = () => companyData;

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchQuickReplies(), fetchCategories()]);
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Add keyboard event listener for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && previewModal.isOpen) {
        setPreviewModal((prev) => ({ ...prev, isOpen: false }));
      }
    };

    if (previewModal.isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [previewModal.isOpen]);

  const fetchQuickReplies = async () => {
    try {
      const userEmail = getCurrentUserEmail();

      if (!userEmail) {
        console.error("No authenticated user email");
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/quick-replies?email=${encodeURIComponent(userEmail)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.quickReplies) {
        const fetchedQuickReplies: QuickReply[] = data.quickReplies.map(
          (reply: any) => ({
            ...reply,
            // Add computed fields for compatibility
            title: reply.keyword || reply.title || "",
            description: reply.text || reply.description || "",
            scope: "user", // Default scope since the API doesn't return this field
          })
        );

        setQuickReplies(fetchedQuickReplies);
      } else {
        console.error("Failed to fetch quick replies:", data.error);
      }
    } catch (error) {
      console.error("Error fetching quick replies:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const userEmail = getCurrentUserEmail();

      if (!userEmail) {
        console.error("Missing user email");
        return;
      }

      // First get user context to get company ID
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId) {
        console.error("No company ID found");
        setCategories(["all"]);
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/quick-reply-categories?companyId=${companyId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCategories(["all", ...data.categories]);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(["all"]);
    }
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${baseUrl}/api/upload-media`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  };

  const uploadDocument = async (
    file: File
  ): Promise<{
    name: string;
    type: string;
    size: number;
    url: string;
    lastModified: number;
  }> => {
    const url = await uploadMedia(file);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: url,
      lastModified: file.lastModified,
    };
  };

  const uploadImage = async (file: File): Promise<string> => {
    return await uploadMedia(file);
  };

  const uploadVideo = async (
    file: File
  ): Promise<{
    name: string;
    type: string;
    size: number;
    url: string;
    lastModified: number;
    thumbnail?: string;
  }> => {
    const url = await uploadMedia(file);

    // Generate thumbnail using canvas
    let thumbnail;
    try {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.onloadeddata = resolve;
        video.load();
      });
      video.currentTime = 1; // Get frame at 1 second
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      thumbnail = canvas.toDataURL("image/jpeg");
    } catch (error) {
      console.error("Error generating thumbnail:", error);
    }

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: url,
      lastModified: file.lastModified,
      thumbnail,
    };
  };

  const handlePreviewClick = (
    type: "image" | "document" | "video",
    url: string,
    title: string
  ) => {
    setPreviewModal({
      isOpen: true,
      type,
      url,
      title,
    });
  };

  const getFileType = (fileName: string): "image" | "document" | "video" => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const videoExtensions = ["mp4", "webm", "ogg", "mov"];
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    if (imageExtensions.includes(extension)) return "image";
    if (videoExtensions.includes(extension)) return "video";
    return "document";
  };

  const generatePreviewUrl = (file: File): string => {
    if (getFileType(file.name) === "image") {
      return URL.createObjectURL(file);
    }
    // For PDFs and other documents that can be previewed
    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return "";
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "document" | "image"
  ) => {
    const files = Array.from(e.target.files || []);
    if (type === "document") {
      setSelectedDocuments((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const url = generatePreviewUrl(file);
        setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
      });
    } else {
      setSelectedImages((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const url = generatePreviewUrl(file);
        setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
      });
    }
  };

  const removeFile = (fileName: string, type: "document" | "image") => {
    if (type === "document") {
      setSelectedDocuments((prev) =>
        prev.filter((file) => file.name !== fileName)
      );
    } else {
      setSelectedImages((prev) =>
        prev.filter((file) => file.name !== fileName)
      );
    }
    URL.revokeObjectURL(previewUrls[fileName]);
    setPreviewUrls((prev) => {
      const newUrls = { ...prev };
      delete newUrls[fileName];
      return newUrls;
    });
  };

  const handleEditingFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "document" | "image"
  ) => {
    const files = Array.from(e.target.files || []);
    if (type === "document") {
      setEditingDocuments((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
      });
    } else {
      setEditingImages((prev) => [...prev, ...files]);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
      });
    }
  };

  const removeEditingFile = (fileName: string, type: "document" | "image") => {
    if (type === "document") {
      setEditingDocuments((prev) =>
        prev.filter((file) => file.name !== fileName)
      );
    } else {
      setEditingImages((prev) => prev.filter((file) => file.name !== fileName));
    }
    URL.revokeObjectURL(previewUrls[fileName]);
    setPreviewUrls((prev) => {
      const newUrls = { ...prev };
      delete newUrls[fileName];
      return newUrls;
    });
  };

  const handleVideoSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditing: boolean = false
  ) => {
    const files = Array.from(e.target.files || []);
    if (isEditing) {
      setEditingVideos((prev) => [...prev, ...files]);
    } else {
      setSelectedVideos((prev) => [...prev, ...files]);
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviewUrls((prev) => ({ ...prev, [file.name]: url }));
    });
  };

  const removeVideo = (fileName: string, isEditing: boolean = false) => {
    if (isEditing) {
      setEditingVideos((prev) => prev.filter((file) => file.name !== fileName));
    } else {
      setSelectedVideos((prev) =>
        prev.filter((file) => file.name !== fileName)
      );
    }
    URL.revokeObjectURL(previewUrls[fileName]);
    setPreviewUrls((prev) => {
      const newUrls = { ...prev };
      delete newUrls[fileName];
      return newUrls;
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup preview URLs when component unmounts
      Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addQuickReply = async () => {
    if (newQuickReply.text.trim() === "") {
      toast.error("Text is required");
      return;
    }

    setIsLoading(true);
    try {
      const userEmail = getCurrentUserEmail();

      if (!userEmail) {
        toast.error("User authentication not found");
        return;
      }

      // Prepare media arrays for upload
      let uploadedDocuments = null;
      let uploadedImages = null;
      let uploadedVideos = null;

      try {
        // Upload documents
        if (selectedDocuments.length > 0) {
          const documentPromises = selectedDocuments.map(uploadDocument);
          uploadedDocuments = await Promise.all(documentPromises);
        }

        // Upload images
        if (selectedImages.length > 0) {
          const imagePromises = selectedImages.map(uploadImage);
          uploadedImages = await Promise.all(imagePromises);
        }

        // Upload videos
        if (selectedVideos.length > 0) {
          const videoPromises = selectedVideos.map(uploadVideo);
          uploadedVideos = await Promise.all(videoPromises);
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        toast.error("Failed to upload media files");
        setIsLoading(false);
        return;
      }

      const quickReplyData = {
        email: userEmail,
        category: newQuickReply.category || null,
        keyword: newQuickReply.keyword || null,
        text: newQuickReply.text,
        type: newQuickReply.type || null,
        documents: uploadedDocuments,
        images: uploadedImages,
        videos: uploadedVideos,
        created_by: userEmail,
      };

      const response = await fetch(`${baseUrl}/api/quick-replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quickReplyData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNewQuickReply({
          keyword: "",
          text: "",
          category: "",
          type: "",
        });
        setSelectedDocuments([]);
        setSelectedImages([]);
        setSelectedVideos([]);
        setPreviewUrls({});
        toast.success("Quick reply added successfully");
        fetchQuickReplies();
      } else {
        toast.error(data.error || "Failed to add quick reply");
      }
    } catch (error) {
      console.error("Error adding quick reply:", error);
      toast.error("Failed to add quick reply");
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuickReply = async (
    id: string,
    keyword: string,
    text: string,
    category: string,
    type?: string
  ) => {
    const userEmail = getCurrentUserEmail();

    if (!userEmail) {
      toast.error("User authentication not found");
      return;
    }

    try {
      // Upload new media files if any
      let uploadedDocuments = null;
      let uploadedImages = null;
      let uploadedVideos = null;

      if (editingDocuments.length > 0) {
        const documentPromises = editingDocuments.map(uploadDocument);
        uploadedDocuments = await Promise.all(documentPromises);
      }

      if (editingImages.length > 0) {
        const imagePromises = editingImages.map(uploadImage);
        uploadedImages = await Promise.all(imagePromises);
      }

      if (editingVideos.length > 0) {
        const videoPromises = editingVideos.map(uploadVideo);
        uploadedVideos = await Promise.all(videoPromises);
      }

      const updateData: any = {
        updated_by: userEmail,
      };

      if (keyword !== undefined) updateData.keyword = keyword;
      if (text !== undefined) updateData.text = text;
      if (category !== undefined) updateData.category = category;
      if (type !== undefined) updateData.type = type;
      if (uploadedDocuments !== null) updateData.documents = uploadedDocuments;
      if (uploadedImages !== null) updateData.images = uploadedImages;
      if (uploadedVideos !== null) updateData.videos = uploadedVideos;

      const response = await fetch(`${baseUrl}/api/quick-replies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setEditingReply(null);
        setEditingDocuments([]);
        setEditingImages([]);
        setEditingVideos([]);
        setPreviewUrls({});
        toast.success("Quick reply updated successfully");
        fetchQuickReplies();
      } else {
        toast.error(data.error || "Failed to update quick reply");
      }
    } catch (error) {
      console.error("Error updating quick reply:", error);
      toast.error("Failed to update quick reply");
    }
  };

  const deleteQuickReply = async (id: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/quick-replies/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Quick reply deleted successfully");
        fetchQuickReplies();
      } else {
        toast.error(data.error || "Failed to delete quick reply");
      }
    } catch (error) {
      console.error("Error deleting quick reply:", error);
      toast.error("Failed to delete quick reply");
    }
  };

  const toggleItem = (id: string, type: "image" | "document") => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [type]: !prev[id]?.[type],
      },
    }));
  };

  const filteredQuickReplies = quickReplies
    .filter(
      (reply) =>
        activeTab === "all" ||
        reply.scope === "company" ||
        (activeTab === "self" && reply.scope === "user")
    )
    .filter((reply) => {
      if (selectedCategory === "all") return true;
      return reply.category === selectedCategory;
    })
    .filter((reply) => {
      const title = reply.title || reply.keyword || "";
      const description = reply.description || reply.text || "";
      return (
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aTitle = a.title || a.keyword || "";
      const bTitle = b.title || b.keyword || "";
      return aTitle.localeCompare(bTitle);
    });

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const userEmail = getCurrentUserEmail();

      if (!userEmail) {
        toast.error("User authentication not found");
        return;
      }

      // First get user context to get company ID
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId) {
        toast.error("Company ID not found");
        return;
      }

      const categoryData = {
        companyId: companyId,
        category: newCategoryName,
      };

      const response = await fetch(`${baseUrl}/api/quick-reply-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNewCategoryName("");
        fetchCategories();
        toast.success("Category added successfully");
      } else {
        toast.error(data.error || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const deleteCategory = async (categoryName: string) => {
    try {
      const userEmail = getCurrentUserEmail();

      if (!userEmail) {
        toast.error("User authentication not found");
        return;
      }

      // First get user context to get company ID
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId) {
        toast.error("Company ID not found");
        return;
      }

      const response = await fetch(`${baseUrl}/api/quick-reply-categories`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: companyId,
          category: categoryName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        fetchCategories();
        toast.success("Category deleted successfully");
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      <div className="h-full overflow-y-auto p-4">
        {/* Header Section */}
        <div className="mb-6">
          <div className="backdrop-blur-xl bg-white/20 dark:bg-slate-800/20 rounded-2xl p-4 border border-white/30 dark:border-slate-700/30 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <Link to="/settings">
                  <Button
                    variant="outline-secondary"
                    className="group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 dark:hover:shadow-slate-500/20 rounded-xl hover:scale-105 transform-gpu"
                  >
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20 dark:from-slate-400/20 dark:to-slate-500/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Back</span>
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Quick Replies
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                    Manage your quick reply templates and categories
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="secondary"
                  onClick={() => setShowCategoryModal(true)}
                  className="backdrop-blur-sm bg-slate-100/60 dark:bg-slate-700/60 hover:bg-slate-200/60 dark:hover:bg-slate-600/60 border border-slate-200/50 dark:border-slate-600/50 rounded-xl px-3 py-1.5 text-xs"
                >
                  <Lucide icon="Tags" className="w-3 h-3 mr-1.5" />
                  Categories
                </Button>
                <div className="flex backdrop-blur-sm bg-white/40 dark:bg-slate-700/40 rounded-xl p-1 border border-white/50 dark:border-slate-600/50">
                  <button
                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-xs ${
                      activeTab === "all"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                        : "hover:bg-white/50 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300"
                    }`}
                    onClick={() => setActiveTab("all")}
                  >
                    All
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-lg transition-all duration-200 text-xs ${
                      activeTab === "self"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                        : "hover:bg-white/50 dark:hover:bg-slate-600/50 text-slate-600 dark:text-slate-300"
                    }`}
                    onClick={() => setActiveTab("self")}
                  >
                    Personal
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="backdrop-blur-xl bg-white/40 dark:bg-slate-700/40 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent shadow-lg appearance-none cursor-pointer pr-8 pl-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "all" ? "All Categories" : category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search quick replies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-2 backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-xs text-slate-700 dark:text-slate-200"
                  />
                  <Lucide
                    icon="Search"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Create/Edit Form Panel */}
          <div className="col-span-12 xl:col-span-5">
            <div className="backdrop-blur-xl bg-white/30 dark:bg-slate-800/30 rounded-2xl p-6 border border-white/40 dark:border-slate-700/40 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Add New Quick Reply
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <select
                      className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200 appearance-none cursor-pointer pr-8"
                      value={newQuickReply.category}
                      onChange={(e) =>
                        setNewQuickReply((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select Category</option>
                      {categories
                        .filter((cat) => cat !== "all")
                        .map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="relative">
                    <input
                      className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                      placeholder="Type (optional)"
                      value={newQuickReply.type}
                      onChange={(e) =>
                        setNewQuickReply((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="relative">
                    <input
                      className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                      placeholder="Keyword (optional)"
                      value={newQuickReply.keyword}
                      onChange={(e) =>
                        setNewQuickReply((prev) => ({
                          ...prev,
                          keyword: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200 resize-none"
                    placeholder="Text (required)"
                    value={newQuickReply.text}
                    onChange={(e) =>
                      setNewQuickReply((prev) => ({
                        ...prev,
                        text: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    id="quickReplyFile"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileSelect(e, "document")}
                  />
                  <label
                    htmlFor="quickReplyFile"
                    className="flex items-center px-3 py-2 backdrop-blur-sm bg-blue-50/60 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors border border-blue-200/50 dark:border-blue-800/50 text-xs"
                  >
                    <Lucide icon="File" className="w-4 h-4 mr-1.5" />
                    Documents
                  </label>
                  <input
                    type="file"
                    id="quickReplyImage"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileSelect(e, "image")}
                  />
                  <label
                    htmlFor="quickReplyImage"
                    className="flex items-center px-3 py-2 backdrop-blur-sm bg-green-50/60 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl cursor-pointer hover:bg-green-100/60 dark:hover:bg-green-900/30 transition-colors border border-green-200/50 dark:border-green-800/50 text-xs"
                  >
                    <Lucide icon="Image" className="w-4 h-4 mr-1.5" />
                    Images
                  </label>
                  <input
                    type="file"
                    id="quickReplyVideo"
                    accept="video/*"
                    className="hidden"
                    multiple
                    onChange={(e) => handleVideoSelect(e, false)}
                  />
                  <label
                    htmlFor="quickReplyVideo"
                    className="flex items-center px-3 py-2 backdrop-blur-sm bg-purple-50/60 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition-colors border border-purple-200/50 dark:border-purple-800/50 text-xs"
                  >
                    <Lucide icon="Video" className="w-4 h-4 mr-1.5" />
                    Videos
                  </label>
                  <div className="ml-auto">
                    <button
                      className={`px-4 py-2 backdrop-blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-blue-500/50 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs flex items-center ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={addQuickReply}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Lucide
                            icon="Loader"
                            className="w-4 h-4 mr-1.5 animate-spin"
                          />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Lucide icon="Plus" className="w-4 h-4 mr-1.5" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preview Section */}
                {(selectedDocuments.length > 0 ||
                  selectedImages.length > 0 ||
                  selectedVideos.length > 0) && (
                  <div className="mt-4 p-4 backdrop-blur-sm bg-white/30 dark:bg-slate-700/30 rounded-xl border border-white/40 dark:border-slate-600/40 shadow-lg">
                    <div className="flex items-center mb-3">
                      <Lucide
                        icon="Paperclip"
                        className="w-4 h-4 text-slate-500 mr-2"
                      />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Attachments (
                        {selectedImages.length +
                          selectedDocuments.length +
                          selectedVideos.length}
                        )
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[
                        ...selectedImages,
                        ...selectedDocuments,
                        ...selectedVideos,
                      ].map((file) => (
                        <div key={file.name} className="relative group">
                          {getFileType(file.name) === "image" ? (
                            <div className="relative backdrop-blur-sm bg-white/40 dark:bg-slate-800/40 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-white/50 dark:border-slate-600/50">
                              <div className="aspect-square">
                                <img
                                  src={previewUrls[file.name]}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                <Lucide icon="Image" className="w-3 h-3" />
                              </div>
                              <button
                                onClick={() => removeFile(file.name, "image")}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          ) : getFileType(file.name) === "video" ? (
                            <div className="relative backdrop-blur-sm bg-white/40 dark:bg-slate-800/40 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-white/50 dark:border-slate-600/50">
                              <div className="aspect-square relative bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                <Lucide
                                  icon="Video"
                                  className="w-8 h-8 text-slate-400"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/60 rounded-full p-2">
                                    <Lucide
                                      icon="Play"
                                      className="w-4 h-4 text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                <Lucide icon="Video" className="w-3 h-3" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-white text-xs truncate font-medium">
                                  {file.name}
                                </p>
                                <p className="text-white/80 text-xs">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => removeVideo(file.name, false)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col relative">
                              <div className="flex items-center justify-center h-16 mb-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <Lucide
                                    icon="FileText"
                                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                                  />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  removeFile(file.name, "document")
                                }
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Replies List Panel */}
          <div className="col-span-12 xl:col-span-7">
            <div className="backdrop-blur-xl bg-white/30 dark:bg-slate-800/30 rounded-2xl p-6 border border-white/40 dark:border-slate-700/40 shadow-2xl">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Quick Replies
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
              </div>

              <div className="space-y-3">
                {filteredQuickReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="backdrop-blur-sm bg-white/40 dark:bg-slate-700/40 rounded-xl p-4 border border-white/50 dark:border-slate-600/50 hover:shadow-lg transition-all duration-200"
                  >
                    {editingReply?.id === reply.id ? (
                      <div className="space-y-6 border-2 border-blue-500/20 rounded-xl p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
                        {/* Header with editing indicator */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Lucide
                                icon="PencilLine"
                                className="w-5 h-5 text-blue-500"
                              />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Editing Quick Reply
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Make your changes below
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 bg-amber-100/60 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium flex items-center">
                              <Lucide icon="Clock" className="w-3 h-3 mr-1" />
                              Editing
                            </span>
                          </div>
                        </div>

                        {/* Form fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Keyword
                            </label>
                            <input
                              className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                              value={editingReply.keyword || ""}
                              onChange={(e) =>
                                setEditingReply({
                                  ...editingReply,
                                  keyword: e.target.value,
                                })
                              }
                              placeholder="Enter keyword (optional)"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Category
                            </label>
                            <div className="relative">
                              <select
                                className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200 appearance-none cursor-pointer pr-8"
                                value={editingReply.category || ""}
                                onChange={(e) =>
                                  setEditingReply({
                                    ...editingReply,
                                    category: e.target.value,
                                  })
                                }
                              >
                                <option value="">Select Category</option>
                                {categories
                                  .filter((cat) => cat !== "all")
                                  .map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Type
                            </label>
                            <input
                              className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                              value={editingReply.type || ""}
                              onChange={(e) =>
                                setEditingReply({
                                  ...editingReply,
                                  type: e.target.value,
                                })
                              }
                              placeholder="Enter type (optional)"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Text
                          </label>
                          <textarea
                            id={`edit-textarea-${reply.id}`}
                            className="w-full backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 border border-white/60 dark:border-slate-600/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-transparent px-3 py-2 text-xs text-slate-700 dark:text-slate-200 resize-none"
                            value={editingReply.text || ""}
                            onChange={(e) =>
                              setEditingReply({
                                ...editingReply,
                                text: e.target.value,
                              })
                            }
                            placeholder="Enter description (optional)"
                            rows={4}
                          />
                        </div>

                        {/* Existing attachments preview */}
                        {((reply.images && reply.images.length > 0) ||
                          (reply.documents && reply.documents.length > 0) ||
                          (reply.videos && reply.videos.length > 0)) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                                <Lucide
                                  icon="Paperclip"
                                  className="w-4 h-4 mr-2"
                                />
                                Current Attachments
                              </label>
                              <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-700/50 px-2 py-1 rounded-full">
                                {(reply.images?.length || 0) +
                                  (reply.documents?.length || 0) +
                                  (reply.videos?.length || 0)}{" "}
                                files
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 backdrop-blur-sm bg-white/30 dark:bg-slate-700/30 rounded-xl border border-white/40 dark:border-slate-600/40">
                              {reply.images?.map((image, index) => (
                                <div
                                  key={`existing-image-${index}`}
                                  className="relative group cursor-pointer backdrop-blur-sm bg-white/40 dark:bg-slate-800/40 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-white/50 dark:border-slate-600/50"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "image",
                                      image,
                                      `Image ${index + 1}`
                                    )
                                  }
                                >
                                  <div className="aspect-square">
                                    <img
                                      src={image}
                                      alt={`Image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                      <Lucide
                                        icon="ZoomIn"
                                        className="w-4 h-4 text-gray-700 dark:text-gray-300"
                                      />
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide
                                      icon="Image"
                                      className="w-3 h-3 mr-1"
                                    />
                                    IMG
                                  </div>
                                </div>
                              ))}
                              {reply.videos?.map((video, index) => (
                                <div
                                  key={`existing-video-${index}`}
                                  className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "video",
                                      video.url,
                                      video.name
                                    )
                                  }
                                >
                                  <div className="aspect-square relative">
                                    {video.thumbnail ? (
                                      <img
                                        src={video.thumbnail}
                                        alt={`Video ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                                        <Lucide
                                          icon="Video"
                                          className="w-8 h-8 text-purple-600 dark:text-purple-400"
                                        />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/60 rounded-full p-2 group-hover:bg-black/80 transition-colors">
                                        <Lucide
                                          icon="Play"
                                          className="w-5 h-5 text-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide
                                      icon="Video"
                                      className="w-3 h-3 mr-1"
                                    />
                                    VID
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                    <p className="text-white text-xs truncate font-medium">
                                      {video.name}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {reply.documents?.map((document, index) => (
                                <div
                                  key={`existing-document-${index}`}
                                  className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "document",
                                      document.url,
                                      document.name
                                    )
                                  }
                                >
                                  <div className="flex items-center justify-center h-12 mb-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                      <Lucide
                                        icon="FileText"
                                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1 text-center">
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                      {document.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(document.size / 1024 / 1024).toFixed(1)}{" "}
                                      MB
                                    </p>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide
                                      icon="File"
                                      className="w-3 h-3 mr-1"
                                    />
                                    DOC
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* File upload section */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                            <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                            Add New Attachments
                          </label>
                          <div className="flex flex-wrap gap-3">
                            <div>
                              <input
                                type="file"
                                id={`editFile-${reply.id}`}
                                className="hidden"
                                multiple
                                onChange={(e) =>
                                  handleEditingFileSelect(e, "document")
                                }
                              />
                              <label
                                htmlFor={`editFile-${reply.id}`}
                                className="flex items-center px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                              >
                                <Lucide icon="File" className="w-5 h-5 mr-2" />
                                Documents
                              </label>
                            </div>
                            <div>
                              <input
                                type="file"
                                id={`editImage-${reply.id}`}
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={(e) =>
                                  handleEditingFileSelect(e, "image")
                                }
                              />
                              <label
                                htmlFor={`editImage-${reply.id}`}
                                className="flex items-center px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
                              >
                                <Lucide icon="Image" className="w-5 h-5 mr-2" />
                                Images
                              </label>
                            </div>
                            <div>
                              <input
                                type="file"
                                id={`editVideo-${reply.id}`}
                                accept="video/*"
                                className="hidden"
                                multiple
                                onChange={(e) => handleVideoSelect(e, true)}
                              />
                              <label
                                htmlFor={`editVideo-${reply.id}`}
                                className="flex items-center px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800"
                              >
                                <Lucide icon="Video" className="w-5 h-5 mr-2" />
                                Videos
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* New attachments preview */}
                        {(editingDocuments.length > 0 ||
                          editingImages.length > 0 ||
                          editingVideos.length > 0) && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                <Lucide
                                  icon="Upload"
                                  className="w-4 h-4 mr-2"
                                />
                                New Attachments
                              </label>
                              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                {editingImages.length +
                                  editingDocuments.length +
                                  editingVideos.length}{" "}
                                new files
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                              {editingImages.map((file) => (
                                <div
                                  key={`new-image-${file.name}`}
                                  className="relative group"
                                >
                                  <div
                                    className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-2 border-green-200 dark:border-green-700 cursor-pointer"
                                    onClick={() =>
                                      handlePreviewClick(
                                        "image",
                                        previewUrls[file.name],
                                        file.name
                                      )
                                    }
                                  >
                                    <div className="aspect-square">
                                      <img
                                        src={previewUrls[file.name]}
                                        alt={file.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                        <Lucide
                                          icon="ZoomIn"
                                          className="w-4 h-4 text-gray-700 dark:text-gray-300"
                                        />
                                      </div>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                      <Lucide
                                        icon="Plus"
                                        className="w-3 h-3 mr-1"
                                      />
                                      NEW
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEditingFile(file.name, "image");
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                      <Lucide icon="X" className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {editingVideos.map((file) => (
                                <div
                                  key={`new-video-${file.name}`}
                                  className="relative group"
                                >
                                  <div
                                    className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-2 border-purple-200 dark:border-purple-700 cursor-pointer"
                                    onClick={() =>
                                      handlePreviewClick(
                                        "video",
                                        previewUrls[file.name],
                                        file.name
                                      )
                                    }
                                  >
                                    <div className="aspect-square relative bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                                      <Lucide
                                        icon="Video"
                                        className="w-8 h-8 text-purple-600 dark:text-purple-400"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/60 rounded-full p-2">
                                          <Lucide
                                            icon="Play"
                                            className="w-4 h-4 text-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                      <Lucide
                                        icon="Plus"
                                        className="w-3 h-3 mr-1"
                                      />
                                      NEW
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                      <p className="text-white text-xs truncate font-medium">
                                        {file.name}
                                      </p>
                                      <p className="text-white/80 text-xs">
                                        {(file.size / 1024 / 1024).toFixed(1)}{" "}
                                        MB
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeVideo(file.name, true);
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                      <Lucide icon="X" className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {editingDocuments.map((file) => (
                                <div
                                  key={`new-document-${file.name}`}
                                  className="relative group"
                                >
                                  <div
                                    className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-blue-200 dark:border-blue-700 flex flex-col cursor-pointer"
                                    onClick={() =>
                                      handlePreviewClick(
                                        "document",
                                        previewUrls[file.name] || "",
                                        file.name
                                      )
                                    }
                                  >
                                    <div className="flex items-center justify-center h-12 mb-2">
                                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Lucide
                                          icon="FileText"
                                          className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex-1 text-center">
                                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024 / 1024).toFixed(1)}{" "}
                                        MB
                                      </p>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                      <Lucide
                                        icon="Plus"
                                        className="w-3 h-3 mr-1"
                                      />
                                      NEW
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEditingFile(
                                          file.name,
                                          "document"
                                        );
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                    >
                                      <Lucide icon="X" className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <button
                            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center font-medium"
                            onClick={() => {
                              setEditingReply(null);
                              setEditingDocuments([]);
                              setEditingImages([]);
                              setEditingVideos([]);
                              setPreviewUrls({});
                            }}
                          >
                            <Lucide icon="X" className="w-4 h-4 mr-2" />
                            Cancel
                          </button>
                          <button
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center font-medium shadow-lg hover:shadow-xl"
                            onClick={() =>
                              updateQuickReply(
                                reply.id,
                                editingReply.keyword || "",
                                editingReply.text || "",
                                editingReply.category || "",
                                editingReply.type
                              )
                            }
                          >
                            <Lucide icon="Save" className="w-4 h-4 mr-2" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-grow">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                {reply.keyword || reply.title || "Quick Reply"}
                              </span>
                              {reply.category && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                                  {reply.category}
                                </span>
                              )}
                              {reply.type && (
                                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                  {reply.type}
                                </span>
                              )}
                            </div>
                            {reply.text && (
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {reply.text}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              onClick={() => setEditingReply(reply)}
                            >
                              <Lucide icon="PencilLine" className="w-5 h-5" />
                            </button>
                            <button
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              onClick={() => deleteQuickReply(reply.id)}
                            >
                              <Lucide icon="Trash" className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {/* Attachments Section */}
                        {((reply.images && reply.images.length > 0) ||
                          (reply.documents && reply.documents.length > 0) ||
                          (reply.videos && reply.videos.length > 0)) && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center mb-3">
                              <Lucide
                                icon="Paperclip"
                                className="w-4 h-4 text-gray-500 mr-2"
                              />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                Attachments (
                                {(reply.images?.length || 0) +
                                  (reply.documents?.length || 0) +
                                  (reply.videos?.length || 0)}
                                )
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {reply.images?.map((image, index) => (
                                <div
                                  key={`image-${index}`}
                                  className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "image",
                                      image,
                                      `Image ${index + 1}`
                                    )
                                  }
                                >
                                  <div className="aspect-square">
                                    <img
                                      src={image}
                                      alt={`Quick Reply Image ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                      <Lucide
                                        icon="ZoomIn"
                                        className="w-5 h-5 text-gray-700 dark:text-gray-300"
                                      />
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    <Lucide icon="Image" className="w-3 h-3" />
                                  </div>
                                </div>
                              ))}
                              {reply.videos?.map((video, index) => (
                                <div
                                  key={`video-${index}`}
                                  className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "video",
                                      video.url,
                                      video.name
                                    )
                                  }
                                >
                                  <div className="aspect-square relative">
                                    {video.thumbnail ? (
                                      <img
                                        src={video.thumbnail}
                                        alt={`Video thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <Lucide
                                          icon="Video"
                                          className="w-8 h-8 text-gray-400"
                                        />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/60 rounded-full p-3 group-hover:bg-black/80 transition-colors">
                                        <Lucide
                                          icon="Play"
                                          className="w-6 h-6 text-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    <Lucide icon="Video" className="w-3 h-3" />
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                    <p className="text-white text-xs truncate font-medium">
                                      {video.name}
                                    </p>
                                    <p className="text-white/80 text-xs">
                                      {(video.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {reply.documents?.map((document, index) => (
                                <div
                                  key={`document-${index}`}
                                  className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col"
                                  onClick={() =>
                                    handlePreviewClick(
                                      "document",
                                      document.url,
                                      document.name
                                    )
                                  }
                                >
                                  <div className="flex items-center justify-center h-12 mb-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                      <Lucide
                                        icon="FileText"
                                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                      {document.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(document.size / 1024 / 1024).toFixed(1)}{" "}
                                      MB
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {previewModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() =>
              setPreviewModal((prev) => ({ ...prev, isOpen: false }))
            }
          >
            <div
              className="backdrop-blur-xl bg-white/25 dark:bg-slate-800/25 rounded-3xl shadow-2xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white/30 dark:border-slate-700/30"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/20 dark:border-slate-700/20">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-blue-300/30 dark:border-blue-600/30">
                    <Lucide
                      icon={
                        previewModal.type === "image"
                          ? "Image"
                          : previewModal.type === "video"
                          ? "Video"
                          : "File"
                      }
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent truncate max-w-md">
                      {previewModal.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {previewModal.type} Preview
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {previewModal.type !== "video" && (
                    <button
                      onClick={() => window.open(previewModal.url, "_blank")}
                      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/30 rounded-xl transition-all duration-200 backdrop-blur-sm"
                      title="Open in new tab"
                    >
                      <Lucide icon="ExternalLink" className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setPreviewModal((prev) => ({ ...prev, isOpen: false }))
                    }
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/30 rounded-xl transition-all duration-200 backdrop-blur-sm"
                    title="Close (ESC)"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div
                className="p-6 overflow-auto backdrop-blur-sm bg-white/10 dark:bg-slate-900/10"
                style={{ maxHeight: "calc(95vh - 120px)" }}
              >
                {previewModal.type === "image" ? (
                  <div className="flex justify-center items-center min-h-[400px]">
                    <img
                      src={previewModal.url}
                      alt={previewModal.title}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                      style={{ maxHeight: "75vh" }}
                    />
                  </div>
                ) : previewModal.type === "video" ? (
                  <div className="flex justify-center items-center min-h-[400px] bg-black/80 rounded-xl backdrop-blur-sm">
                    <video
                      src={previewModal.url}
                      controls
                      className="max-w-full max-h-full object-contain rounded-xl"
                      style={{ maxHeight: "75vh" }}
                      controlsList="nodownload"
                      playsInline
                      autoPlay={false}
                    />
                  </div>
                ) : (
                  <div className="backdrop-blur-sm bg-white/40 dark:bg-slate-800/40 rounded-xl shadow-xl border border-white/30 dark:border-slate-600/30">
                    <iframe
                      src={previewModal.url}
                      title={previewModal.title}
                      className="w-full rounded-xl"
                      style={{ height: "75vh", minHeight: "500px" }}
                      frameBorder="0"
                    />
                  </div>
                )}
              </div>

              {/* Footer for additional actions */}
              <div className="flex justify-between items-center p-4 border-t border-white/20 dark:border-slate-700/20 backdrop-blur-sm bg-white/10 dark:bg-slate-800/10">
                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                  <kbd className="px-2 py-1 backdrop-blur-sm bg-white/30 dark:bg-slate-700/30 rounded text-xs border border-white/40 dark:border-slate-600/40">
                    ESC
                  </kbd>
                  <span className="ml-2">to close</span>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={previewModal.url}
                    download={previewModal.title}
                    className="flex items-center px-4 py-2 text-sm backdrop-blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-blue-500/50 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Lucide icon="Download" className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl z-50">
            <div
              className="w-full max-w-lg relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-purple-500/5 to-blue-500/10 dark:from-indigo-600/10 dark:via-purple-700/5 dark:to-blue-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide icon="Tags" className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-100 to-purple-100 dark:from-white dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent">
                      Manage Categories
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-6">
                  {/* Add new category */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide icon="Plus" className="w-5 h-5 text-indigo-400" />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Add New Category
                      </label>
                    </div>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="flex-1 px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 shadow-inner"
                        onKeyPress={(e) => e.key === "Enter" && addCategory()}
                      />
                      <button
                        onClick={addCategory}
                        className="px-6 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:scale-105 flex items-center"
                      >
                        <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Category list */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide icon="List" className="w-5 h-5 text-purple-400" />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Existing Categories
                      </label>
                      <span className="text-xs text-white/60 dark:text-slate-400 bg-white/10 dark:bg-slate-700/20 backdrop-blur-xl px-3 py-1 rounded-full border border-white/20 dark:border-slate-600/20">
                        {categories.filter((cat) => cat !== "all").length}{" "}
                        categories
                      </span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categories
                        .filter((category) => category !== "all")
                        .map((category) => (
                          <div
                            key={category}
                            className="flex items-center justify-between p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl hover:bg-white/10 dark:hover:bg-slate-600/30 transition-all duration-200 group shadow-inner"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full shadow-sm"></div>
                              <span className="text-sm font-medium text-white/90 dark:text-slate-200">
                                {category}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteCategory(category)}
                              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10 hover:border-red-400/30"
                              title="Delete category"
                            >
                              <Lucide icon="Trash2" className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      {categories.filter((cat) => cat !== "all").length ===
                        0 && (
                        <div className="text-center py-12 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-600/20 shadow-inner">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 backdrop-blur-sm flex items-center justify-center border border-white/10 mx-auto mb-4">
                            <Lucide
                              icon="Tags"
                              className="w-8 h-8 text-slate-400 dark:text-slate-500"
                            />
                          </div>
                          <p className="text-sm font-medium text-white/70 dark:text-slate-400">
                            No categories yet
                          </p>
                          <p className="text-xs text-white/50 dark:text-slate-500 mt-1">
                            Add your first category above
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
};

export default QuickRepliesPage;