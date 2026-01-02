import React, { useState } from 'react';
import { X, UploadCloud, Shield, Image as ImageIcon } from 'lucide-react';
import { Button, Input } from './ui';

export default function UploadModal({ onClose, onPublish, initialStyles = [] }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    styles: initialStyles,
    sensitive: false,
    triggers: [],
  });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onPublish(form);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleArrayValue = (key, value) => {
    setForm((prev) => {
      const exists = prev[key].includes(value);
      return { ...prev, [key]: exists ? prev[key].filter((v) => v !== value) : [...prev[key], value] };
    });
  };

  const themeOptions = ['Nature', 'Fashion', 'Street', 'Portrait', 'Minimalist', 'Conceptual'];
  const triggerOptions = ['Naakt (Artistiek)', 'Naakt (Expliciet)', 'Bloed / Gore', 'Geweld'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Upload</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nieuwe post</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Titel" placeholder="Titel van je werk" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Image URL" placeholder="https://" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <Input
            label="Beschrijving"
            multiline
            placeholder="Credits, concept, gear..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Stijlen</p>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((style) => (
                  <button
                    type="button"
                    key={style}
                    onClick={() => toggleArrayValue('styles', style)}
                    className={`px-3 py-2 rounded-full text-sm border ${form.styles.includes(style) ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Shield size={16} /> Triggers
              </p>
              <div className="flex flex-wrap gap-2">
                {triggerOptions.map((trigger) => (
                  <button
                    type="button"
                    key={trigger}
                    onClick={() => toggleArrayValue('triggers', trigger)}
                    className={`px-3 py-2 rounded-full text-sm border ${form.triggers.includes(trigger) ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.sensitive}
                onChange={(e) => setForm({ ...form, sensitive: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Markeer als gevoelig
            </label>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <UploadCloud size={14} /> Bewaar direct in Firestore
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} className="justify-center">
              Annuleren
            </Button>
            <Button type="submit" className="justify-center">
              <ImageIcon size={16} /> Plaats post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

