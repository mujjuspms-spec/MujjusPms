import { prisma } from './prisma.js';
import { supabase } from './supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.query.token || null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const { data: { user: supaUser }, error } = await supabase.auth.getUser(token);
    if (error || !supaUser) return res.status(401).json({ error: 'Invalid or expired token' });

    let user = await prisma.user.findUnique({ where: { id: supaUser.id } });

    if (!user) {
      const email = supaUser.email?.toLowerCase();
      if (!email) return res.status(400).json({ error: 'Email required' });

      const name = supaUser.user_metadata?.name || email.split('@')[0];
      const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

      user = await prisma.user.create({
        data: {
          id: supaUser.id,
          name,
          email,
          role: '',
          globalRole: 'member',
          color: 'var(--cat-1)',
          initials,
          passwordHash: '',
          capacity: 40,
          allocated: 0,
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, avatarStoredName, ...rest } = u;
  return { ...rest, avatarUrl: avatarStoredName ? `/api/people/${u.id}/avatar` : null };
}

export function signToken(user) {
  return '';
}
