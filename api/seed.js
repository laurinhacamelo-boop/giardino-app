const supabase = require('../lib/supabase');
const fichasData = require('../data/fichas_seed.json');
const insumosData = require('../data/insumos_seed.json');
const transfData = require('../data/transformados_seed.json');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
    if (req.query.secret !== process.env.JWT_SECRET) return res.status(403).json({ error: 'Proibido' });

    try {
          const { count: fichaCount } = await supabase.from('fichas').select('*', { count: 'exact', head: true });
          const { count: insumoCount } = await supabase.from('insumos').select('*', { count: 'exact', head: true });
          const { count: transfCount } = await supabase.from('transformados').select('*', { count: 'exact', head: true });
          const results = {};

      if (!insumoCount) {
              for (let i = 0; i < insumosData.length; i += 50) {
                        const batch = insumosData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => rest);
                        const { error } = await supabase.from('insumos').insert(batch);
                        if (error) { results.insumos_error = error.message; break; }
              }
              results.insumos = 'seeded ' + insumosData.length;
      } else { results.insumos = 'already ' + insumoCount; }

      if (!fichaCount) {
              for (let i = 0; i < fichasData.length; i += 50) {
                        const batch = fichasData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => ({ ...rest, insumos: rest.insumos||[], modo_preparo: rest.modo_preparo||[], mise_en_place: rest.mise_en_place||[] }));
                        const { error } = await supabase.from('fichas').insert(batch);
                        if (error) { results.fichas_error = error.message; break; }
              }
              results.fichas = 'seeded ' + fichasData.length;
      } else { results.fichas = 'already ' + fichaCount; }

      if (!transfCount) {
              for (let i = 0; i < transfData.length; i += 50) {
                        const batch = transfData.slice(i, i + 50).map(({ id, _seeded, ...rest }) => ({ ...rest, insumos: rest.insumos||[], modo_preparo: rest.modo_preparo||[], mise_en_place: rest.mise_en_place||[] }));
                        const { error } = await supabase.from('transformados').insert(batch);
                        if (error) { results.transformados_error = error.message; break; }
              }
              results.transformados = 'seeded ' + transfData.length;
      } else { results.transformados = 'already ' + transfCount; }

      res.json({ ok: true, results });
    } catch (e) {
          res.status(500).json({ error: e.message });
    }
};
