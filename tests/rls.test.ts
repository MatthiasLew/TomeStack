import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL RLS isolates two users, anonymous clients and legacy user-prefix rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id UUID PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;`);
    const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
    await db.exec(schema); await db.exec(schema); // Existing installations can rerun safely.
    const a = '00000000-0000-0000-0000-000000000001';
    const b = '00000000-0000-0000-0000-000000000002';
    await db.exec(`INSERT INTO auth.users VALUES ('${a}'), ('${b}');
      INSERT INTO public.profiles (id,name,email) VALUES ('${a}','A','a@example.com'),('${b}','B','b@example.com');
      INSERT INTO public.user_books (user_id,book_id,edition_id) VALUES ('${a}','a','ed-a'),('${b}','b','ed-b'),('user-legacy','legacy','ed-old');
      INSERT INTO public.custom_books (id,user_id,title,author,format_type) VALUES ('a','${a}','A','Author','hardcover'),('b','${b}','B','Author','paperback'),('old','user-legacy','Old','Author','paperback');
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      SET ROLE anon;`);
    for (const table of ['profiles', 'user_books', 'custom_books']) assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 0);
    await assert.rejects(db.exec("INSERT INTO public.user_books (user_id,book_id,edition_id) VALUES ('user-attack','x','x')"), /row-level security/);
    await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${a}',false);`);
    for (const table of ['profiles', 'user_books', 'custom_books']) assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 1);
    await db.exec(`INSERT INTO public.user_books (user_id,book_id,edition_id) VALUES ('${a}','new','new');`);
    await assert.rejects(db.exec(`INSERT INTO public.user_books (user_id,book_id,edition_id) VALUES ('${b}','attack','attack')`), /row-level security/);
    await assert.rejects(db.exec(`UPDATE public.user_books SET user_id='${b}' WHERE book_id='a'`), /row-level security/);
    assert.equal((await db.query(`DELETE FROM public.user_books WHERE user_id='${b}' RETURNING *`)).rows.length, 0);
    assert.equal((await db.query(`UPDATE public.custom_books SET title='attack' WHERE user_id='${b}' RETURNING *`)).rows.length, 0);
    await assert.rejects(db.exec(`INSERT INTO public.custom_books (id,user_id,title,author,format_type) VALUES ('attack','user-forged','x','x','hardcover')`), /row-level security/);
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${b}',false);`);
    assert.deepEqual((await db.query('SELECT book_id FROM public.user_books')).rows, [{ book_id: 'b' }]);
    assert.deepEqual((await db.query('SELECT email FROM public.profiles')).rows, [{ email: 'b@example.com' }]);
  } finally { await db.close(); }
});
