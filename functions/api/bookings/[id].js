// Cloudflare Pages Function: PUT + DELETE /api/bookings/:id

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
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

function isAdmin(request, env) {
    const key = request.headers.get('X-Admin-Key');
    return key && key === env.ADMIN_KEY;
}

// --- Handle OPTIONS (CORS preflight) ---
export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

// --- PUT: Update a booking (status change, or full update for manual bookings) ---
export async function onRequestPut({ request, env, params }) {
    if (!isAdmin(request, env)) {
        return errorResponse('Adgang nægtet', 401);
    }

    const id = params.id;
    const body = await request.json();
    const bookings = await env.MLI_BOOKINGS.get('bookings', { type: 'json' }) || [];
    const index = bookings.findIndex(b => b.id === id);

    if (index === -1) {
        return errorResponse('Booking ikke fundet', 404);
    }

    // If body has 'status', just update status. Otherwise merge all fields.
    if (body.status && Object.keys(body).length === 1) {
        bookings[index].status = body.status;
    } else {
        // Merge — keeps id and submittedAt but updates everything else
        bookings[index] = { ...bookings[index], ...body, id: bookings[index].id };
    }

    await env.MLI_BOOKINGS.put('bookings', JSON.stringify(bookings));
    return jsonResponse({ success: true, booking: bookings[index] });
}

// --- DELETE: Remove a booking ---
export async function onRequestDelete({ request, env, params }) {
    if (!isAdmin(request, env)) {
        return errorResponse('Adgang nægtet', 401);
    }

    const id = params.id;
    const bookings = await env.MLI_BOOKINGS.get('bookings', { type: 'json' }) || [];
    const filtered = bookings.filter(b => b.id !== id);

    if (filtered.length === bookings.length) {
        return errorResponse('Booking ikke fundet', 404);
    }

    await env.MLI_BOOKINGS.put('bookings', JSON.stringify(filtered));
    return jsonResponse({ success: true });
}
