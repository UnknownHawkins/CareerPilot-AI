'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { FileText, MessageSquare, Linkedin, Briefcase, ArrowRight } from 'lucide-react';

const actions = [
  {
    title: 'Analyze Resume',
    description: 'Upload and get ATS score',
    icon: FileText,
    href: '/resume',
    color: 'bg-blue-500',
  },
  {
    title: 'Practice Interview',
    description: 'Start a mock session',
    icon: MessageSquare,
    href: '/interview',
    color: 'bg-green-500',
  },
  {
    title: 'Optimize LinkedIn',
    description: 'Review your profile',
    icon: Linkedin,
    href: '/linkedin',
    color: 'bg-blue-700',
  },
  {
    title: 'Find Jobs',
    description: 'Match with opportunities',
    icon: Briefcase,
    href: '/jobs',
    color: 'bg-purple-500',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{action.title}</h4>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
