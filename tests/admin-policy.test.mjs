import { test } from 'node:test';
import assert from 'node:assert/strict';
import { permiteAdministracao } from '../src/lib/auth/admin-policy.ts';

const admin = { id: 'admin-id', role: 'admin', is_active: true };
const password = { sub: 'admin-id', amr: [{ method: 'password' }] };
for (const [name, profile, claims, allowed] of [
  ['admin ativo com senha', admin, password, true],
  ['admin Google sem senha', admin, { sub: 'admin-id', amr: [{ method: 'oauth' }] }, false],
  ['cliente com senha', { ...admin, role: 'client' }, password, false],
  ['barbeiro com senha', { ...admin, role: 'barber' }, password, false],
  ['admin inativo', { ...admin, is_active: false }, password, false],
  ['sem perfil', null, password, false],
  ['sem claims', admin, null, false],
  ['claims de outra conta', admin, { ...password, sub: 'outro' }, false],
  ['perfil de outra conta', { ...admin, id: 'outro' }, password, false],
  ['metadados não substituem autenticação', admin, { sub: 'admin-id', user_metadata: { role: 'admin', method: 'password' } }, false],
  ['amr inválido', admin, { sub: 'admin-id', amr: [null, 'password', {}] }, false],
  ['refresh mantém autenticação com senha', admin, { ...password, amr: [{ method: 'password' }, { method: 'token_refresh' }] }, true]
]) test(name, () => assert.equal(permiteAdministracao('admin-id', profile, claims), allowed));
