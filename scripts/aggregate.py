#!/usr/bin/env python3
"""Merge four domain task exports into a dated, static daily news edition."""
import argparse
from datetime import date, datetime
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
TZ = ZoneInfo('Asia/Shanghai')


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def text(value, label, limit=30000):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f'{label}: required nonempty string, max {limit} characters')
    return value.strip()


def canonical_url(value):
    value = text(value, 'source URL', 4000)
    u = urlsplit(value)
    if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password or re.search(r'\s', value):
        raise ValueError('source URL must be an HTTP(S) URL without credentials or whitespace')
    query = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid', 'gclid')]
    return urlunsplit((u.scheme.lower(), u.netloc.lower(), u.path or '/', urlencode(sorted(query)), ''))


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('date must be YYYY-MM-DD')
    date.fromisoformat(value)
    return value


def aggregate(input_dir, output_dir, fields_path, day, brief=''):
    valid_date(day)
    config = read(fields_path)
    fields = config['fields']
    topic_groups = config.get('topic_groups', [])
    topics = config.get('topics', [])
    if not isinstance(topic_groups, list) or not isinstance(topics, list):
        raise ValueError('topics and topic_groups must be lists')
    groups = set()
    for group in topic_groups:
        gid = text(group['id'], 'topic group id', 80)
        if gid in groups:
            raise ValueError('topic group ids must be unique')
        groups.add(gid)
        text(group['name'], 'topic group name', 80)
    topic_ids = set()
    for topic in topics:
        tid = text(topic['id'], 'topic id', 80)
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', tid) or tid in topic_ids or topic.get('group') not in groups:
            raise ValueError('topic ids must be unique slugs with a known group')
        topic_ids.add(tid)
        text(topic['name'], 'topic name', 80)
    if len(fields) != 4:
        raise ValueError('exactly four fields are required')
    ids = set()
    for f in fields:
        fid = text(f['id'], 'field id', 80)
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', fid) or fid in ids:
            raise ValueError('field ids must be unique lowercase URL slugs')
        ids.add(fid)
        text(f['name'], 'field name', 80)
    missing = [f['id'] for f in fields if not (input_dir / day / f"{f['id']}.json").is_file()]
    if missing:
        raise ValueError('missing task exports: ' + ', '.join(missing))
    candidates = []
    for f in fields:
        payload = read(input_dir / day / f"{f['id']}.json")
        if payload.get('date') != day or payload.get('field') != f['id']:
            raise ValueError(f"{f['id']}: date or field mismatch")
        if not isinstance(payload.get('items'), list):
            raise ValueError(f"{f['id']}: items must be a list (empty is allowed)")
        for item in payload['items']:
            score = item.get('score')
            if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
                raise ValueError('score must be an integer between 0 and 100')
            summary = text(item.get('summary'), 'summary', 240)
            if '\n' in summary or '\r' in summary:
                raise ValueError('summary must be a single paragraph')
            sources = item.get('sources')
            if not isinstance(sources, list) or not sources:
                raise ValueError('at least one original source is required')
            sources = [{'name': text(s.get('name'), 'source name', 200), 'url': canonical_url(s.get('url'))} for s in sources]
            primary = sources[0]['url']
            item_topics = item.get('topics', [])
            if not isinstance(item_topics, list) or any(not isinstance(t, str) or t not in topic_ids for t in item_topics):
                raise ValueError('item topics must be a list of known topic ids')
            candidates.append({
                'id': hashlib.sha256(primary.encode()).hexdigest()[:16],
                'title': text(item.get('title'), 'title', 300),
                'summary': summary,
                'intro': text(item['intro'], 'intro', 10000) if item.get('intro') is not None else '',
                'detail': text(item.get('detail'), 'detail'),
                'findings': text(item['findings'], 'findings', 10000) if item.get('findings') is not None else '',
                'why_it_matters': text(item.get('why_it_matters'), 'why_it_matters'),
                'published': valid_date(item.get('published')),
                'score': score, 'fields': [f['id']], 'sources': sources,
                'topics': sorted(set(item_topics)),
            })
    # Highest editorial score wins; matching primary URLs merge provenance.
    merged = {}
    for item in sorted(candidates, key=lambda n: (-n['score'], n['id'])):
        key = item['id']
        if key not in merged:
            merged[key] = item
        else:
            existing = merged[key]
            existing['fields'] = sorted(set(existing['fields'] + item['fields']))
            existing['topics'] = sorted(set(existing['topics'] + item['topics']))
            known = {s['url'] for s in existing['sources']}
            for source in item['sources']:
                if source['url'] not in known:
                    existing['sources'].append(source)
                    known.add(source['url'])
    data = {
        'schema_version': 1, 'demo': False, 'date': day,
        'generated_at': datetime.now(TZ).isoformat(timespec='seconds'),
        'fields': fields, 'topic_groups': topic_groups, 'topics': topics,
        'brief': brief.strip(),
        'items': list(merged.values()),
    }
    # All inputs are validated before any output is changed. Each JSON is replaced atomically.
    days_dir = output_dir / 'days'
    days_dir.mkdir(parents=True, exist_ok=True)
    write_json(days_dir / f'{day}.json', data)
    days = sorted((p.stem for p in days_dir.glob('????-??-??.json')), reverse=True)
    write_json(output_dir / 'index.json', read(days_dir / f'{days[0]}.json'))
    write_json(output_dir / 'days.json', {'days': days})
    return data


def write_json(path, data):
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--date', default=datetime.now(TZ).date().isoformat())
    parser.add_argument('--input-dir', type=Path, default=ROOT / 'sources/inbox')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'docs/data')
    parser.add_argument('--fields', type=Path, default=ROOT / 'sources/fields.json')
    parser.add_argument('--brief-file', type=Path, help='UTF-8 daily editorial introduction')
    args = parser.parse_args()
    try:
        data = aggregate(args.input_dir, args.output_dir, args.fields, args.date,
                         args.brief_file.read_text(encoding='utf-8') if args.brief_file else '')
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, f'Aggregation failed: {error}\n')
    print(f"Generated {data['date']}: {len(data['items'])} news items")


if __name__ == '__main__':
    main()

