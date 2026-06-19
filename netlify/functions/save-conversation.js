// netlify/functions/save-conversation.js
// Saves chat history and syncs savings to Supabase

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // --- Environment Variable Check ---
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      return { statusCode: 500, headers, body: JSON.stringify({ error: `Server configuration error: Missing ${missingVars.join(', ')}` }) };
    }
    const { action, token, data } = JSON.parse(event.body);

    // Create a temporary client to verify the user's token
    const authClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        realtime: { transport: ws }
      }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: { persistSession: false },
        realtime: {
          transport: ws
        }
      }
    );

    console.log(`User ${user.id} performing action: ${action}`);

    if (action === 'save_conversation') {
      const { question, response, type, cuisine, meal_type, tags } = data;
      const { error } = await authClient.from('conversations').insert({
        user_id: user.id, question, response, type: type||'chat', cuisine, meal_type, tags: tags||[]
      });
      if (error) {
        console.error('Supabase error saving conversation:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error saving conversation: ${error.message}` }) };
      }
      // Update habits
      await updateHabits(supabaseAdmin, user.id, cuisine, meal_type);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'get_history') {
      const type = data.type || 'conversation';
      if (type === 'savings') {
        const { data: savings, error } = await authClient
          .from('savings')
          .select('dish_name, amount_saved, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase error getting savings history:', error.message);
          return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error getting savings history: ${error.message}` }) };
        }
        // Format data to match localStorage structure
        const formattedSavings = savings.map(s => ({ name: s.dish_name, saved: s.amount_saved, date: new Date(s.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) }));
        return { statusCode: 200, headers, body: JSON.stringify({ savings: formattedSavings }) };
      } else {
        const { data: convos, error } = await authClient.from('conversations').select('question, response, type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
        if (error) {
          console.error('Supabase error getting conversation history:', error.message);
          return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error getting conversation history: ${error.message}` }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ conversations: convos }) };
      }
    }

    if (action === 'save_savings') {
      const { dish_name, amount_saved, home_cost, restaurant_cost, cuisine, meal_type } = data;
      const { error } = await authClient.from('savings').insert({
        user_id: user.id, dish_name, amount_saved, home_cost, restaurant_cost, cuisine, meal_type
      });
      if (error) {
        console.error('Supabase error saving savings:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error saving savings: ${error.message}` }) };
      }
      // Update total
      // Use a separate client with the service key for admin-level operations like RPC calls if needed,
      // but for user-specific updates, the user's client is fine if RLS is set up.
      // RPC calls that modify protected data should use the admin client.
      await supabaseAdmin.rpc('increment_meals_cooked', { uid: user.id });
      await supabaseAdmin.rpc('increment_savings', { uid: user.id, amount: amount_saved });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'save_menu_item') {
      const items = data.items || [data];
      const rows = items.map(item => ({
        user_id: user.id,
        name: item.item_name||item.item||item.name||'Item',
        description: item.description||'',
        cost: parseFloat(String(item.item_cost||item.cost||0).replace('$','')),
        sell_price: parseFloat(String(item.sell_price||item.price||5).replace('$','')),
        profit_margin: parseFloat(String(item.profit_margin||item.profit||0).replace('$','')),
        where_to_buy: item.where_to_buy||item.where||'',
        category: data.category||'dollar_menu'
      }));
      // Assuming RLS allows insert for authenticated user
      const { error } = await authClient.from('menu_items').insert(rows); // Assuming RLS allows insert for authenticated user
      if (error) {
        console.error('Supabase error saving menu item:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error saving menu item: ${error.message}` }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'get_profile') {
      const { data: profile, error } = await authClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Supabase error getting profile:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Supabase error getting profile: ${error.message}` }) };
      }
      // Get recent convos for memory
      const { data: recent, error: recentError } = await authClient
        .from('conversations')
        .select('question, type, cuisine, meal_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentError) console.error('Supabase error getting recent conversations:', recentError.message);
      return { statusCode: 200, headers, body: JSON.stringify({ profile, recent: recent||[] }) };
    }

    if (action === 'save_food_profile') {
      const { preferences, ai_context } = data;
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ food_preferences: preferences, food_ai_context: ai_context, food_profile_set: true })
        .eq('id', user.id);
      if (error) {
        console.error('Supabase error saving food profile:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    console.error('Unhandled error in save-conversation function:', err.message, err.stack);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function updateHabits(supabase, userId, cuisine, mealType) {
  try {
    if (cuisine) {
      await supabase.rpc('add_to_array', { uid: userId, field: 'favorite_cuisines', val: cuisine });
    }
    if (mealType) {
      await supabase.rpc('add_to_array', { uid: userId, field: 'favorite_meals', val: mealType });
    }
    // This update should be done with a service_role client if it's a background/system task.
    // For now, let's assume RLS allows the user to update their own last_seen.
    // await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  } catch(e) {
    console.error('Error in updateHabits:', e.message);
  }
}
