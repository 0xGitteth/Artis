import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from './ui';

export default function ChatStub() {
  return (
    <div className="p-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg shadow-slate-900/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200">
          <MessageCircle />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.08em] text-slate-400">Chat</p>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Realtime chat</h3>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-300 mb-4">Chat komt binnenkort. Laat alvast een bericht achter en we pingen je zodra het live is.</p>
      <Button variant="secondary" className="justify-center w-full">
        Coming soon
      </Button>
    </div>
  );
}

