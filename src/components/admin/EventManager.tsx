import { useState, useEffect, useCallback } from 'preact/hooks';
import type { BlackoutEvent } from '../../lib/events';

interface Props {
  initialEvents: BlackoutEvent[];
}

const STORAGE_KEY = 'blackout-admin-events';

/**
 * AdminEventManager — full CRUD interface for Blackout events.
 * Uses localStorage for persistence between sessions.
 * Export/Import JSON for publishing changes to the live site.
 */
export default function EventManager({ initialEvents }: Props) {
  const [events, setEvents] = useState<BlackoutEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<BlackoutEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'draft'>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load events from localStorage or fall back to initial data
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        setEvents(initialEvents);
      }
    } catch {
      setEvents(initialEvents);
    }
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  }, [events]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Generate an ID from title
  const generateId = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
  };

  // Create new event
  const handleCreate = () => {
    setEditingEvent({
      id: '',
      title: '',
      subtitle: '',
      date: '',
      time: 'TBA',
      dateISO: new Date().toISOString(),
      venue: 'TBA',
      address: '',
      city: '',
      image: '',
      price: '',
      ticketUrl: '',
      ticketLabel: 'Get Tickets',
      description: '',
      highlights: [],
      refundPolicy: null,
      duration: 'TBA',
      format: 'In person',
      status: 'draft',
      featured: false,
      visible: false,
    });
    setIsCreating(true);
  };

  // Save event (create or update)
  const handleSave = (event: BlackoutEvent) => {
    if (isCreating) {
      // Auto-generate ID if empty
      if (!event.id) {
        event.id = generateId(event.title);
      }
      // Check for duplicate ID
      if (events.some((e) => e.id === event.id)) {
        showNotification('error', `Event with ID "${event.id}" already exists.`);
        return;
      }
      setEvents([...events, event]);
      showNotification('success', `Event "${event.title}" created!`);
    } else {
      setEvents(events.map((e) => (e.id === event.id ? event : e)));
      showNotification('success', `Event "${event.title}" updated!`);
    }
    setEditingEvent(null);
    setIsCreating(false);
  };

  // Delete event
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event? This cannot be undone.')) {
      setEvents(events.filter((e) => e.id !== id));
      showNotification('success', 'Event deleted.');
      if (editingEvent?.id === id) {
        setEditingEvent(null);
        setIsCreating(false);
      }
    }
  };

  // Toggle featured
  const toggleFeatured = (id: string) => {
    setEvents(events.map((e) => (e.id === id ? { ...e, featured: !e.featured } : e)));
  };

  // Toggle visibility
  const toggleVisibility = (id: string) => {
    setEvents(
      events.map((e) => {
        if (e.id !== id) return e;
        const newVisible = !e.visible;
        return { ...e, visible: newVisible, status: !newVisible ? 'draft' : e.status === 'draft' ? 'on-sale' : e.status };
      })
    );
  };

  // Export JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Events exported! Send this file to publish changes.');
  };

  // Import JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) throw new Error('File must contain an array of events');
        setEvents(imported);
        showNotification('success', `Imported ${imported.length} events.`);
      } catch (err: any) {
        showNotification('error', `Import failed: ${err.message}`);
      }
    };
    input.click();
  };

  // Reset to original data
  const handleReset = () => {
    if (confirm('Reset all events to the last published version? Your local changes will be lost.')) {
      setEvents(initialEvents);
      localStorage.removeItem(STORAGE_KEY);
      showNotification('success', 'Events reset to published version.');
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return e.status === 'on-sale' || e.status === 'sold-out';
    if (filter === 'past') return e.status === 'past';
    if (filter === 'draft') return e.status === 'draft' || !e.visible;
    return true;
  });

  return (
    <div class="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          class={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Toolbar */}
      <div class="bg-white rounded-xl border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            onClick={handleCreate}
            class="inline-flex items-center gap-2 px-4 py-2 bg-blackout text-white rounded-lg text-sm font-bold hover:bg-blackout-light transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Event
          </button>

          {/* Filter Tabs */}
          <div class="flex items-center gap-1 bg-surface-dark rounded-lg p-1">
            {(['all', 'upcoming', 'past', 'draft'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                class={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  filter === f ? 'bg-white text-blackout shadow-sm' : 'text-text-light hover:text-blackout'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={handleExport}
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blackout bg-surface-dark rounded-lg hover:bg-border transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
          <button
            onClick={handleImport}
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blackout bg-surface-dark rounded-lg hover:bg-border transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button
            onClick={handleReset}
            class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg border border-border px-4 py-3 text-center">
          <p class="text-2xl font-black text-blackout">{events.length}</p>
          <p class="text-xs text-text-light font-medium">Total Events</p>
        </div>
        <div class="bg-white rounded-lg border border-border px-4 py-3 text-center">
          <p class="text-2xl font-black text-green-600">{events.filter((e) => e.status === 'on-sale').length}</p>
          <p class="text-xs text-text-light font-medium">On Sale</p>
        </div>
        <div class="bg-white rounded-lg border border-border px-4 py-3 text-center">
          <p class="text-2xl font-black text-yellow-600">{events.filter((e) => e.status === 'draft' || !e.visible).length}</p>
          <p class="text-xs text-text-light font-medium">Drafts</p>
        </div>
        <div class="bg-white rounded-lg border border-border px-4 py-3 text-center">
          <p class="text-2xl font-black text-purple-600">{events.filter((e) => e.featured).length}</p>
          <p class="text-xs text-text-light font-medium">Featured</p>
        </div>
      </div>

      {/* Event Editor Modal */}
      {editingEvent && (
        <EventEditor
          event={editingEvent}
          isNew={isCreating}
          onSave={handleSave}
          onCancel={() => {
            setEditingEvent(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Events Table */}
      <div class="bg-white rounded-xl border border-border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-dark border-b border-border">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-text-light">Event</th>
                <th class="text-left px-4 py-3 font-semibold text-text-light">Date</th>
                <th class="text-left px-4 py-3 font-semibold text-text-light">City</th>
                <th class="text-center px-4 py-3 font-semibold text-text-light">Status</th>
                <th class="text-center px-4 py-3 font-semibold text-text-light">Featured</th>
                <th class="text-center px-4 py-3 font-semibold text-text-light">Visible</th>
                <th class="text-right px-4 py-3 font-semibold text-text-light">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-light">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colspan={7} class="px-4 py-12 text-center text-text-light">
                    No events found for this filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} class="hover:bg-surface-dark/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        {event.image ? (
                          <img src={event.image} alt="" class="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div class="w-10 h-10 rounded-lg bg-surface-dark flex items-center justify-center">
                            <svg class="w-5 h-5 text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p class="font-bold text-blackout">{event.title}</p>
                          <p class="text-xs text-text-light">{event.id}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-text-light">{event.date || 'Not set'}</td>
                    <td class="px-4 py-3 text-text-light">{event.city || '—'}</td>
                    <td class="px-4 py-3 text-center">
                      <StatusBadge status={event.status} />
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleFeatured(event.id)}
                        class={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          event.featured ? 'bg-yellow-100 text-yellow-600' : 'bg-surface-dark text-text-light hover:bg-yellow-50'
                        }`}
                        title={event.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <svg class="w-4 h-4" fill={event.featured ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(event.id)}
                        class={`relative w-10 h-6 rounded-full transition-colors ${
                          event.visible ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={event.visible ? 'Hide event' : 'Show event'}
                      >
                        <span
                          class={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            event.visible ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingEvent({ ...event });
                            setIsCreating(false);
                          }}
                          class="p-2 rounded-lg hover:bg-surface-dark transition-colors text-text-light hover:text-blackout"
                          title="Edit event"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          class="p-2 rounded-lg hover:bg-red-50 transition-colors text-text-light hover:text-red-600"
                          title="Delete event"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Local Changes Notice */}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
        <strong>Note:</strong> Changes are saved to your browser. To publish changes to the live site, click "Export JSON" and send the file to your developer.
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'on-sale': 'bg-green-100 text-green-700',
    'sold-out': 'bg-red-100 text-red-700',
    past: 'bg-gray-100 text-gray-600',
    draft: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <span class={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
      {status === 'on-sale' ? 'On Sale' : status === 'sold-out' ? 'Sold Out' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Event Editor Form ──────────────────────────────────────────

interface EditorProps {
  event: BlackoutEvent;
  isNew: boolean;
  onSave: (event: BlackoutEvent) => void;
  onCancel: () => void;
}

function EventEditor({ event, isNew, onSave, onCancel }: EditorProps) {
  const [form, setForm] = useState<BlackoutEvent>({ ...event });
  const [highlightsText, setHighlightsText] = useState(event.highlights.join('\n'));

  const updateField = (field: keyof BlackoutEvent, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!form.title) {
      alert('Title is required');
      return;
    }
    // Parse highlights from textarea
    const highlights = highlightsText
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);
    
    // Auto-format date string from ISO if not manually set
    let dateStr = form.date;
    if (!dateStr && form.dateISO) {
      const d = new Date(form.dateISO);
      dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    onSave({ ...form, highlights, date: dateStr });
  };

  return (
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
      {/* Backdrop */}
      <div class="fixed inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-black font-display">
            {isNew ? 'Create New Event' : `Edit: ${event.title}`}
          </h2>
          <button onClick={onCancel} class="p-2 rounded-lg hover:bg-surface-dark transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} class="space-y-5">
          {/* Basic Info */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-semibold text-text mb-1">Event Title *</label>
              <input
                type="text"
                value={form.title}
                onInput={(e: any) => updateField('title', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="e.g., Blackout Pickleball Chicago"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Subtitle</label>
              <input
                type="text"
                value={form.subtitle}
                onInput={(e: any) => updateField('subtitle', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="e.g., Chicago Day Party 🎾⚡️"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Event ID</label>
              <input
                type="text"
                value={form.id}
                onInput={(e: any) => updateField('id', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout bg-surface-dark"
                placeholder="Auto-generated from title"
              />
              <p class="text-xs text-text-light mt-1">Leave blank to auto-generate</p>
            </div>
          </div>

          {/* Date & Time */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Date (ISO) *</label>
              <input
                type="datetime-local"
                value={form.dateISO ? form.dateISO.slice(0, 16) : ''}
                onInput={(e: any) => updateField('dateISO', new Date(e.target.value).toISOString())}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Display Date</label>
              <input
                type="text"
                value={form.date}
                onInput={(e: any) => updateField('date', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="Saturday, May 16, 2026"
              />
              <p class="text-xs text-text-light mt-1">Auto-generated if blank</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Time</label>
              <input
                type="text"
                value={form.time}
                onInput={(e: any) => updateField('time', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="1:00 PM – 5:00 PM CT"
              />
            </div>
          </div>

          {/* Location */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Venue</label>
              <input
                type="text"
                value={form.venue}
                onInput={(e: any) => updateField('venue', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="Venue name"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onInput={(e: any) => updateField('address', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="Full address"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">City *</label>
              <input
                type="text"
                value={form.city}
                onInput={(e: any) => updateField('city', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="Chicago, IL"
              />
            </div>
          </div>

          {/* Ticket & Pricing */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Price</label>
              <input
                type="text"
                value={form.price}
                onInput={(e: any) => updateField('price', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="$37.05 or Free / RSVP"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Ticket/Registration URL</label>
              <input
                type="url"
                value={form.ticketUrl}
                onInput={(e: any) => updateField('ticketUrl', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="https://eventbrite.com/..."
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Button Label</label>
              <input
                type="text"
                value={form.ticketLabel}
                onInput={(e: any) => updateField('ticketLabel', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="Get Tickets"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label class="block text-sm font-semibold text-text mb-1">Image URL</label>
            <input
              type="text"
              value={form.image}
              onInput={(e: any) => updateField('image', e.target.value)}
              class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
              placeholder="/images/events/my-event.jpg or https://..."
            />
            {form.image && (
              <img src={form.image} alt="Preview" class="mt-2 w-32 h-20 object-cover rounded-lg border border-border" />
            )}
          </div>

          {/* Description */}
          <div>
            <label class="block text-sm font-semibold text-text mb-1">Description</label>
            <textarea
              value={form.description}
              onInput={(e: any) => updateField('description', e.target.value)}
              rows={4}
              class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout resize-y"
              placeholder="Event description..."
            />
          </div>

          {/* Highlights */}
          <div>
            <label class="block text-sm font-semibold text-text mb-1">Highlights (one per line)</label>
            <textarea
              value={highlightsText}
              onInput={(e: any) => setHighlightsText(e.target.value)}
              rows={4}
              class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout resize-y"
              placeholder="Live DJ spinning all night&#10;Prizes & giveaways&#10;All skill levels welcome"
            />
          </div>

          {/* Meta */}
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Duration</label>
              <input
                type="text"
                value={form.duration}
                onInput={(e: any) => updateField('duration', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="4 hours"
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Format</label>
              <select
                value={form.format}
                onChange={(e: any) => updateField('format', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
              >
                <option value="In person">In person</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e: any) => updateField('status', e.target.value)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
              >
                <option value="draft">Draft</option>
                <option value="on-sale">On Sale</option>
                <option value="sold-out">Sold Out</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-text mb-1">Refund Policy</label>
              <input
                type="text"
                value={form.refundPolicy || ''}
                onInput={(e: any) => updateField('refundPolicy', e.target.value || null)}
                class="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blackout/20 focus:border-blackout"
                placeholder="No refunds"
              />
            </div>
          </div>

          {/* Toggles */}
          <div class="flex items-center gap-6 pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e: any) => updateField('featured', e.target.checked)}
                class="w-4 h-4 rounded border-border text-blackout focus:ring-blackout"
              />
              <span class="text-sm font-medium">⭐ Featured (spotlight on homepage)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e: any) => updateField('visible', e.target.checked)}
                class="w-4 h-4 rounded border-border text-blackout focus:ring-blackout"
              />
              <span class="text-sm font-medium">👁 Visible (published on site)</span>
            </label>
          </div>

          {/* Actions */}
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border-light">
            <button
              type="button"
              onClick={onCancel}
              class="px-4 py-2 text-sm font-medium text-text-light hover:text-blackout rounded-lg hover:bg-surface-dark transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-6 py-2 bg-blackout text-white text-sm font-bold rounded-lg hover:bg-blackout-light transition-colors"
            >
              {isNew ? 'Create Event' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
