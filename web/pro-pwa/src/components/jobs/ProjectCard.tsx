
import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProjectType } from "@/types/jobs";
import { getStatusBadge } from "@/utils/statusHelpers";

interface ProjectCardProps {
  project: ProjectType;
  onUpdateStatus: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onUpdateStatus }) => {
  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-white backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-black/5 border border-gray-200/60 transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02] hover:-translate-y-1" dir="rtl">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg text-gray-800">{project.title}</h3>
        {getStatusBadge(project.status)}
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium text-gray-700">לקוח:</span> {project.client}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-700">תאריך התחלה:</span>
            <div className="text-gray-600">{project.startDate}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">תאריך סיום:</span>
            <div className="text-gray-600">{project.endDate}</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">התקדמות:</span>
          <span className="font-bold text-blue-600">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2" />
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
        <span className="font-bold text-xl text-green-600">
          {project.price.toLocaleString()} ₪
        </span>
        {project.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpdateStatus}
            className="bg-white/80 hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800 transition-all duration-200"
          >
            עדכן סטטוס
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
