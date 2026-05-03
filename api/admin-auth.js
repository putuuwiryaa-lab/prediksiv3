// api/admin-auth.js
// Vercel Serverless Function — cek password admin
// Password disimpan di environment variable ADMIN_PASSWORD di Vercel dashboard

export default function handler(req, res) {
  // Hanya terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password diperlukan.' });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword) {
    // Env var belum diset di Vercel
    return res.status(500).json({ error: 'Server belum dikonfigurasi.' });
  }

  if (password === correctPassword) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Password salah.' });
}
