export const prerender = false;

import type { APIRoute } from 'astro';
import type { BlackoutEvent } from '../../../lib/events';
import eventsData from '../../../data/events.json';

/**
 * Admin Events API — serves event data for the admin interface.
 * 
 * GET /api/admin/events — returns all events (no visibility filter)
 * POST /api/admin/events — create/update/delete events (accepts full array)
 * 
 * Protected by ADMIN_PASSWORD environment variable.
 */

function verifyAuth(request: Request): boolean {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('x-admin-token');
  const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  
  // If no password is configured, allow access (development mode)
  if (!adminPassword) return true;
  
  return token === adminPassword;
}

const headers = { 'Content-Type': 'application/json' };

export const GET: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  // Return all events (including drafts and hidden ones)
  return new Response(JSON.stringify(eventsData), { status: 200, headers });
};

export const POST: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const body = await request.json();
    
    // The admin UI sends the full events array for persistence
    // In production, this would write to a database or file store
    // For now, we validate and return success — the admin UI uses localStorage
    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Expected an array of events' }),
        { status: 400, headers }
      );
    }

    // Validate each event has required fields
    for (const event of body) {
      if (!event.id || !event.title || !event.dateISO) {
        return new Response(
          JSON.stringify({ error: `Event missing required fields: id, title, dateISO` }),
          { status: 400, headers }
        );
      }
    }

    // Return success with the validated data
    // The admin UI persists to localStorage and provides export
    return new Response(
      JSON.stringify({ success: true, count: body.length, events: body }),
      { status: 200, headers }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Invalid request body' }),
      { status: 400, headers }
    );
  }
};
