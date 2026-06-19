import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Trash2, RefreshCw, Eye, EyeOff, FileText, Send as SendIcon,
  Loader2, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, X
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  header: any;
  body_text: string | null;
  footer: string | null;
  buttons: any;
  variables: any;
  components: any[] | null;
  meta_template_id: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Contact fields available for variable mapping
const CONTACT_FIELDS = ['name', 'phone_number', 'city', 'state', 'lead_type', 'source', 'notes'] as const;

const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ms', label: 'Malay' },
  { code: 'ru', label: 'Russian' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'zh_CN', label: 'Chinese (Simplified)' },
];

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';

interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
}

interface BuilderState {
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  headerType: 'none' | 'text' | 'image' | 'video' | 'document';
  headerText: string;
  headerMediaUrl: string;
  body: string;
  footer: string;
  buttons: TemplateButton[];
  exampleValues: Record<string, string>;
}

const initialBuilder: BuilderState = {
  name: '',
  language: 'en_US',
  category: 'marketing',
  headerType: 'none',
  headerText: '',
  headerMediaUrl: '',
  body: '',
  footer: '',
  buttons: [],
  exampleValues: {},
};

export function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [builder, setBuilder] = useState<BuilderState>(initialBuilder);

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setTemplates((data || []) as Template[]);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-template', {
        body: { action: 'sync' },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `Synced ${data.synced} templates${data.deleted ? `, ${data.deleted} removed` : ''}` });
      fetchTemplates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (templateId: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This will also remove it from Meta.`)) return;
    setDeletingId(templateId);
    try {
      const { error } = await supabase.functions.invoke('manage-template', {
        body: { action: 'delete', template_id: templateId, name },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `Template "${name}" deleted` });
      fetchTemplates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Builder logic ───

  // Extract {{N}} variables from body text
  const bodyVariables = useMemo(() => {
    const matches = builder.body.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  }, [builder.body]);

  const headerVariables = useMemo(() => {
    if (builder.headerType !== 'text') return [];
    const matches = builder.headerText.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].sort();
  }, [builder.headerText, builder.headerType]);

  const allVariables = useMemo(() => {
    return [...new Set([...headerVariables, ...bodyVariables])].sort();
  }, [headerVariables, bodyVariables]);

  const addButton = () => {
    if (builder.buttons.length >= 10) return;
    setBuilder({
      ...builder,
      buttons: [...builder.buttons, { type: 'QUICK_REPLY', text: '' }],
    });
  };

  const removeButton = (idx: number) => {
    setBuilder({
      ...builder,
      buttons: builder.buttons.filter((_, i) => i !== idx),
    });
  };

  const updateButton = (idx: number, updates: Partial<TemplateButton>) => {
    const newButtons = [...builder.buttons];
    newButtons[idx] = { ...newButtons[idx], ...updates };
    setBuilder({ ...builder, buttons: newButtons });
  };

  const buildComponents = (): any[] => {
    const components: any[] = [];

    // Header
    if (builder.headerType === 'text' && builder.headerText) {
      const comp: any = { type: 'HEADER', format: 'TEXT', text: builder.headerText };
      if (headerVariables.length > 0) {
        comp.example = { header_text: headerVariables.map(v => builder.exampleValues[`header_${v}`] || 'example') };
      }
      components.push(comp);
    } else if (['image', 'video', 'document'].includes(builder.headerType) && builder.headerMediaUrl) {
      components.push({
        type: 'HEADER',
        format: builder.headerType.toUpperCase(),
        example: { header_handle: [builder.headerMediaUrl] },
      });
    }

    // Body
    if (builder.body) {
      const comp: any = { type: 'BODY', text: builder.body };
      if (bodyVariables.length > 0) {
        comp.example = {
          body_text: [bodyVariables.map(v => builder.exampleValues[`body_${v}`] || 'example')],
        };
      }
      components.push(comp);
    }

    // Footer
    if (builder.footer) {
      components.push({ type: 'FOOTER', text: builder.footer });
    }

    // Buttons
    if (builder.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: builder.buttons.map(b => {
          const btn: any = { type: b.type, text: b.text };
          if (b.type === 'URL' && b.url) btn.url = b.url;
          if (b.type === 'PHONE_NUMBER' && b.phone_number) btn.phone_number = b.phone_number;
          return btn;
        }),
      });
    }

    return components;
  };

  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builder.name || !builder.body) {
      setMessage({ type: 'error', text: 'Template name and body are required' });
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(builder.name)) {
      setMessage({ type: 'error', text: 'Name must be lowercase letters, digits, underscores, starting with a letter' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const components = buildComponents();
      const { data, error } = await supabase.functions.invoke('manage-template', {
        body: {
          action: 'create',
          name: builder.name,
          language: builder.language,
          category: builder.category,
          components,
        },
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `Template "${builder.name}" submitted for approval` });
      setShowBuilder(false);
      setBuilder(initialBuilder);
      fetchTemplates();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status badge ───
  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" /><span>Approved</span>
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" /><span>Pending</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" /><span>Rejected</span>
          </span>
        );
      case 'deleted':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-medium">
            <Trash2 className="h-3 w-3" /><span>Deleted</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'marketing': return 'Marketing';
      case 'utility': return 'Utility';
      case 'authentication': return 'Authentication';
      default: return cat;
    }
  };

  // ─── Live Preview ───
  const PreviewBubble = () => {
    const previewBody = builder.body.replace(
      /\{\{(\d+)\}\}/g,
      (_, n) => builder.exampleValues[`body_{{${n}}}`] || `{{${n}}}`
    );
    const previewHeader = builder.headerText.replace(
      /\{\{(\d+)\}\}/g,
      (_, n) => builder.exampleValues[`header_{{${n}}}`] || `{{${n}}}`
    );

    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">Live Preview</p>
        <div className="bg-[#005c4b] rounded-lg p-3 max-w-xs ml-auto">
          {builder.headerType === 'text' && previewHeader && (
            <p className="text-white font-semibold text-sm mb-1">{previewHeader}</p>
          )}
          {['image', 'video', 'document'].includes(builder.headerType) && (
            <div className="bg-gray-700/50 rounded p-3 mb-2 text-center text-gray-400 text-xs">
              [{builder.headerType.toUpperCase()} HEADER]
            </div>
          )}
          {previewBody && (
            <p className="text-white text-sm whitespace-pre-wrap">{previewBody}</p>
          )}
          {builder.footer && (
            <p className="text-gray-300/60 text-xs mt-2">{builder.footer}</p>
          )}
          {builder.buttons.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              {builder.buttons.map((btn, i) => (
                <div key={i} className="text-center text-blue-300 text-sm py-1 bg-white/5 rounded">
                  {btn.text || '(button)'}
                </div>
              ))}
            </div>
          )}
          {!previewBody && !previewHeader && (
            <p className="text-gray-300/40 text-sm italic">Start typing to preview...</p>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-2 text-right">WhatsApp-style preview</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Message Templates</h1>
          <p className="text-gray-400 text-sm mt-1">{templates.length} templates</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg font-medium transition-colors border border-gray-600"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync from Meta'}</span>
          </button>
          <button
            onClick={() => { setBuilder(initialBuilder); setShowBuilder(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Template List */}
      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-0.5">
                    <h3 className="text-white font-semibold truncate">{t.name}</h3>
                    {statusBadge(t.status)}
                  </div>
                  <p className="text-gray-400 text-sm">
                    {categoryLabel(t.category)} • {t.language}
                    {t.rejected_reason && (
                      <span className="text-red-400 ml-2" title={t.rejected_reason}>
                        — {t.rejected_reason}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="View details"
                >
                  {expandedId === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={deletingId === t.id}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Delete"
                >
                  {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === t.id && (
              <div className="px-5 pb-5 pt-0 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    {t.header && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Header</p>
                        <p className="text-gray-200 text-sm">
                          [{t.header.format}] {t.header.text || '(media)'}
                        </p>
                      </div>
                    )}
                    {t.body_text && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Body</p>
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{t.body_text}</p>
                      </div>
                    )}
                    {t.footer && (
                      <div className="mb-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Footer</p>
                        <p className="text-gray-300 text-sm">{t.footer}</p>
                      </div>
                    )}
                    {t.buttons && t.buttons.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Buttons</p>
                        <div className="space-y-1">
                          {t.buttons.map((btn: any, i: number) => (
                            <p key={i} className="text-gray-200 text-sm">
                              [{btn.type}] {btn.text} {btn.url ? `→ ${btn.url}` : ''} {btn.phone_number ? `→ ${btn.phone_number}` : ''}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Raw Components</p>
                    <pre className="text-gray-300 text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(t.components || [], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No templates yet</p>
            <p className="text-gray-500 text-sm mt-1">Create one or sync from Meta</p>
          </div>
        )}
      </div>

      {/* ─── Builder Modal ─── */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl w-full max-w-5xl my-8 border border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">New Template</h2>
              <button onClick={() => setShowBuilder(false)} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitTemplate}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                {/* Left: Form fields */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Name + Language + Category */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={builder.name}
                        onChange={(e) => setBuilder({ ...builder, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                        placeholder="e.g. order_confirmation"
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm"
                        required
                      />
                      <p className="text-gray-500 text-xs mt-0.5">Lowercase, underscores only</p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">Language</label>
                      <select
                        value={builder.language}
                        onChange={(e) => setBuilder({ ...builder, language: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 outline-none text-sm"
                      >
                        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-1">Category</label>
                      <select
                        value={builder.category}
                        onChange={(e) => setBuilder({ ...builder, category: e.target.value as any })}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 outline-none text-sm"
                      >
                        <option value="marketing">Marketing</option>
                        <option value="utility">Utility</option>
                        <option value="authentication">Authentication</option>
                      </select>
                    </div>
                  </div>

                  {/* Header */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Header (optional)</label>
                    <div className="flex items-center space-x-3 mb-2">
                      {(['none', 'text', 'image', 'video', 'document'] as const).map((ht) => (
                        <label key={ht} className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="headerType"
                            value={ht}
                            checked={builder.headerType === ht}
                            onChange={() => setBuilder({ ...builder, headerType: ht, headerText: '', headerMediaUrl: '' })}
                            className="text-green-500 focus:ring-green-500"
                          />
                          <span className="text-gray-300 text-sm capitalize">{ht}</span>
                        </label>
                      ))}
                    </div>
                    {builder.headerType === 'text' && (
                      <input
                        type="text"
                        value={builder.headerText}
                        onChange={(e) => setBuilder({ ...builder, headerText: e.target.value })}
                        placeholder="Header text (max 60 chars, supports {{1}})"
                        maxLength={60}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 outline-none text-sm"
                      />
                    )}
                    {['image', 'video', 'document'].includes(builder.headerType) && (
                      <input
                        type="url"
                        value={builder.headerMediaUrl}
                        onChange={(e) => setBuilder({ ...builder, headerMediaUrl: e.target.value })}
                        placeholder="Paste public URL for example media asset"
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 outline-none text-sm"
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1">
                      Body <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={builder.body}
                      onChange={(e) => setBuilder({ ...builder, body: e.target.value })}
                      placeholder="Hello {{1}}, your order {{2}} is ready for pickup!"
                      rows={5}
                      maxLength={1024}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none text-sm resize-none"
                      required
                    />
                    <div className="flex items-center justify-between text-xs mt-1">
                      <p className="text-gray-500">Use {'{{1}}'}, {'{{2}}'}, ... for variables</p>
                      <p className="text-gray-500">{builder.body.length}/1024</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1">Footer (optional)</label>
                    <input
                      type="text"
                      value={builder.footer}
                      onChange={(e) => setBuilder({ ...builder, footer: e.target.value })}
                      placeholder="e.g. Powered by ReachPeak"
                      maxLength={60}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2.5 border border-gray-600 focus:border-green-500 outline-none text-sm"
                    />
                  </div>

                  {/* Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-gray-300 text-sm font-medium">Buttons (optional)</label>
                      <button
                        type="button"
                        onClick={addButton}
                        disabled={builder.buttons.length >= 10}
                        className="text-green-400 hover:text-green-300 text-xs font-medium disabled:opacity-50"
                      >
                        + Add Button
                      </button>
                    </div>
                    {builder.buttons.map((btn, i) => (
                      <div key={i} className="flex items-start space-x-2 mb-2">
                        <select
                          value={btn.type}
                          onChange={(e) => updateButton(i, { type: e.target.value as ButtonType })}
                          className="bg-gray-700 text-white rounded-lg px-2 py-2 border border-gray-600 text-sm w-36"
                        >
                          <option value="QUICK_REPLY">Quick Reply</option>
                          <option value="URL">URL</option>
                          <option value="PHONE_NUMBER">Phone</option>
                        </select>
                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => updateButton(i, { text: e.target.value })}
                          placeholder="Button text"
                          className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm"
                        />
                        {btn.type === 'URL' && (
                          <input
                            type="url"
                            value={btn.url || ''}
                            onChange={(e) => updateButton(i, { url: e.target.value })}
                            placeholder="https://..."
                            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm"
                          />
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <input
                            type="text"
                            value={btn.phone_number || ''}
                            onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                            placeholder="+91..."
                            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 text-sm"
                          />
                        )}
                        <button type="button" onClick={() => removeButton(i)} className="text-red-400 hover:text-red-300 p-2">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Example values for variables */}
                  {allVariables.length > 0 && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-300 text-sm font-medium mb-2">
                        Example Values (required by Meta for review)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {allVariables.map((v) => {
                          const section = headerVariables.includes(v) ? 'header' : 'body';
                          const key = `${section}_${v}`;
                          return (
                            <div key={key}>
                              <label className="text-gray-400 text-xs">{section} {v}</label>
                              <input
                                type="text"
                                value={builder.exampleValues[key] || ''}
                                onChange={(e) => setBuilder({
                                  ...builder,
                                  exampleValues: { ...builder.exampleValues, [key]: e.target.value },
                                })}
                                placeholder={`Example for ${v}`}
                                className="w-full bg-gray-600 text-white rounded px-3 py-1.5 border border-gray-500 text-sm mt-0.5"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Live Preview */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4">
                    <PreviewBubble />
                  </div>
                </div>
              </div>

              {/* Submit footer */}
              <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                  <span>{submitting ? 'Submitting...' : 'Submit to Meta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Export contact fields for use in Campaigns.tsx variable mapper
export { CONTACT_FIELDS };
