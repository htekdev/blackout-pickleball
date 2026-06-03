/**
 * Event data types and utilities for Blackout Pickleball.
 * Events are stored in src/data/events.json and managed via the admin UI.
 */

export interface BlackoutEvent {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  dateISO: string;
  venue: string;
  address: string;
  city: string;
  image: string;
  price: string;
  ticketUrl: string;
  ticketLabel: string;
  description: string;
  highlights: string[];
  refundPolicy: string | null;
  duration: string;
  format: string;
  status: 'on-sale' | 'sold-out' | 'past' | 'draft';
  featured: boolean;
  visible: boolean;
}

/**
 * Get only published (visible) events, sorted chronologically.
 */
export function getPublicEvents(events: BlackoutEvent[]): BlackoutEvent[] {
  return events
    .filter((e) => e.visible && e.status !== 'draft')
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

/**
 * Get featured events (for homepage spotlight).
 */
export function getFeaturedEvents(events: BlackoutEvent[]): BlackoutEvent[] {
  return events.filter((e) => e.featured && e.visible && e.status !== 'draft');
}

/**
 * Generate a URL-safe ID from a title.
 */
export function generateEventId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

/**
 * Create a blank event template for new event creation.
 */
export function createBlankEvent(): BlackoutEvent {
  const now = new Date();
  return {
    id: '',
    title: '',
    subtitle: '',
    date: '',
    time: 'TBA',
    dateISO: now.toISOString(),
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
  };
}
