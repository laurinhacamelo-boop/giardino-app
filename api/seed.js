// POST /api/seed?secret=SEU_JWT_SECRET
// Roda UMA vez para carregar os dados iniciais da planilha
const supabase = require('../lib/supabase');
const fichasData = require('../data/fichas_seed.json');
const insumosData = require('../data/insumos_seed.json');
const transfData = require('../data/transformados_seed.json');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  // Simple secret check
  if (req.query.secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Proibido' });
  }

  try {
    // Check if already seeded
    const { count } = await supabase.from('insumos').select('*', { count: 'exact', head: true });
    if (count > 0) return res.json({ ok: true, message: `Já tem ${count} insumos, seed ignorado` });

    // Seed insumos in batches of 50
    for (let i = 0; i < insumosData.length; i += 50) {
      const batch = insumosData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => rest);
      await supabase.from('insumos').insert(batch);
    }

    // Seed fichas
    for (let i = 0; i < fichasData.length; i += 50) {
      const batch = fichasData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => ({
        ...rest,
        insumos: rest.insumos || [],
        modo_preparo: rest.modo_preparo || [],
        mise_en_place: rest.mise_en_place || []
      }));
      await supabase.from('fichas').insert(batch);
    }

    // Seed transformados
    for (let i = 0; i < transfData.length; i += 50) {
      const batch = transfData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => ({
        ...rest,
        insumos: rest.insumos || [],
        modo_preparo: rest.modo_preparo || [],
        mise_en_place: rest.mise_en_place || []
      }));
      await supabase.from('transformados').insert(batch);
    }

    res.json({
      ok: true,
      message: `Seed completo: ${insumosData.length} insumos, ${fichasData.length} fichas, ${transfData.length} transformados`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
