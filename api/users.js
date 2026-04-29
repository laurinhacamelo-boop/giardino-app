const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const user = requireAdmin(req, res); if (!user) return;
    const { data } = await supabase.from('users').select('id, username, nome, role, created_at').order('created_at');
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const user = requireAdmin(req, res); if (!user) return;
    const { username, password, nome, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha' });
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users')
      .insert({ username, password_hash: hash, nome: nome || username, role: role || 'viewer' })
      .select('id, username, nome, role').single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    const user = requireAdmin(req, res); if (!user) return;
    const { id } = req.query;
    await supabase.from('users').delete().eq('id', id);
    return res.json({ ok: true });
  }

  res.status(405).end();
};
