const supabase = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

// Returns a Vercel serverless handler for a given Supabase table
function makeCrud(table, orderCol = 'created_at') {
  return async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const user = requireAuth(req, res);
    if (!user) return;

    // GET /api/table or /api/table?id=xxx
    if (req.method === 'GET') {
      const { id } = req.query;
      if (id) {
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (error) return res.status(404).json({ error: error.message });
        return res.json(data);
      }
      const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data || []);
    }

    // POST /api/table
    if (req.method === 'POST') {
      if (user.role === 'viewer') return res.status(403).json({ error: 'Sem permissão' });
      const payload = { ...req.body, created_by: user.username };
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // PUT /api/table?id=xxx
    if (req.method === 'PUT') {
      if (user.role === 'viewer') return res.status(403).json({ error: 'Sem permissão' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID obrigatório' });
      const payload = { ...req.body, updated_by: user.username, updated_at: new Date().toISOString() };
      delete payload.id;
      const { error } = await supabase.from(table).update(payload).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    // DELETE /api/table?id=xxx
    if (req.method === 'DELETE') {
      if (user.role === 'viewer') return res.status(403).json({ error: 'Sem permissão' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'ID obrigatório' });
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    res.status(405).end();
  };
}

module.exports = makeCrud;
