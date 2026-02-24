// Cloudflare Pages Function: POST + GET /api/bookings

// --- CORS headers ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

// Check admin key
function isAdmin(request, env) {
    const key = request.headers.get('X-Admin-Key');
    return key && key === env.ADMIN_KEY;
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 7);
}

// --- Handle OPTIONS (CORS preflight) ---
export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

// --- POST: Create a new booking ---
export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const admin = isAdmin(request, env);

        // Validate required fields — strict for public, relaxed for admin
        if (!admin) {
            const required = ['name', 'email', 'date', 'timeStart', 'timeEnd', 'eventType', 'location'];
            for (const field of required) {
                if (!body[field] || !body[field].toString().trim()) {
                    return errorResponse(`Feltet '${field}' er påkrævet.`);
                }
            }
        } else {
            // Admin only needs a date
            if (!body.date) return errorResponse('Dato er påkrævet.');
        }

        // Build booking object
        const booking = {
            id: generateId(),
            name: (body.name || 'Manuel').trim(),
            email: (body.email || '').trim(),
            phone: (body.phone || '').trim(),
            wantsCallback: !!body.wantsCallback,
            date: body.date.trim(),
            timeStart: (body.timeStart || '').trim(),
            timeEnd: (body.timeEnd || '').trim(),
            eventType: (body.eventType || 'Blokeret').trim(),
            location: (body.location || '').trim(),
            guests: (body.guests || '').toString(),
            organization: (body.organization || '').trim(),
            message: (body.message || '').trim(),
            status: (admin && body.status) ? body.status : 'pending',
            submittedAt: new Date().toISOString(),
        };

        // Get existing bookings from KV
        const existing = await env.MLI_BOOKINGS.get('bookings', { type: 'json' }) || [];
        existing.push(booking);
        await env.MLI_BOOKINGS.put('bookings', JSON.stringify(existing));

        // Send ntfy push notification only for public bookings (not admin manual ones)
        if (!admin) {
            const ntfyTopic = env.NTFY_TOPIC || 'mli-booking-emelie';
            const ntfyTitle = `Ny booking: ${booking.eventType}${booking.wantsCallback ? ' 📞 RING OP' : ''}`;
            const ntfyBody =
                `📅 ${booking.date} kl. ${booking.timeStart}–${booking.timeEnd}\n` +
                `📍 ${booking.location}\n` +
                `👤 ${booking.name}${booking.organization ? ` (${booking.organization})` : ''}\n` +
                `✉️ ${booking.email}\n` +
                (booking.phone ? `📞 ${booking.phone}${booking.wantsCallback ? ' — ØNSKER OPRINGNING' : ''}\n` : '') +
                `🎵 ${booking.eventType}\n` +
                (booking.guests ? `👥 Ca. ${booking.guests} gæster\n` : '') +
                (booking.message ? `💬 ${booking.message}` : '');

            try {
                await fetch(`https://ntfy.sh/${ntfyTopic}`, {
                    method: 'POST',
                    headers: {
                        'Title': ntfyTitle,
                        'Tags': booking.wantsCallback ? 'phone,musical_note' : 'musical_note,calendar',
                        'Priority': booking.wantsCallback ? '5' : '4',
                    },
                    body: ntfyBody,
                });
            } catch (_) { /* ntfy failure should not block booking */ }
        }

        return jsonResponse({ success: true, id: booking.id }, 201);
    } catch (err) {
        return errorResponse('Ugyldig forespørgsel: ' + err.message, 400);
    }
}

// --- GET: List all bookings (admin only) ---
export async function onRequestGet({ request, env }) {
    if (!isAdmin(request, env)) {
        return errorResponse('Adgang nægtet', 401);
    }

    const bookings = await env.MLI_BOOKINGS.get('bookings', { type: 'json' }) || [];
    return jsonResponse(bookings);
}
