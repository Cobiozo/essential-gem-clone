import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuyerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface OrderRequest {
  eventId: string;
  ticketId: string;
  quantity: number;
  buyer: BuyerData;
}

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getPayUAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYU_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYU_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayU credentials not configured');
  }

  const response = await fetch('https://secure.snd.payu.com/pl/standard/user/oauth/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayU OAuth error:', error);
    throw new Error('Failed to get PayU access token');
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { eventId, ticketId, quantity, buyer }: OrderRequest = await req.json();

    // Validate input
    if (!eventId || !ticketId || !quantity || !buyer?.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating order for event:', eventId, 'ticket:', ticketId);

    // Get event and ticket data
    const { data: ticket, error: ticketError } = await supabase
      .from('paid_event_tickets')
      .select(`
        *,
        paid_events (
          id, title, slug, event_date, location, is_online
        )
      `)
      .eq('id', ticketId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found or not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check availability
    const availableQty = ticket.quantity_available - ticket.quantity_sold;
    if (availableQty < quantity) {
      return new Response(
        JSON.stringify({ error: 'Not enough tickets available', available: availableQty }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check sale period
    const now = new Date();
    if (ticket.sale_start && new Date(ticket.sale_start) > now) {
      return new Response(
        JSON.stringify({ error: 'Sale has not started yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (ticket.sale_end && new Date(ticket.sale_end) < now) {
      return new Response(
        JSON.stringify({ error: 'Sale has ended' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalAmount = ticket.price_pln * quantity;
    const ticketCode = generateTicketCode();

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('paid_event_orders')
      .insert({
        event_id: eventId,
        ticket_id: ticketId,
        email: buyer.email,
        first_name: buyer.firstName,
        last_name: buyer.lastName,
        phone: buyer.phone,
        quantity,
        total_amount: totalAmount,
        status: 'pending',
        payment_provider: 'payu',
        ticket_code: ticketCode,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created:', order.id);

    // Get PayU access token
    const accessToken = await getPayUAccessToken();
    const posId = Deno.env.get('PAYU_MERCHANT_POS_ID');

    if (!posId) {
      throw new Error('PayU POS ID not configured');
    }

    // Prepare PayU order
    const event = ticket.paid_events;
    const payuOrder = {
      notifyUrl: `${supabaseUrl}/functions/v1/payu-webhook`,
      continueUrl: `https://purelife.lovable.app/event/${event.slug}/confirmation?orderId=${order.id}`,
      customerIp: req.headers.get('x-forwarded-for') || '127.0.0.1',
      merchantPosId: posId,
      description: `${event.title} - ${ticket.name}`,
      currencyCode: 'PLN',
      totalAmount: totalAmount.toString(),
      extOrderId: order.id,
      buyer: {
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone,
      },
      products: [
        {
          name: `${ticket.name} - ${event.title}`,
          unitPrice: ticket.price_pln.toString(),
          quantity: quantity.toString(),
        },
      ],
    };

    console.log('Creating PayU order:', JSON.stringify(payuOrder));

    // Create PayU order
    const payuResponse = await fetch('https://secure.snd.payu.com/api/v2_1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payuOrder),
      redirect: 'manual', // Don't follow redirects
    });

    const payuData = await payuResponse.json();
    console.log('PayU response:', JSON.stringify(payuData));

    if (payuData.status?.statusCode !== 'SUCCESS') {
      console.error('PayU order creation failed:', payuData);
      
      // Mark order as failed
      await supabase
        .from('paid_event_orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      return new Response(
        JSON.stringify({ error: 'Payment initialization failed', details: payuData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order with PayU order ID
    await supabase
      .from('paid_event_orders')
      .update({ payment_order_id: payuData.orderId })
      .eq('id', order.id);

    console.log('Order updated with PayU ID:', payuData.orderId);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        redirectUri: payuData.redirectUri,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in payu-create-order:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
