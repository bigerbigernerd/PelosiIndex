import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'research/v2/pipeline'))
sys.path.insert(0, str(ROOT / 'scripts'))
from parse_ptr import amount_bounds
from parse_form4 import parse_file
from parse_13f import period_rows
from fetch_sources import validated_entry


class DisclosureRules(unittest.TestCase):
    def test_amount_intervals_keep_open_upper_bound(self):
        self.assertEqual(amount_bounds('$1,000,001 - $5,000,000'), (1000001, 5000000))
        self.assertEqual(amount_bounds('Over $50,000,000'), (50000000, None))
        self.assertEqual(amount_bounds('$1,200.50'), (1200.50, 1200.50))

    def test_derivatives_and_plan_flags_survive(self):
        parsed = parse_file(ROOT / 'tests/fixtures/form4.xml')
        self.assertTrue(parsed['aff10b5One'])
        self.assertEqual(parsed['issuer']['ticker'], 'TEST')
        self.assertEqual([(r['table'], r['code']) for r in parsed['tx']], [('nd', 'F'), ('d', 'M')])
        self.assertEqual(parsed['tx'][0]['direct'], 'I')
        self.assertEqual(parsed['tx'][0]['footnotes'], ['Tax withholding, not an open-market sale.'])

    def test_latest_restatement_replaces_original_and_new_holdings_append(self):
        with tempfile.TemporaryDirectory() as tmp:
            filings = []
            for accession, amend, filed, shares in [('a', None, '2026-08-01', 99), ('b', 'restatement', '2026-09-01', 15), ('c', 'new_holdings', '2026-09-02', 5)]:
                table = Path(tmp) / f'{accession}.xml'
                table.write_text(f'<root><infoTable><nameOfIssuer>TEST</nameOfIssuer><cusip>123456789</cusip><value>100</value><shrsOrPrnAmt><sshPrnamt>{shares}</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt></infoTable></root>')
                filings.append({'accession': accession, 'amend': amend, 'filed': filed, 'table': table})
            chosen, used, rows = period_rows(filings)
            self.assertEqual(chosen['accession'], 'b')
            self.assertEqual([f['accession'] for f in used], ['b', 'c'])
            self.assertEqual(sum(r['shares'] for r in rows), 20)

    def test_source_manifest_cannot_escape_cache_or_change_host(self):
        valid = {'path': 'research/v2/sec-covers/example.xml', 'url': 'https://www.sec.gov/Archives/example.xml', 'sha256': 'a' * 64, 'bytes': 10}
        self.assertTrue(validated_entry(valid).is_relative_to(ROOT / 'research'))
        for change in [{'path': '../../outside.xml'}, {'url': 'https://example.org/filing.xml'}, {'url': 'http://www.sec.gov/filing.xml'}]:
            with self.assertRaises(ValueError):
                validated_entry({**valid, **change})


if __name__ == '__main__':
    unittest.main()
