import React, { useState, useEffect } from "react";
import { MessageSquare, Trophy, Star, Wallet } from "lucide-react";
import { Professional } from "@/types/profile";
import { useNavigate } from "react-router-dom";
import { StatsService } from "@/services/statsService";

interface StatsSectionProps {
  professionalData: Professional | null;
}

const StatsSection: React.FC<StatsSectionProps> = ({
  professionalData
}) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeLeads: 0,
    winningProposals: 0,
    averageRating: 0,
    estimatedEarnings: "0 ₪"
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!professionalData?.id) return;
      
      setIsLoading(true);
      const data = await StatsService.getDashboardStats(professionalData.id);
      setStats({
        activeLeads: data.activeLeads,
        winningProposals: data.acceptedProposals,
        averageRating: data.averageRating,
        estimatedEarnings: data.estimatedEarnings
      });
      setIsLoading(false);
    };

    fetchStats();
  }, [professionalData?.id]);

  const handleStatClick = (statTitle: string) => {
    switch (statTitle) {
      case "לידים פעילים":
        navigate("/my-leads");
        break;
      case "הצעות שזכו":
        navigate("/my-jobs?tab=proposals");
        break;
      case "דירוג ממוצע":
        navigate("/ratings");
        break;
      case "רווח נטו חודשי":
        navigate("/payments");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-emerald-100">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [{
    title: "לידים פעילים",
    value: stats.activeLeads,
    icon: <MessageSquare />,
    bgColor: "bg-blue-500"
  }, {
    title: "הצעות שזכו",
    value: stats.winningProposals,
    icon: <Trophy />,
    bgColor: "bg-ofair-turquoise"
  }, {
    title: "דירוג ממוצע",
    value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "0.0",
    icon: <Star />,
    bgColor: "bg-amber-400"
  }, {
    title: "רווח נטו חודשי",
    value: stats.estimatedEarnings,
    icon: <Wallet />,
    bgColor: "bg-green-500"
  }];
  const earningsStats = statsData.find(stat => stat.title === "רווח נטו חודשי");
  const otherStats = statsData.filter(stat => stat.title !== "רווח נטו חודשי");
  return (
    <div className="space-y-4 mb-8">
      {/* Monthly Earnings - Hero Card */}
      {earningsStats && (
        <div 
          className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl p-6 shadow-lg border border-emerald-100 cursor-pointer hover:shadow-xl transition-all duration-300"
          onClick={() => handleStatClick(earningsStats.title)}
        >
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-md">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">
                    {earningsStats.title}
                  </h3>
                  <p className="text-sm text-emerald-600">
                    הכנסות החודש הנוכחי
                  </p>
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-900 mb-2">
              {earningsStats.value}
            </div>
          </div>
        </div>
      )}

      {/* Other Stats - Modern Cards */}
      <div className="grid grid-cols-3 gap-3">
        {otherStats.map((stat, index) => {
          const colors = [{
            bg: "from-blue-50 via-indigo-50 to-purple-50",
            border: "border-blue-100",
            iconBg: "from-blue-400 to-indigo-500",
            text: "text-blue-900",
            accent: "from-blue-200/40 to-indigo-200/40"
          }, {
            bg: "from-amber-50 via-orange-50 to-red-50",
            border: "border-amber-100",
            iconBg: "from-amber-400 to-orange-500",
            text: "text-amber-900",
            accent: "from-amber-200/40 to-orange-200/40"
          }, {
            bg: "from-purple-50 via-pink-50 to-rose-50",
            border: "border-purple-100",
            iconBg: "from-purple-400 to-pink-500",
            text: "text-purple-900",
            accent: "from-purple-200/40 to-pink-200/40"
          }];
          const color = colors[index % colors.length];
          return (
            <div 
              key={index} 
              className={`relative overflow-hidden bg-gradient-to-br ${color.bg} rounded-2xl p-4 shadow-sm border ${color.border} hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-[1.02]`}
              onClick={() => handleStatClick(stat.title)}
            >
              <div className={`absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br ${color.accent} rounded-full blur-lg`}></div>
              <div className="relative z-10">
                <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br ${color.iconBg} rounded-xl shadow-sm mb-3`}>
                  <div className="text-white text-sm">
                    {stat.icon}
                  </div>
                </div>
                <div className={`text-2xl font-bold ${color.text} mb-1`}>
                  {stat.value}
                </div>
                <div className={`text-xs ${color.text} opacity-70 leading-tight`}>
                  {stat.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsSection;