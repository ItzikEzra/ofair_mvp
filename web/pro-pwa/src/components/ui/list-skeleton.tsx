import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
}

const ListSkeleton: React.FC<ListSkeletonProps> = ({ count = 6 }) => {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-brand-neutral200/50 bg-white/80 backdrop-blur-sm p-4 shadow-soft-sm">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-5/6 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ListSkeleton;



