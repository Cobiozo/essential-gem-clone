import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRequest {
  ticketCode: string;
  markAsCheckedIn?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user is authenticated (for admin check-in)
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader) {
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

      if (!authError && user) {
        // Check if user is admin
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        isAdmin = profile?.role === 'admin';
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { ticketCode, markAsCheckedIn }: VerifyRequest = await req.json();

    if (!ticketCode) {
      return new Response(
        JSON.stringify({ error: 'Ticket code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying ticket:', ticketCode);

    // Find order by ticket code
    const { data: order, error: orderError } = await supabase
      .from('paid_event_orders')
      .select(`
        *,
        paid_events (
          id, title, slug, event_date, event_end_date, location, is_online
        ),
        paid_event_tickets (
          id, name, description
        )
      `)
      .eq('ticket_code', ticketCode.toUpperCase())
      .single();

    if (orderError || !order) {
      console.error('Ticket not found:', ticketCode, orderError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket not found',
          code: 'NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status
    if (order.status !== 'paid') {
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

    // Check if already checked in
    if (order.checked_in) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Ticket already used',
          code: 'ALREADY_CHECKED_IN',
          checkedInAt: order.checked_in_at,
          attendee: {
            firstName: order.first_name,
            lastName: order.last_name,
            email: order.email,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check event date (allow check-in from 2 hours before to end of event)
    const now = new Date();
    const eventDate = new Date(order.paid_events.event_date);
    const eventEndDate = order.paid_events.event_end_date 
      ? new Date(order.paid_events.event_end_date)
      : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // Default: 24h after start

    const checkInStart = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

    if (now < checkInStart) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Check-in not yet available',
          code: 'TOO_EARLY',
          checkInStartsAt: checkInStart.toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (now > eventEndDate) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Event has ended',
          code: 'EVENT_ENDED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as checked in if requested and user is admin
    if (markAsCheckedIn && isAdmin) {
      const { error: updateError } = await supabase
        .from('paid_event_orders')
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to mark check-in:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to mark check-in' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Ticket checked in:', ticketCode);
    }

    // Return valid ticket info
    return new Response(
      JSON.stringify({
        valid: true,
        checkedIn: markAsCheckedIn && isAdmin,
        order: {
          id: order.id,
          quantity: order.quantity,
          ticketCode: order.ticket_code,
        },
        attendee: {
          firstName: order.first_name,
          lastName: order.last_name,
          email: order.email,
          phone: order.phone,
        },
        event: {
          id: order.paid_events.id,
          title: order.paid_events.title,
          date: order.paid_events.event_date,
          location: order.paid_events.location,
          isOnline: order.paid_events.is_online,
        },
        ticket: {
          id: order.paid_event_tickets.id,
          name: order.paid_event_tickets.name,
          description: order.paid_event_tickets.description,
        },
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
