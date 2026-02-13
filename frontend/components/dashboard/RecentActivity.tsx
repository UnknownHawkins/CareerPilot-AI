'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import { FileText, MessageSquare, Linkedin, Briefcase, Map, Clock } from 'lucide-react';

const activityIcons = {
  resume: FileText,
  interview: MessageSquare,
  linkedin: Linkedin,
  job: Briefcase,
  roadmap: Map,
};

const activityColors = {
  resume: 'bg-blue-500',
  interview: 'bg-green-500',
  linkedin: 'bg-blue-700',
  job: 'bg-purple-500',
  roadmap: 'bg-orange-500',
};

// Mock activities - in real app, this would come from API
const mockActivities = [
  {
    id: '1',
    type: 'resume',
    title: 'Resume analyzed',
    description: 'ATS Score: 78%',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'interview',
    title: 'Mock interview completed',
    description: 'Score: 85%',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    type: 'job',
    title: 'New job match found',
    description: 'Senior Frontend Developer at TechCorp',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    type: 'roadmap',
    title: 'Milestone completed',
    description: 'Learn TypeScript Advanced Patterns',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons];
            const colorClass = activityColors[activity.type as keyof typeof activityColors];
            
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
