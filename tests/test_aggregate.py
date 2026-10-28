import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('aggregate', ROOT / 'scripts/aggregate.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AggregateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.inputs = self.root / 'inbox'
        self.outputs = self.root / 'data'
        self.day = '2026-10-28'
        self.fields = ROOT / 'sources/fields.json'
        for i in range(1, 5):
            self.export(i, [self.item(i)])

    def item(self, i):
        return {'title': f'Title {i}', 'summary': f'Summary {i}', 'detail': 'Details',
                'why_it_matters': 'Impact', 'published': self.day, 'score': 100 - i,
                'sources': [{'name': 'Original', 'url': f'https://example.com/{i}'}]}

    def export(self, i, items, day=None):
        day = day or self.day
        path = self.inputs / day / f'field-{i}.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({'date': day, 'field': f'field-{i}', 'items': items}), encoding='utf-8')

    def run_merge(self, day=None):
        return module.aggregate(self.inputs, self.outputs, self.fields, day or self.day)

    def test_four_fields_sorted_and_repeatable(self):
        data = self.run_merge()
        self.assertEqual([n['score'] for n in data['items']], [99, 98, 97, 96])
        first = [n['id'] for n in data['items']]
        self.assertEqual(first, [n['id'] for n in self.run_merge()['items']])
        self.assertFalse(data['demo'])
        self.assertEqual(json.loads((self.outputs / 'days.json').read_text())['days'], [self.day])

    def test_duplicates_merge_fields_and_remove_tracking(self):
        item = self.item(1)
        item['score'] = 50
        item['sources'][0]['url'] += '?utm_source=task#ref'
        self.export(2, [item])
        data = self.run_merge()
        self.assertEqual(len(data['items']), 3)
        self.assertEqual(data['items'][0]['fields'], ['field-1', 'field-2'])
        self.assertEqual(data['items'][0]['score'], 99)

    def test_missing_export_does_not_publish_partial_edition(self):
        self.run_merge()
        before = (self.outputs / 'index.json').read_bytes()
        (self.inputs / self.day / 'field-4.json').unlink()
        with self.assertRaisesRegex(ValueError, 'missing task exports'):
            self.run_merge()
        self.assertEqual(before, (self.outputs / 'index.json').read_bytes())

    def test_cross_field_duplicates_merge_topics(self):
        first = self.item(1)
        first['topics'] = ['memory', 'framework']
        self.export(1, [first])
        second = self.item(1)
        second['score'] = 50
        second['topics'] = ['skills', 'framework']
        self.export(2, [second])
        merged = self.run_merge()['items'][0]
        self.assertEqual(merged['topics'], ['framework', 'memory', 'skills'])
        self.assertEqual(merged['fields'], ['field-1', 'field-2'])
        self.assertEqual(merged['score'], 99)

    def test_unknown_topics_preserve_last_edition(self):
        self.run_merge()
        before = (self.outputs / 'index.json').read_bytes()
        item = self.item(1)
        item['topics'] = ['unregistered-topic']
        self.export(1, [item])
        with self.assertRaisesRegex(ValueError, 'known topic ids'):
            self.run_merge()
        self.assertEqual(before, (self.outputs / 'index.json').read_bytes())

    def test_invalid_input_does_not_write(self):
        for patch in [{'score': True}, {'score': 101}, {'sources': [{'name': 'X', 'url': 'javascript:alert(1)'}]}, {'published': 'bad'}, {'summary': 'a\nb'}]:
            with self.subTest(patch=patch):
                item = self.item(1)
                item.update(patch)
                self.export(1, [item])
                with self.assertRaises(ValueError):
                    self.run_merge()
                self.assertFalse(self.outputs.exists())

    def test_backfill_keeps_latest_edition(self):
        self.run_merge()
        older = '2026-10-27'
        for i in range(1, 5):
            self.export(i, [], older)
        self.run_merge(older)
        self.assertEqual(json.loads((self.outputs / 'index.json').read_text())['date'], self.day)
        self.assertEqual(json.loads((self.outputs / 'days.json').read_text())['days'], [self.day, older])

    def test_zero_news_is_a_valid_complete_day(self):
        for i in range(1, 5):
            self.export(i, [])
        self.assertEqual(self.run_merge()['items'], [])


if __name__ == '__main__':
    unittest.main()

