import db from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed: creates a small set of demo users so login + invite works out of the box.
 * No fake workspaces, columns, or tasks. Users create their own.
 */
function seed() {
  console.log('Seeding database...');

  const password = process.env.DEMO_PASSWORD || 'Demo123';
  const passwordHash = bcrypt.hashSync(password, 12);

  const users = [
    { email: 'demo@demo.com',  name: 'Demo User',  seed: 'DemoUser' },
    { email: 'alice@demo.com', name: 'Alice Chen', seed: 'Alice' },
    { email: 'bob@demo.com',   name: 'Bob Tanaka', seed: 'Bob' },
    { email: 'carol@demo.com', name: 'Carol Reyes', seed: 'Carol' },
  ];

  for (const u of users) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (existing) {
      // Refresh password (idempotent)
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, existing.id);
    } else {
      db.prepare(
        'INSERT INTO users (id, email, name, avatar, password_hash) VALUES (?, ?, ?, ?, ?)'
      ).run(
        uuidv4(),
        u.email,
        u.name,
        `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${u.seed}`,
        passwordHash
      );
    }
  }

  console.log('Seed complete.');
  console.log('Login with any of:');
  for (const u of users) {
    console.log(`  ${u.email} / ${password}`);
  }
}

seed();
