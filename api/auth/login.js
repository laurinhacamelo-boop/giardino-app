const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../../lib/supabase');
const { JWT_SECRET } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1);

  const user = users?.[0];
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, nome: user.nome },
    JWT_SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { username: user.username, role: user.role, nome: user.nome } });
};
