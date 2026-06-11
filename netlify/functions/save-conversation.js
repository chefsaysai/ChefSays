// netlify/functions/save-conversation.js
// Saves chat history and syncs savings to Supabase

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { action, token, data } = JSON.parse(event.body);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

    if (action === 'save_conversation') {
      const { question, response, type, cuisine, meal_type, tags } = data;
      const { error } = await supabase.from('conversations').insert({
        user_id: user.id, question, response, type: type||'chat', cuisine, meal_type, tags: tags||[]
      });
      if (error) throw error;
      // Update habits
      await updateHabits(user.id, cuisine, meal_type);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'get_history') {
      const { data: convos, error } = await supabase
        .from('conversations')
        .select('question, response, type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ conversations: convos }) };
    }

    if (action === 'save_savings') {
      const { dish_name, amount_saved, home_cost, restaurant_cost, cuisine, meal_type } = data;
      const { error } = await supabase.from('savings').insert({
        user_id: user.id, dish_name, amount_saved, home_cost, restaurant_cost, cuisine, meal_type
      });
      if (error) throw error;
      // Update total
      await supabase.rpc('increment_savings', { uid: user.id, amount: amount_saved });
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
      const { error } = await supabase.from('menu_items').insert(rows);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'get_profile') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      // Get recent convos for memory
      const { data: recent } = await supabase
        .from('conversations')
        .select('question, type, cuisine, meal_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return { statusCode: 200, headers, body: JSON.stringify({ profile, recent: recent||[] }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

async function updateHabits(userId, cuisine, mealType) {
  try {
    if (cuisine) {
      await supabase.rpc('add_to_array', { uid: userId, field: 'favorite_cuisines', val: cuisine });
    }
    if (mealType) {
      await supabase.rpc('add_to_array', { uid: userId, field: 'favorite_meals', val: mealType });
    }
    await supabase.from('profiles').update({ last_seen: new Date().toISOString(), meals_cooked: supabase.raw('meals_cooked + 1') }).eq('id', userId);
  } catch(e) { /* silent */ }
}
