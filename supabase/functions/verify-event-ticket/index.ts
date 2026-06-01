import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user is authenticated (for admin check-in) via user_roles
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userErr } = await anonClient.auth.getUser(token);
      if (userErr) console.log('auth.getUser error:', userErr.message);
      if (user) {
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: roleRow, error: roleErr } = await serviceClient
          .from('user_roles').select('role')
          .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
        if (roleErr) console.log('user_roles query error:', roleErr.message);
        isAdmin = !!roleRow;
        console.log(`[auth] user=${user.id} isAdmin=${isAdmin}`);
      } else {
        console.log('[auth] no user resolved from token');
      }
    } else {
      console.log('[auth] no Authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    // Accept both camelCase and snake_case for backwards compatibility
    const ticketCode: string | undefined = body.ticketCode ?? body.ticket_code;
    const markAsCheckedIn: boolean = !!(body.markAsCheckedIn ?? body.perform_check_in);
    const action: string | undefined = body.action;
    const isCheckOut: boolean = action === 'check_out';

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: 'Ticket code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying ticket:', ticketCode);

    const codeUpper = ticketCode.toUpperCase();

    // 1) Try the per-attendee table first (group tickets — one QR per seat).
    const { data: attendee } = await supabase
      .from('paid_event_order_attendees')
      .select('*')
      .eq('ticket_code', codeUpper)
      .maybeSingle();

    let order: any = null;

    if (attendee) {
      const { data: ord, error: orderErr } = await supabase
        .from('paid_event_orders')
        .select(`*, paid_events ( id, title, slug, event_date, event_end_date, location, is_online ), paid_event_tickets ( id, name, description )`)
        .eq('id', attendee.order_id)
        .single();
      if (orderErr || !ord) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Order not found', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      order = ord;
    } else {
      // 2) Fallback to legacy single-ticket lookup on the order itself.
      const { data: ord, error: orderError } = await supabase
        .from('paid_event_orders')
        .select(`*, paid_events ( id, title, slug, event_date, event_end_date, location, is_online ), paid_event_tickets ( id, name, description )`)
        .eq('ticket_code', codeUpper)
        .single();

      if (orderError || !ord) {
        console.error('Ticket not found:', ticketCode, orderError);
        return new Response(
          JSON.stringify({ valid: false, error: 'Ticket not found', code: 'NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      order = ord;
    }

    // Accept paid OR confirmed (free events) as valid statuses
    const VALID_STATUSES = new Set(['paid', 'confirmed']);
    if (!VALID_STATUSES.has(order.status)) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Ticket not paid',
          code: 'NOT_PAID',
          status: order.status
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Per-attendee check (group ticket) takes precedence; fallback to order-level check.
    const isAlreadyCheckedIn = attendee ? !!attendee.checked_in : !!order.checked_in;
    const checkedInAt = attendee ? attendee.checked_in_at : order.checked_in_at;
    const seatFirstName = attendee ? attendee.first_name : order.first_name;
    const seatLastName = attendee ? attendee.last_name : order.last_name;
    const seatEmail = attendee ? (attendee.email || order.email) : order.email;

    if (isAlreadyCheckedIn) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Ticket already used',
          code: 'ALREADY_CHECKED_IN',
          checkedInAt,
          attendee: { firstName: seatFirstName, lastName: seatLastName, email: seatEmail },
          seatIndex: attendee?.seat_index ?? null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Event time bounds — only enforced when actually performing check-in
    const now = new Date();
    const eventDate = new Date(order.paid_events.event_date);
    const eventEndDate = order.paid_events.event_end_date
      ? new Date(order.paid_events.event_end_date)
      : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
    const checkInStart = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);

    // Admins can check-in at any time (e.g. testing, early entry). Non-admins must respect window.
    if (markAsCheckedIn && !isAdmin) {
      if (now < checkInStart) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Check-in not yet available', code: 'TOO_EARLY', checkInStartsAt: checkInStart.toISOString() }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (now > eventEndDate) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Event has ended', code: 'EVENT_ENDED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mark as checked in if requested and user is admin
    if (markAsCheckedIn && isAdmin) {
      if (attendee) {
        const { error: updateError } = await supabase
          .from('paid_event_order_attendees')
          .update({ checked_in: true, checked_in_at: new Date().toISOString() })
          .eq('id', attendee.id);
        if (updateError) {
          console.error('Failed to mark attendee check-in:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to mark check-in' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const { error: updateError } = await supabase
          .from('paid_event_orders')
          .update({ checked_in: true, checked_in_at: new Date().toISOString() })
          .eq('id', order.id);
        if (updateError) {
          console.error('Failed to mark check-in:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to mark check-in' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      console.log('Ticket checked in:', ticketCode);
    }

    // Return valid ticket info
    const ticketRel = (order as any).paid_event_tickets;
    return new Response(
      JSON.stringify({
        valid: true,
        checkedIn: markAsCheckedIn && isAdmin,
        checkInStartsAt: checkInStart.toISOString(),
        eventEndedAt: eventEndDate.toISOString(),
        order: {
          id: order.id,
          quantity: order.quantity,
          ticketCode: order.ticket_code,
        },
        attendee: {
          firstName: seatFirstName,
          lastName: seatLastName,
          email: seatEmail,
          phone: order.phone,
        },
        seatIndex: attendee?.seat_index ?? null,
        buyer: {
          firstName: order.first_name,
          lastName: order.last_name,
          email: order.email,
        },
        event: {
          id: order.paid_events.id,
          title: order.paid_events.title,
          date: order.paid_events.event_date,
          location: order.paid_events.location,
          isOnline: order.paid_events.is_online,
        },
        ticket: ticketRel ? {
          id: ticketRel.id,
          name: ticketRel.name,
          description: ticketRel.description,
        } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-event-ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
