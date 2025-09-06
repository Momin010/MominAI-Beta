import { useState } from 'react';

export interface IdeState {
  files: Record<string, string>;
  openTabs: string[];
  activeTab: string | null;
  status: string;
}

export function useIdeState(): IdeState {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Ready');

  // Note: This is a basic implementation. In a real app, you might want to integrate with a global state or API.

  return {
    files,
    openTabs,
    activeTab,
    status,
  };
}