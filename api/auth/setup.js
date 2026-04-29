const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../lib/supabase');
const { JWT_SECRET } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    return res.json({ required: count === 0 });
  }

  if (req.method === 'POST') {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (count > 0) return res.status(403).json({ error: 'Setup já realizado' });

    const { username, password, nome } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha' });

    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert({
      username, password_hash: hash, nome: nome || username, role: 'admin'
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });

    const token = jwt.sign(
      { id: data.id, username, role: 'admin', nome: data.nome },
      JWT_SECRET, { expiresIn: '30d' }
    );
    return res.json({ token, user: { username, role: 'admin', nome: data.nome } });
  }

  res.status(405).end();
};
