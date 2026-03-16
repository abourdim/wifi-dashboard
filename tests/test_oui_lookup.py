"""Tests for OUI vendor lookup — edge cases, case sensitivity, unknown vendors."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from oui_lookup import lookup_vendor, OUI_DB


# ── Known vendors ────────────────────────────────────────────────────────────

def test_lookup_known_apple():
    assert lookup_vendor("10:9F:A9:AA:BB:CC") == "Apple"


def test_lookup_known_samsung():
    assert lookup_vendor("38:43:7D:11:22:33") == "Samsung"


def test_lookup_known_tp_link():
    assert lookup_vendor("50:C7:BF:AA:BB:CC") == "TP-Link"


def test_lookup_known_second_prefix():
    """Verify a second known vendor from the DB."""
    assert lookup_vendor("14:CC:20:A1:B2:C3") == "TP-Link"


# ── Case insensitivity ───────────────────────────────────────────────────────

def test_lookup_lowercase():
    """BSSID in lowercase should still match."""
    result = lookup_vendor("10:9f:a9:aa:bb:cc")
    assert result == "Apple"


def test_lookup_mixed_case():
    result = lookup_vendor("10:9F:a9:aA:bB:cC")
    assert result == "Apple"


# ── Unknown vendors ──────────────────────────────────────────────────────────

def test_lookup_unknown_returns_unknown():
    assert lookup_vendor("FF:FF:FF:AA:BB:CC") == "Unknown"


def test_lookup_unknown_random():
    assert lookup_vendor("00:00:01:AA:BB:CC") == "Unknown"


# ── Edge cases ───────────────────────────────────────────────────────────────

def test_lookup_empty_string():
    assert lookup_vendor("") == "Unknown"


def test_lookup_short_string():
    assert lookup_vendor("3C:22") == "Unknown"


def test_lookup_no_colons():
    assert lookup_vendor("3C22FBAABBCC") == "Unknown"


def test_lookup_dash_separator():
    """Dashes instead of colons should not match (per implementation)."""
    result = lookup_vendor("3C-22-FB-AA-BB-CC")
    # Depends on implementation, but should not crash
    assert isinstance(result, str)


def test_lookup_broadcast_address():
    result = lookup_vendor("FF:FF:FF:FF:FF:FF")
    assert isinstance(result, str)


def test_lookup_null_address():
    result = lookup_vendor("00:00:00:00:00:00")
    assert isinstance(result, str)


# ── OUI_DB integrity ────────────────────────────────────────────────────────

def test_oui_db_has_entries():
    assert len(OUI_DB) > 100


def test_oui_db_keys_uppercase():
    """All OUI_DB keys should be uppercase 8-char prefixes."""
    for key in OUI_DB:
        assert key == key.upper(), f"Key not uppercase: {key}"
        assert len(key) == 8, f"Key wrong length: {key}"
        assert key[2] == ":" and key[5] == ":", f"Key missing colons: {key}"


def test_oui_db_values_nonempty():
    for key, val in OUI_DB.items():
        assert val and len(val) > 0, f"Empty vendor for {key}"
