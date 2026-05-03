// api/admin-auth.js
// Set di Vercel Environment Variables:
//   ADMIN_PASSWORD  = password admin kamu
//   SUPABASE_ANON_KEY = anon key Supabase kamu

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password diperlukan.' });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!correctPassword) {
    return res.status(500).json({ error: 'Server belum dikonfigurasi.' });
  }

  if (password === correctPassword) {
    // Return anon key hanya setelah login berhasil
    // Tidak perlu disimpan di kode frontend sama sekali
    return res.status(200).json({ ok: true, key: anonKey || '' });
  }

  return res.status(401).json({ error: 'Password salah.' });
};
