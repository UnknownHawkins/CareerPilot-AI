'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Sleek formal background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-lg flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">CareerPilot AI</span>
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Professional AI-powered career coach platform</p>
        </div>

        <SignUp 
          appearance={{
            elements: {
              rootBox: "w-full shadow-2xl rounded-xl border border-border/80 bg-card overflow-hidden",
              card: "shadow-none p-6 md:p-8 bg-card w-full",
              headerTitle: "text-foreground font-bold text-xl",
              headerSubtitle: "text-muted-foreground text-sm",
              socialButtonsBlockButton: "border border-input hover:bg-accent text-foreground transition-all duration-200",
              formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium py-2 rounded-md shadow-md",
              formFieldLabel: "text-foreground font-medium text-xs uppercase tracking-wider",
              formFieldInput: "bg-background border border-input rounded-md text-foreground focus:ring-ring focus:border-ring",
              footerActionLink: "text-primary hover:underline hover:text-primary/90",
              identityPreviewText: "text-foreground",
              identityPreviewEditButtonIcon: "text-muted-foreground hover:text-foreground",
            }
          }}
        />
      </motion.div>
    </div>
  );
}
