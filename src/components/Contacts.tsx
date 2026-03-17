import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Search, Filter, CreditCard as Edit2, Trash2, Ban, Download, Plus, Users, Tag, X, Hash } from 'lucide-react';
import type { Database } from '../lib/database.types';
import * as XLSX from 'xlsx';

type Contact = Database['public']['Tables']['contacts']['Row'] & { user_id?: string };
type Campaign = Database['public']['Tables']['campaigns']['Row'];
type TagType = Database['public']['Tables']['tags']['Row'];

type AddMode = 'single' | 'bulk' | 'csv';

export function Contacts() {
  const { isAdmin, user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Add contact modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('single');

  // Single add form
  const [singleForm, setSingleForm] = useState({
    phone_number: '', name: '', city: '', state: '',
    source: 'Manual' as Contact['source'],
  });

  // Bulk paste
  const [bulkText, setBulkText] = useState('');
  const [bulkSource, setBulkSource] = useState<Contact['source']>('Manual');

  // CSV upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    source: 'Excel' as Contact['source'],
    campaign_id: '',
  });

  // Bulk assign
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignCampaignId, setBulkAssignCampaignId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);

  // Edit
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Tags
  const [tags, setTags] = useState<TagType[]>([]);
  const [contactTags, setContactTags] = useState<Record<string, TagType[]>>({});
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [showAssignTagModal, setShowAssignTagModal] = useState(false);
  const [assignTagContactId, setAssignTagContactId] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);

  const TAG_COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  ];

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('contacts').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });

    if (filterSource) query = query.eq('source', filterSource as Contact['source']);
    if (filterCampaign) query = query.eq('campaign_id', filterCampaign);
    if (searchTerm) query = query.or(`phone_number.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);

    const { data } = await query.limit(200);
    let contactsList = data || [];

    // Fetch campaigns
    const { data: campaignsData } = await supabase.from('campaigns').select('id, name').eq('user_id', user!.id).order('name');
    setCampaigns((campaignsData || []) as Campaign[]);

    // Fetch tags
    const { data: tagsData } = await supabase.from('tags').select('*').eq('user_id', user!.id).order('name');
    setTags(tagsData || []);

    // Fetch contact_tags for displayed contacts
    if (contactsList.length > 0) {
      const ids = contactsList.map(c => c.id);
      const { data: ctData } = await supabase
        .from('contact_tags')
        .select('contact_id, tag_id')
        .eq('user_id', user!.id)
        .in('contact_id', ids);

      const tagMap: Record<string, TagType[]> = {};
      const allTags = tagsData || [];
      (ctData || []).forEach((ct: any) => {
        const tag = allTags.find(t => t.id === ct.tag_id);
        if (tag) {
          if (!tagMap[ct.contact_id]) tagMap[ct.contact_id] = [];
          tagMap[ct.contact_id].push(tag);
        }
      });
      setContactTags(tagMap);

      // Filter by tag if selected
      if (filterTag) {
        const taggedIds = new Set((ctData || []).filter((ct: any) => ct.tag_id === filterTag).map((ct: any) => ct.contact_id));
        contactsList = contactsList.filter(c => taggedIds.has(c.id));
      }
    }

    setContacts(contactsList);

    // Unassigned count
    const { count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .is('campaign_id', null);
    setUnassignedCount(count || 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${user!.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterSource, filterCampaign, searchTerm, filterTag]);

  // ====== SINGLE ADD ======
  const handleSingleAdd = async () => {
    const phone = singleForm.phone_number.replace(/\D/g, '');
    if (!phone || phone.length < 10) { alert('Please enter a valid phone number (min 10 digits)'); return; }

    try {
      const { error } = await supabase.from('contacts').insert({
        phone_number: phone,
        name: singleForm.name || null,
        city: singleForm.city || null,
        state: singleForm.state || null,
        source: singleForm.source,
        user_id: user!.id,
      });
      if (error) throw error;
      alert('Contact added successfully!');
      setSingleForm({ phone_number: '', name: '', city: '', state: '', source: 'Manual' });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // ====== BULK PASTE ======
  const handleBulkPaste = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { alert('Please paste at least one phone number'); return; }

    try {
      const parsed = lines.map(line => {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        const phone = (parts[0] || '').replace(/\D/g, '');
        const name = parts[1] || null;
        return { phone, name };
      }).filter(p => p.phone.length >= 10);

      if (parsed.length === 0) { alert('No valid phone numbers found (min 10 digits)'); return; }

      // Deduplicate
      const seen = new Set<string>();
      const unique = parsed.filter(p => { if (seen.has(p.phone)) return false; seen.add(p.phone); return true; });

      // Check existing
      const { data: existing } = await supabase
        .from('contacts').select('phone_number').eq('user_id', user!.id)
        .in('phone_number', unique.map(u => u.phone));
      const existingSet = new Set((existing || []).map(c => c.phone_number));
      const toInsert = unique.filter(u => !existingSet.has(u.phone));

      if (toInsert.length === 0) {
        alert(`All ${unique.length} contacts already exist.`);
        return;
      }

      const { error } = await supabase.from('contacts').insert(
        toInsert.map(c => ({
          phone_number: c.phone,
          name: c.name,
          source: bulkSource,
          user_id: user!.id,
        }))
      );
      if (error) throw error;

      let msg = `Added ${toInsert.length} contacts.`;
      if (existingSet.size > 0) msg += ` ${existingSet.size} already existed.`;
      if (unique.length < lines.length) msg += ` ${lines.length - unique.length} duplicates in paste skipped.`;
      alert(msg);
      setBulkText('');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // ====== CSV UPLOAD ======
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      let rows: any[] = [];

      if (ext === 'csv') {
        const text = await selectedFile.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV file is empty');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          rows.push(row);
        }
      } else if (ext === 'xlsx' || ext === 'xls') {
        const data = await selectedFile.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' }).map((row: any) => {
          const nr: any = {};
          Object.keys(row).forEach(k => { nr[k.toLowerCase().trim()] = row[k]; });
          return nr;
        });
      } else { throw new Error('Use CSV, XLS, or XLSX files'); }

      if (rows.length === 0) throw new Error('No data found');

      const phoneKey = Object.keys(rows[0]).find(k => k.includes('phone'));
      const nameKey = Object.keys(rows[0]).find(k => k.includes('name'));
      const cityKey = Object.keys(rows[0]).find(k => k.includes('city'));
      const stateKey = Object.keys(rows[0]).find(k => k.includes('state'));
      if (!phoneKey) throw new Error('No "phone" column found in file');

      const contactsMap = new Map();
      let invalid = 0;
      for (const row of rows) {
        const phone = String(row[phoneKey] || '').replace(/\D/g, '');
        if (!phone || phone.length < 10) { invalid++; continue; }
        if (contactsMap.has(phone)) continue;
        contactsMap.set(phone, {
          phone_number: phone,
          name: nameKey ? String(row[nameKey] || '') : null,
          city: cityKey ? String(row[cityKey] || '') : null,
          state: stateKey ? String(row[stateKey] || '') : null,
          source: uploadData.source,
          campaign_id: uploadData.campaign_id || null,
          user_id: user!.id,
        });
      }

      const phones = Array.from(contactsMap.keys());
      const { data: existingC } = await supabase.from('contacts').select('phone_number').eq('user_id', user!.id).in('phone_number', phones);
      const existSet = new Set((existingC || []).map(c => c.phone_number));
      const toInsert = phones.filter(p => !existSet.has(p)).map(p => contactsMap.get(p));

      if (toInsert.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < toInsert.length; i += batchSize) {
          const { error } = await supabase.from('contacts').insert(toInsert.slice(i, i + batchSize));
          if (error) throw error;
        }
        let msg = `Uploaded ${toInsert.length} contacts.`;
        if (existSet.size > 0) msg += ` ${existSet.size} already existed.`;
        if (invalid > 0) msg += ` ${invalid} invalid numbers.`;
        alert(msg);
        fetchData();
        setShowAddModal(false);
        setSelectedFile(null);
      } else {
        alert('No new contacts to upload. All already exist.');
      }
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setUploading(false); }
  };

  // ====== TAGS ======
  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const { error } = await supabase.from('tags').insert({ user_id: user!.id, name: newTagName.trim(), color: newTagColor });
      if (error) throw error;
      setNewTagName('');
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const deleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all contacts.')) return;
    await supabase.from('contact_tags').delete().eq('tag_id', tagId);
    await supabase.from('tags').delete().eq('id', tagId);
    fetchData();
  };

  const assignTag = async (contactId: string, tagId: string) => {
    try {
      const { error } = await supabase.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId, user_id: user!.id });
      if (error && !error.message.includes('duplicate')) throw error;
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const removeTag = async (contactId: string, tagId: string) => {
    await supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId);
    fetchData();
  };

  const bulkAssignTag = async (tagId: string) => {
    if (selectedContacts.size === 0) return;
    try {
      const inserts = Array.from(selectedContacts).map(cid => ({ contact_id: cid, tag_id: tagId, user_id: user!.id }));
      const { error } = await supabase.from('contact_tags').insert(inserts);
      if (error && !error.message.includes('duplicate')) throw error;
      alert(`Tag assigned to ${selectedContacts.size} contacts`);
      setSelectedContacts(new Set());
      setShowBulkTagModal(false);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  // ====== OTHER ACTIONS ======
  const toggleBlacklist = async (id: string, current: boolean) => {
    await supabase.from('contacts').update({ is_blacklisted: !current }).eq('id', id);
    fetchData();
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    fetchData();
  };

  const bulkAssignToCampaign = async () => {
    if (!bulkAssignCampaignId) return;
    setBulkAssigning(true);
    try {
      const { error } = await supabase.from('contacts').update({ campaign_id: bulkAssignCampaignId }).eq('user_id', user!.id).is('campaign_id', null);
      if (error) throw error;
      alert(`Assigned ${unassignedCount} contacts to campaign!`);
      setShowBulkAssignModal(false);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setBulkAssigning(false); }
  };

  const updateContact = async () => {
    if (!editingContact) return;
    try {
      const { error } = await supabase.from('contacts').update({
        name: editingContact.name, phone_number: editingContact.phone_number,
        city: editingContact.city, state: editingContact.state,
        source: editingContact.source, lead_type: editingContact.lead_type,
        is_blacklisted: editingContact.is_blacklisted, campaign_id: editingContact.campaign_id,
      }).eq('id', editingContact.id);
      if (error) throw error;
      alert('Updated!');
      setShowEditModal(false);
      setEditingContact(null);
      fetchData();
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const exportContacts = () => {
    const csv = [
      ['Phone', 'Name', 'Source', 'City', 'State', 'Lead Type', 'Status', 'Tags', 'Blacklisted'],
      ...contacts.map(c => [
        c.phone_number, c.name || '', c.source, c.city || '', c.state || '',
        c.lead_type, c.message_status,
        (contactTags[c.id] || []).map(t => t.name).join('; '),
        c.is_blacklisted ? 'Yes' : 'No',
      ]),
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const toggleSelectContact = (id: string) => {
    const next = new Set(selectedContacts);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedContacts(next);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contacts</h1>
          <p className="text-gray-400">
            Manage your contact database
            {unassignedCount > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
                {unassignedCount.toLocaleString()} unassigned
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {selectedContacts.size > 0 && (
            <button onClick={() => setShowBulkTagModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition">
              <Tag className="w-4 h-4" /> Tag {selectedContacts.size} Selected
            </button>
          )}
          {unassignedCount > 0 && (
            <button onClick={() => setShowBulkAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              <Filter className="w-4 h-4" /> Assign to Campaign
            </button>
          )}
          <button onClick={() => setShowTagModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">
            <Tag className="w-4 h-4" /> Tags
          </button>
          <button onClick={exportContacts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setAddMode('single'); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
            <Plus className="w-4 h-4" /> Add Contacts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search by phone or name..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Sources</option>
            {['Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp', 'Manual'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">All Tags</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="px-4 py-4 text-left">
                  <input type="checkbox" checked={selectedContacts.size === contacts.length && contacts.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
                </th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Phone</th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Name</th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Source</th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Tags</th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Lead</th>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-300">Status</th>
                <th className="text-right px-4 py-4 text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
                  </td>
                  <td className="px-4 py-3 text-white font-mono text-sm">{contact.phone_number}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{contact.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{contact.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(contactTags[contact.id] || []).map(tag => (
                        <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color + '33', color: tag.color, border: `1px solid ${tag.color}55` }}>
                          {tag.name}
                          <button onClick={(e) => { e.stopPropagation(); removeTag(contact.id, tag.id); }}
                            className="hover:opacity-70"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <button onClick={() => { setAssignTagContactId(contact.id); setShowAssignTagModal(true); }}
                        className="px-1.5 py-0.5 rounded text-xs bg-gray-700 text-gray-400 hover:bg-gray-600 transition">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      contact.lead_type === 'Hot' ? 'bg-red-500/20 text-red-400' :
                      contact.lead_type === 'Warm' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'}`}>
                      {contact.lead_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {contact.is_blacklisted ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">Blacklisted</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">{contact.message_status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => { setEditingContact(contact); setShowEditModal(true); }}
                        className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleBlacklist(contact.id, contact.is_blacklisted)}
                        className={`p-1.5 rounded transition ${contact.is_blacklisted ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                        title={contact.is_blacklisted ? 'Unblacklist' : 'Blacklist'}>
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteContact(contact.id)}
                        className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacts.length === 0 && (
          <div className="p-12 text-center"><p className="text-gray-400">No contacts found</p></div>
        )}
      </div>

      {/* ====== ADD CONTACTS MODAL ====== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add Contacts</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Mode tabs */}
            <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
              {([['single', 'Single', Plus], ['bulk', 'Bulk Paste', Users], ['csv', 'CSV/Excel', Upload]] as const).map(([mode, label, Icon]) => (
                <button key={mode} onClick={() => setAddMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                    addMode === mode ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* Single Add */}
            {addMode === 'single' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number *</label>
                  <input type="tel" placeholder="9876543210" value={singleForm.phone_number}
                    onChange={e => setSingleForm({ ...singleForm, phone_number: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <input type="text" placeholder="John Doe" value={singleForm.name}
                    onChange={e => setSingleForm({ ...singleForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                    <input type="text" value={singleForm.city}
                      onChange={e => setSingleForm({ ...singleForm, city: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                    <input type="text" value={singleForm.state}
                      onChange={e => setSingleForm({ ...singleForm, state: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
                  <select value={singleForm.source} onChange={e => setSingleForm({ ...singleForm, source: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {['Manual', 'Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={handleSingleAdd}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium">
                  Add Contact
                </button>
              </div>
            )}

            {/* Bulk Paste */}
            {addMode === 'bulk' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Paste phone numbers (one per line, optionally with name after comma)
                  </label>
                  <textarea rows={8} placeholder={"9876543210, John Doe\n8765432109, Jane\n7654321098"} value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <p className="text-gray-500 text-xs mt-1">
                    {bulkText.split('\n').filter(l => l.trim()).length} lines detected
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
                  <select value={bulkSource} onChange={e => setBulkSource(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {['Manual', 'Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={handleBulkPaste}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium">
                  Add {bulkText.split('\n').filter(l => l.trim()).length} Contacts
                </button>
              </div>
            )}

            {/* CSV Upload */}
            {addMode === 'csv' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
                  <select value={uploadData.source} onChange={e => setUploadData({ ...uploadData, source: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {['Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Campaign (Optional)</label>
                  <select value={uploadData.campaign_id} onChange={e => setUploadData({ ...uploadData, campaign_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">None</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">File</label>
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-500 file:text-white file:cursor-pointer hover:file:bg-emerald-600" />
                  {selectedFile && <p className="text-emerald-400 text-sm mt-1">Selected: {selectedFile.name}</p>}
                  <p className="text-gray-500 text-xs mt-1">CSV should include: phone, name, city, state columns</p>
                </div>
                <button onClick={handleFileUpload} disabled={!selectedFile || uploading}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== TAG MANAGEMENT MODAL ====== */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Manage Tags</h2>
              <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Create new tag */}
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Tag name..." value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTag()}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <div className="flex gap-1 items-center">
                {TAG_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition ${newTagColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={createTag} className="px-3 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition text-sm">
                Add
              </button>
            </div>

            {/* Existing tags */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tags.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No tags yet. Create your first tag above.</p>}
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-white text-sm">{tag.name}</span>
                  </div>
                  <button onClick={() => deleteTag(tag.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== ASSIGN TAG TO SINGLE CONTACT ====== */}
      {showAssignTagModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Assign Tag</h2>
              <button onClick={() => setShowAssignTagModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {tags.length === 0 && <p className="text-gray-500 text-sm">No tags. Create tags first from the Tags button.</p>}
              {tags.map(tag => {
                const alreadyAssigned = (contactTags[assignTagContactId] || []).some(t => t.id === tag.id);
                return (
                  <button key={tag.id} onClick={() => { if (!alreadyAssigned) { assignTag(assignTagContactId, tag.id); setShowAssignTagModal(false); } }}
                    disabled={alreadyAssigned}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      alreadyAssigned ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name} {alreadyAssigned && <span className="text-xs text-gray-600 ml-auto">assigned</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====== BULK TAG MODAL ====== */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Tag {selectedContacts.size} contacts</h2>
              <button onClick={() => setShowBulkTagModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => bulkAssignTag(tag.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-white text-sm hover:bg-gray-700 transition">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====== BULK ASSIGN CAMPAIGN MODAL ====== */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-2">Assign Unassigned Contacts</h2>
            <p className="text-gray-400 mb-6">Assign all {unassignedCount.toLocaleString()} unassigned contacts to a campaign</p>
            <select value={bulkAssignCampaignId} onChange={e => setBulkAssignCampaignId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
              <option value="">Select a campaign...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkAssignModal(false)} disabled={bulkAssigning}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
              <button onClick={bulkAssignToCampaign} disabled={!bulkAssignCampaignId || bulkAssigning}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50">
                {bulkAssigning ? 'Assigning...' : 'Assign All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== EDIT CONTACT MODAL ====== */}
      {showEditModal && editingContact && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Contact</h2>
              <button onClick={() => { setShowEditModal(false); setEditingContact(null); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                <input type="text" value={editingContact.phone_number}
                  onChange={e => setEditingContact({ ...editingContact, phone_number: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={editingContact.name || ''}
                  onChange={e => setEditingContact({ ...editingContact, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input type="text" value={editingContact.city || ''}
                  onChange={e => setEditingContact({ ...editingContact, city: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                <input type="text" value={editingContact.state || ''}
                  onChange={e => setEditingContact({ ...editingContact, state: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Source</label>
                <select value={editingContact.source}
                  onChange={e => setEditingContact({ ...editingContact, source: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['Excel', 'Facebook', 'Instagram', 'Website', 'WhatsApp', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lead Type</label>
                <select value={editingContact.lead_type}
                  onChange={e => setEditingContact({ ...editingContact, lead_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['Hot', 'Warm', 'Cold'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setEditingContact(null); }}
                className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
              <button onClick={updateContact}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
