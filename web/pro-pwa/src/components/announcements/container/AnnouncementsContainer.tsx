
import React, { useState, useMemo, useEffect } from "react";
import CollapsibleAnnouncementFilters from "../CollapsibleAnnouncementFilters";
import AnnouncementsTabs from "../AnnouncementsTabs";
import { useAnnouncementsWithDistance } from "@/hooks/useAnnouncementsWithDistance";
import { useFilteringLogic } from "@/hooks/useFilteringLogic";
import { FilterStatusIndicator } from "./FilterStatusIndicator";
import { AnnouncementsList } from "./AnnouncementsList";

const AnnouncementsContainer = () => {
  const [activeTab, setActiveTab] = useState("all");
  
  const {
    filters,
    userLocation,
    currentFilteringMode,
    professionalAreas,
    showExpandButton,
    setShowExpandButton,
    handleLocationUpdate,
    handleCityCoordinatesUpdate,
    handleFiltersChange,
    handleExpandToAllCountry,
    getFilteringStatusMessage
  } = useFilteringLogic();

  const { announcements, isLoading, error } = useAnnouncementsWithDistance({
    filters,
    userLocation
  });

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;
    
    if (activeTab !== "all") {
      filtered = filtered.filter(announcement => announcement.type === activeTab);
    }
    
    return filtered;
  }, [announcements, activeTab]);

  // Update show expand button logic - only show when in work areas mode and results are few
  useEffect(() => {
    if (currentFilteringMode === "work_areas" && !isLoading) {
      setShowExpandButton(filteredAnnouncements.length < 5);
    } else {
      setShowExpandButton(false);
    }
  }, [currentFilteringMode, filteredAnnouncements.length, isLoading, setShowExpandButton]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterStatusIndicator
        currentFilteringMode={currentFilteringMode}
        filters={filters}
        professionalAreas={professionalAreas}
        showExpandButton={showExpandButton}
        onExpandToAllCountry={handleExpandToAllCountry}
      />

      <CollapsibleAnnouncementFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onLocationUpdate={handleLocationUpdate}
        onCityCoordinatesUpdate={handleCityCoordinatesUpdate}
        isLoading={isLoading}
      />

      <AnnouncementsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AnnouncementsList
        announcements={filteredAnnouncements}
        isLoading={isLoading}
        currentFilteringMode={currentFilteringMode}
        filters={filters}
        showExpandButton={showExpandButton}
        onExpandToAllCountry={handleExpandToAllCountry}
        getFilteringStatusMessage={getFilteringStatusMessage}
      />
    </div>
  );
};

export default AnnouncementsContainer;
