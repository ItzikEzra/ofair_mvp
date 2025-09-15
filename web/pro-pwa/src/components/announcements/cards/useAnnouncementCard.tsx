
import { useState, useMemo, useCallback } from 'react';
import { Announcement } from '@/types/announcements';
import { debugLog } from '@/utils/debugLogger';

export const useAnnouncementCard = (announcement: Announcement) => {
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Memoized media array to prevent unnecessary recalculations
  const mediaArray = useMemo(() => {
    let mediaArray: string[] = [];
    
    debugLog.info("Getting media for announcement:", {
      id: announcement.id,
      type: announcement.type,
      hasImageUrls: !!announcement.image_urls,
      hasMediaUrls: !!announcement.media_urls,
      hasSingleImage: !!announcement.image_url
    });
    
    if (announcement.type === 'lead') {
      // For leads: check image_urls first (correct field from database)
      if (Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0) {
        mediaArray = announcement.image_urls.filter(url => url && url.trim() !== '');
        debugLog.info("Found image_urls for lead:", mediaArray.length);
      } else if (announcement.image_url && announcement.image_url.trim() !== '') {
        // fallback to old field
        mediaArray = [announcement.image_url];
        debugLog.info("Using single image_url for lead");
      }
    } else if (announcement.type === 'request') {
      // For requests: check media_urls (correct field from database)
      if (Array.isArray(announcement.media_urls) && announcement.media_urls.length > 0) {
        mediaArray = announcement.media_urls.filter(url => url && url.trim() !== '');
        debugLog.info("Found media_urls for request:", mediaArray.length);
      } else if (Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0) {
        // fallback to image_urls if exists
        mediaArray = announcement.image_urls.filter(url => url && url.trim() !== '');
        debugLog.info("Using image_urls for request:", mediaArray.length);
      }
    }
    
    // Remove duplicates and empty data
    const filteredArray = Array.from(new Set(mediaArray.filter(url => url && url.trim() !== '')));
    
    debugLog.info("Final media array size:", filteredArray.length);
    
    return filteredArray;
  }, [announcement.id, announcement.type, announcement.image_urls, announcement.media_urls, announcement.image_url]);

  // Memoized event handlers
  const handleViewDetails = useCallback(() => {
    setIsDetailModalOpen(true);
  }, []);

  const handleSubmitProposalFromModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setIsProposalDialogOpen(true);
  }, []);

  return {
    mediaArray,
    isProposalDialogOpen,
    setIsProposalDialogOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    handleViewDetails,
    handleSubmitProposalFromModal
  };
};
