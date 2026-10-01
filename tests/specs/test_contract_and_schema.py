"""Verificações preparatórias. Não são testes de frontend/backend implementados."""
import json
import re
import sqlite3
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = (ROOT / 'database/001_schema.sql').read_text(encoding='utf-8')
CONTRACT = json.loads((ROOT / 'specs/openapi.json').read_text(encoding='utf-8'))


def initialize(db):
    db.executescript(SCHEMA)
    db.execute('INSERT INTO users(username, name, password_hash) VALUES (?, ?, ?)',
               ('ana', 'Ana Teste', 'hash-exclusivo-de-fixture'))
    db.execute('INSERT INTO users(username, name, password_hash) VALUES (?, ?, ?)',
               ('bruno', 'Bruno Teste', 'hash-exclusivo-de-fixture'))


def insert_request(db, **overrides):
    values = dict(title='Notebook não liga', description='Notebook apresenta tela preta.',
                  category='TI', requester_id=1)
    values.update(overrides)
    keys = list(values)
    return db.execute(f'INSERT INTO requests ({", ".join(keys)}) VALUES ({", ".join("?" for _ in keys)})',
                      [values[key] for key in keys]).lastrowid


class DatabaseSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        initialize(self.db)
        self.id = insert_request(self.db)

    def test_foreign_keys_enabled(self):
        self.assertEqual(self.db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
        with self.assertRaises(sqlite3.IntegrityError):
            insert_request(self.db, requester_id=999)

    def test_defaults_and_canonical_utc_dates(self):
        row = self.db.execute('SELECT * FROM requests WHERE id = ?', (self.id,)).fetchone()
        self.assertEqual(row['status'], 'ABERTO')
        for key in ['created_at', 'updated_at']:
            self.assertRegex(row[key], r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')

    def test_title_boundaries_and_unicode(self):
        for title in ['ab', 'x' * 121, '   ', ' título ']:
            with self.subTest(title=title), self.assertRaises(sqlite3.IntegrityError):
                insert_request(self.db, title=title)
        for title in ['abc', 'x' * 120, '😀' * 120]:
            with self.subTest(valid_length=len(title)):
                insert_request(self.db, title=title)

    def test_description_boundaries(self):
        for description in ['x' * 9, 'x' * 5001, ' descrição longa ']:
            with self.subTest(length=len(description)), self.assertRaises(sqlite3.IntegrityError):
                insert_request(self.db, description=description)
        for description in ['x' * 10, 'x' * 5000]:
            insert_request(self.db, description=description)

    def test_category_and_status_reject_unknown_values(self):
        for field, value in [('category', 'OUTRA'), ('status', 'CANCELADO')]:
            with self.subTest(field=field), self.assertRaises(sqlite3.IntegrityError):
                insert_request(self.db, **{field: value})

    def test_nullable_business_fields_rejected(self):
        for field in ['title', 'description', 'category', 'requester_id', 'status']:
            with self.subTest(field=field), self.assertRaises(sqlite3.IntegrityError):
                insert_request(self.db, **{field: None})

    def test_username_unique_and_normalized(self):
        for username in ['ana', 'Ana', 'ab', 'com espaço', 'x' * 51]:
            with self.subTest(username=username), self.assertRaises(sqlite3.IntegrityError):
                self.db.execute('INSERT INTO users(username, name, password_hash) VALUES (?, ?, ?)',
                                (username, 'Teste', 'hash'))

    def test_forward_transitions_and_same_state(self):
        for status in ['ABERTO', 'EM_ATENDIMENTO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CONCLUIDO']:
            self.db.execute('UPDATE requests SET status = ? WHERE id = ?', (status, self.id))
            self.assertEqual(self.db.execute('SELECT status FROM requests WHERE id = ?',
                                            (self.id,)).fetchone()[0], status)

    def test_skip_backward_and_reopen_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('CONCLUIDO', self.id))
        self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('EM_ATENDIMENTO', self.id))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('ABERTO', self.id))
        self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('CONCLUIDO', self.id))
        for status in ['ABERTO', 'EM_ATENDIMENTO']:
            with self.subTest(status=status), self.assertRaises(sqlite3.IntegrityError):
                self.db.execute('UPDATE requests SET status = ? WHERE id = ?', (status, self.id))

    def test_edit_and_delete_nonopen_rejected(self):
        for status in ['EM_ATENDIMENTO', 'CONCLUIDO']:
            self.db.execute('UPDATE requests SET status = ? WHERE id = ?', (status, self.id))
            for field, value in [('title', 'Novo título'), ('description', 'Descrição alterada válida'),
                                 ('category', 'RH')]:
                with self.subTest(status=status, field=field), self.assertRaises(sqlite3.IntegrityError):
                    self.db.execute(f'UPDATE requests SET {field} = ? WHERE id = ?', (value, self.id))
            with self.assertRaises(sqlite3.IntegrityError):
                self.db.execute('DELETE FROM requests WHERE id = ?', (self.id,))

    def test_edit_open_and_delete_open_allowed(self):
        self.db.execute('UPDATE requests SET title = ? WHERE id = ?', ('Novo título', self.id))
        self.assertEqual(self.db.execute('SELECT title FROM requests WHERE id = ?',
                                        (self.id,)).fetchone()[0], 'Novo título')
        self.db.execute('DELETE FROM requests WHERE id = ?', (self.id,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM requests').fetchone()[0], 0)

    def test_author_and_creation_immutable(self):
        for field, value in [('requester_id', 2), ('created_at', '2026-10-01T00:00:00.000Z')]:
            with self.subTest(field=field), self.assertRaises(sqlite3.IntegrityError):
                self.db.execute(f'UPDATE requests SET {field} = ? WHERE id = ?', (value, self.id))

    def test_guarded_write_after_interleaved_status_change(self):
        self.assertEqual(self.db.execute('SELECT status FROM requests WHERE id = ?',
                                        (self.id,)).fetchone()[0], 'ABERTO')
        self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('EM_ATENDIMENTO', self.id))
        edited = self.db.execute('UPDATE requests SET title = ? WHERE id = ? AND requester_id = ? AND status = ?',
                                 ('Alteração tardia', self.id, 1, 'ABERTO'))
        deleted = self.db.execute('DELETE FROM requests WHERE id = ? AND requester_id = ? AND status = ?',
                                  (self.id, 1, 'ABERTO'))
        self.assertEqual((edited.rowcount, deleted.rowcount), (0, 0))
        self.assertEqual(self.db.execute('SELECT title FROM requests WHERE id = ?',
                                        (self.id,)).fetchone()[0], 'Notebook não liga')

    def test_author_condition_blocks_other_user_write(self):
        result = self.db.execute('UPDATE requests SET title = ? WHERE id = ? AND requester_id = ? AND status = ?',
                                 ('Alteração indevida', self.id, 2, 'ABERTO'))
        self.assertEqual(result.rowcount, 0)

    def test_user_with_requests_cannot_be_deleted(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute('DELETE FROM users WHERE id = 1')

    def test_request_id_not_reused_after_delete(self):
        self.db.execute('DELETE FROM requests WHERE id = ?', (self.id,))
        self.assertGreater(insert_request(self.db), self.id)

    def test_session_supports_anonymous_and_authenticated_users(self):
        for token, user_id in [('a' * 64, None), ('b' * 64, 2)]:
            self.db.execute('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)',
                            (token, user_id, 'c' * 32, '2026-10-01T12:00:00.000Z', '2026-10-01T20:00:00.000Z'))
        self.db.execute('DELETE FROM users WHERE id = 2')
        self.assertEqual(self.db.execute('SELECT count(*) FROM sessions').fetchone()[0], 1)
        self.assertIsNone(self.db.execute('SELECT user_id FROM sessions').fetchone()[0])

    def test_session_constraints(self):
        base = ['a' * 64, 1, 'c' * 32, '2026-10-01T12:00:00.000Z', '2026-10-01T20:00:00.000Z']
        for index, invalid in [(0, None), (0, 'raw-token'), (0, 'g' * 64),
                               (1, 999), (2, 'short'), (4, base[3])]:
            values = base.copy()
            values[index] = invalid
            with self.subTest(index=index, invalid=invalid), self.assertRaises(sqlite3.IntegrityError):
                self.db.execute('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)', values)

    def test_database_survives_connection_restart(self):
        with tempfile.TemporaryDirectory(prefix='portal-spec-test-') as directory:
            path = Path(directory) / 'test.sqlite'
            with sqlite3.connect(path) as db:
                initialize(db)
                request_id = insert_request(db)
            db.close()
            with sqlite3.connect(path) as reopened:
                self.assertEqual(reopened.execute('SELECT title FROM requests WHERE id = ?',
                                                 (request_id,)).fetchone()[0], 'Notebook não liga')
            reopened.close()

    def test_dashboard_aggregate_invariant_on_fixture(self):
        # Valida a agregação proposta, não um endpoint HTTP ainda inexistente.
        second = insert_request(self.db, requester_id=2, category='RH')
        third = insert_request(self.db, requester_id=2, category='COMPRAS')
        for request_id in [second, third]:
            self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('EM_ATENDIMENTO', request_id))
        self.db.execute('UPDATE requests SET status = ? WHERE id = ?', ('CONCLUIDO', third))
        result = self.db.execute("SELECT count(*), sum(status = 'ABERTO'), sum(status = 'EM_ATENDIMENTO'), sum(status = 'CONCLUIDO') FROM requests").fetchone()
        self.assertEqual(tuple(result), (3, 1, 1, 1))
        self.assertEqual(result[0], sum(result[1:]))


class ContractTests(unittest.TestCase):
    def test_openapi_version_and_paths(self):
        self.assertEqual(CONTRACT['openapi'], '3.1.0')
        expected = {'/auth/session': {'get'}, '/auth/login': {'post'}, '/auth/logout': {'post'},
                    '/requests': {'get', 'post'}, '/requests/{id}': {'get', 'put', 'delete'},
                    '/requests/{id}/status': {'patch'}, '/dashboard': {'get'}}
        self.assertEqual({path: set(operations) for path, operations in CONTRACT['paths'].items()}, expected)

    def test_all_local_references_resolve(self):
        def walk(value):
            if isinstance(value, dict):
                if '$ref' in value:
                    ref = value['$ref']
                    self.assertTrue(ref.startswith('#/'))
                    cursor = CONTRACT
                    for segment in ref[2:].split('/'):
                        cursor = cursor[segment.replace('~1', '/').replace('~0', '~')]
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(CONTRACT)

    def test_security_defaults_and_public_endpoints(self):
        self.assertEqual(CONTRACT['security'], [{'sessionCookie': []}])
        public = set()
        for path, methods in CONTRACT['paths'].items():
            for method, operation in methods.items():
                if operation.get('security') == []:
                    public.add((path, method))
                elif path not in ['/auth/session', '/auth/login']:
                    self.assertIn('401', operation['responses'])
        self.assertEqual(public, {('/auth/session', 'get'), ('/auth/login', 'post')})

    def test_all_mutations_require_csrf_and_error_response(self):
        for path, methods in CONTRACT['paths'].items():
            for method, operation in methods.items():
                if method in ['post', 'put', 'patch', 'delete']:
                    with self.subTest(path=path, method=method):
                        headers = [p for p in operation.get('parameters', []) if p['in'] == 'header']
                        self.assertTrue(any(p['name'] == 'X-CSRF-Token' and p['required'] for p in headers))
                        self.assertIn('403', operation['responses'])

    def test_input_schemas_disallow_server_owned_fields(self):
        schemas = CONTRACT['components']['schemas']
        fields = schemas['RequestInput']['properties']
        self.assertEqual(set(fields), {'title', 'description', 'category'})
        for name in ['LoginInput', 'RequestInput', 'StatusInput']:
            self.assertFalse(schemas[name]['additionalProperties'])
            self.assertEqual(set(schemas[name]['required']), set(schemas[name]['properties']))

    def test_public_user_excludes_secrets(self):
        fields = CONTRACT['components']['schemas']['User']['properties']
        self.assertEqual(set(fields), {'id', 'username', 'name'})

    def test_database_enums_match_contract(self):
        for category in CONTRACT['components']['schemas']['Category']['enum']:
            with sqlite3.connect(':memory:') as db:
                initialize(db)
                insert_request(db, category=category)
            db.close()
        for status in CONTRACT['components']['schemas']['Status']['enum']:
            self.assertIn(f"'{status}'", SCHEMA)

    def test_path_parameters_and_operation_ids(self):
        ids = []
        for path, methods in CONTRACT['paths'].items():
            names = set(re.findall(r'\{([^}]+)\}', path))
            for operation in methods.values():
                declared = {p['name'] for p in operation.get('parameters', [])
                            if p['in'] == 'path' and p['required']}
                self.assertEqual(names, declared)
                ids.append(operation['operationId'])
        self.assertEqual(len(ids), len(set(ids)))

    def test_all_requirements_are_traced(self):
        prd = (ROOT / 'docs/PRD.md').read_text(encoding='utf-8')
        trace = (ROOT / 'docs/TRACEABILITY.md').read_text(encoding='utf-8')
        requirements = set(re.findall(r'\b(?:RF|NFR|ENT)-\d{3}\b', prd))
        self.assertEqual(len(requirements), 21)
        self.assertTrue(requirements <= set(re.findall(r'\b(?:RF|NFR|ENT)-\d{3}\b', trace)))

    def test_scenarios_have_unique_identifiers(self):
        expected = {'AUTH': 10, 'REQ': 16, 'DASH': 6}
        counts = dict.fromkeys(expected, 0)
        ids = []
        for path in (ROOT / 'specs').glob('*.md'):
            for scenario in re.findall(r'^\| ((?:AUTH|REQ|DASH)-\d{2}) \|', path.read_text(encoding='utf-8'), re.M):
                ids.append(scenario)
                counts[scenario.split('-')[0]] += 1
        self.assertEqual(counts, expected)
        self.assertEqual(len(ids), len(set(ids)))

    def test_markdown_relative_links_point_to_existing_files(self):
        paths = [*ROOT.glob('*.md'), *(ROOT / 'docs').rglob('*.md'), *(ROOT / 'specs').glob('*.md')]
        for path in paths:
            for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
                if target.startswith(('https://', 'http://', '#')):
                    continue
                with self.subTest(file=str(path.relative_to(ROOT)), link=target):
                    self.assertTrue((path.parent / target.split('#')[0]).exists())


if __name__ == '__main__':
    unittest.main()
