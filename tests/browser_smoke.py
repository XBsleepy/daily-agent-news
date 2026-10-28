"""Optional browser tests; serve a disposable copy so real editions stay unchanged."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
from threading import Thread

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', help='Chromium executable; omit for Playwright bundled Chromium')
    parser.add_argument('--screenshot', help='Optional desktop demo screenshot path')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('aggregate', ROOT / 'scripts/aggregate.py')
    aggregate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(aggregate)
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        shutil.copytree(ROOT / 'docs', root / 'docs')
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root / 'docs')))
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            url = f'http://127.0.0.1:{server.server_port}/'
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox'])
                page = browser.new_page(viewport={'width': 1440, 'height': 1100})
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(url + '?live=1')
                expect(page.locator('#feed')).to_contain_text('尚未接入日报')
                expect(page.locator('#demo-notice')).to_be_hidden()
                page.goto(url + '?demo=1')
                expect(page.locator('.news-row')).to_have_count(8)
                expect(page.locator('#demo-notice')).to_be_visible()
                if args.screenshot:
                    page.screenshot(path=args.screenshot, full_page=True)
                page.locator('.news-row').first.click()
                expect(page.locator('#detail')).to_be_visible()
                expect(page.locator('#detail-title')).to_contain_text('Aurora')
                expect(page.locator('.source-list a')).to_have_attribute('rel', 'noopener noreferrer')
                permalink = page.url
                page.reload()
                expect(page.locator('#detail')).to_be_visible()
                page.keyboard.press('Escape')
                expect(page.locator('#detail')).not_to_be_visible()
                assert '#news=' not in page.url
                page.locator('#filters button[data-field="field-4"]').click()
                expect(page.locator('.news-row')).to_have_count(2)
                page.locator('#reset').click()
                page.locator('#search').fill('Forge')
                expect(page.locator('.news-row')).to_have_count(1)
                page.locator('#search').fill('不存在的关键词')
                expect(page.locator('#feed')).to_contain_text('没有匹配的新闻')
                page.locator('#reset').click()
                page.locator('#theme').click()
                page.reload()
                expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
                page.locator('#theme').click()
                page.set_viewport_size({'width': 390, 'height': 844})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.locator('.news-row').first.click()
                expect(page.locator('#detail')).to_be_visible()
                assert page.locator('#detail').bounding_box()['width'] <= 390
                page.locator('#close-detail').click()
                # Generate two actual editions in the disposable site and verify archive navigation.
                for day in ['2026-01-01', '2026-01-02']:
                    folder = root / 'inbox' / day
                    folder.mkdir(parents=True)
                    for source in (ROOT / 'sources/examples').glob('*.json'):
                        payload = json.loads(source.read_text())
                        payload['date'] = day
                        (folder / source.name).write_text(json.dumps(payload))
                    aggregate.aggregate(root / 'inbox', root / 'docs/data', ROOT / 'sources/fields.json', day)
                page.goto(url)
                expect(page.locator('.news-row')).to_have_count(4)
                expect(page.locator('#demo-notice')).to_be_hidden()
                expect(page.locator('#edition')).to_have_value('2026-01-02')
                page.locator('#edition').select_option('2026-01-01')
                expect(page.locator('#edition-date')).to_contain_text('2026-01-01')
                page.goto(url + '?date=2026-99-99')
                expect(page.locator('#feed')).to_contain_text('所选日期暂无日报')
                # Untrusted task text must render as text, never execute HTML.
                demo = json.loads((root / 'docs/data/demo.json').read_text())
                demo['items'][0]['summary'] = '<img src=x onerror="window.injected=true">'
                (root / 'docs/data/demo.json').write_text(json.dumps(demo))
                page.goto(url + '?demo=1')
                expect(page.locator('.news-row')).to_have_count(8)
                assert page.locator('#feed img').count() == 0
                assert page.evaluate('window.injected') is None
                assert not errors, errors
                browser.close()
                print('PASS: empty state, demo, details, permalink, filters, search, theme persistence, mobile, archive, invalid date, safe text rendering')
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
