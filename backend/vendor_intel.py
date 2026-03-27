"""
vendor_intel.py — Vendor Threat Intelligence Database

Maps common WiFi AP vendors to known security issues, default credentials,
WPS status, and CVE history. Provides fuzzy vendor matching and network
enrichment for pen-testing analysis.
"""

from typing import Dict, List, Optional


# ── Vendor Threat Intelligence Database ──────────────────────────────────────

VENDOR_THREAT_DB: Dict[str, dict] = {
    "TP-Link": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2023-1389: Command injection in web management interface (Archer AX21)",
            "CVE-2022-30075: RCE via crafted firmware upgrade (Archer AX50)",
            "CVE-2022-24355: Stack buffer overflow in httpd (TL-WR940N)",
            "CVE-2020-9375: Denial of service via malformed HTTP request",
        ],
        "risk_level": "high",
        "notes": "Frequently targeted; slow patching cycle. WPS enabled by default on most consumer models.",
    },
    "Netgear": {
        "default_creds": "admin / password",
        "wps_default": True,
        "known_cves": [
            "CVE-2021-45388: Pre-auth buffer overflow in SOAP interface (Nighthawk)",
            "CVE-2021-34991: Pre-auth buffer overflow in UPnP daemon",
            "CVE-2020-26926: Authentication bypass via URL manipulation",
            "CVE-2017-6862: Buffer overflow allows RCE without authentication",
        ],
        "risk_level": "high",
        "notes": "Nighthawk series has had persistent SOAP/UPnP vulnerabilities. Router management often exposed on WAN.",
    },
    "D-Link": {
        "default_creds": "admin / (blank)",
        "wps_default": True,
        "known_cves": [
            "CVE-2020-25078: Information disclosure via /conf/getbasicinfo (DCS cameras & routers)",
            "CVE-2019-17621: RCE in UPnP via crafted M-SEARCH request",
            "CVE-2018-6530: OS command injection via SOAP interface",
            "CVE-2013-7471: Hardcoded backdoor in multiple router models",
        ],
        "risk_level": "high",
        "notes": "Legacy devices rarely receive patches. Many models have reached end-of-life with unpatched RCE flaws.",
    },
    "Linksys": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2022-38555: OS command injection in Linksys E-series",
            "CVE-2020-35713: RCE in Velop mesh routers via JNAP endpoint",
            "CVE-2019-11535: Cleartext credential storage in Smart Wi-Fi series",
            "CVE-2014-8244: JNAP information disclosure without authentication",
        ],
        "risk_level": "medium",
        "notes": "Smart Wi-Fi cloud management may expose admin interface. Velop mesh shares credentials across nodes.",
    },
    "ASUS": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2023-35086: Memory corruption in httpd configuration handler",
            "CVE-2022-26376: Memory corruption in httpd unescape function",
            "CVE-2022-35401: Authentication bypass via crafted cookies (RT-AX82U)",
            "CVE-2018-8879: Buffer overflow in httpd (multiple RT-AC models)",
        ],
        "risk_level": "medium",
        "notes": "AiMesh and AiProtection features increase attack surface. AiCloud exposes routers to WAN.",
    },
    "Huawei": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2017-17215: RCE via UPnP SOAP injection (HG532 router)",
            "CVE-2020-9054: OS command injection in multiple home routers",
            "CVE-2017-17216: Information disclosure in HG532 web server",
        ],
        "risk_level": "high",
        "notes": "Widely deployed in ISP bundles. HG532 exploited by Satori/Mirai botnets in the wild.",
    },
    "ZTE": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2014-2321: Hardcoded superadmin backdoor in ZTE ZXV10 modems",
            "CVE-2018-7357: OS command injection in ZTE ZXHN series",
            "CVE-2020-6868: Buffer overflow in ZTE home gateway firmware",
        ],
        "risk_level": "high",
        "notes": "ISP-branded variants may have additional hardcoded credentials. Firmware update process opaque.",
    },
    "Cisco": {
        "default_creds": None,
        "wps_default": False,
        "known_cves": [
            "CVE-2023-20025: Authentication bypass in Cisco small business routers",
            "CVE-2021-1609: Web management RCE in RV340/345 series",
            "CVE-2019-1652: Command injection in Cisco RV320/325 routers",
        ],
        "risk_level": "low",
        "notes": "Enterprise gear is generally well-patched. Small-business line (RV series) has weaker track record.",
    },
    "Ubiquiti": {
        "default_creds": "ubnt / ubnt",
        "wps_default": False,
        "known_cves": [
            "CVE-2021-22886: XSS in UniFi Network application",
            "CVE-2019-5456: SSRF in UniFi Cloud Key Gen1",
            "CVE-2020-8188: RCE in UniFi Cloud Key via firmware upload",
        ],
        "risk_level": "low",
        "notes": "Active patching. Default credentials are well-known. UniFi adoption process may expose devices briefly.",
    },
    "Aruba": {
        "default_creds": "admin / admin",
        "wps_default": False,
        "known_cves": [
            "CVE-2023-22747: Critical unauthenticated buffer overflow in ArubaOS",
            "CVE-2022-37897: Command injection in ArubaOS web-based management",
            "CVE-2021-37716: SSRF in Aruba ClearPass Policy Manager",
        ],
        "risk_level": "low",
        "notes": "Enterprise-grade with rapid patching. ClearPass integration adds complexity but strong security posture.",
    },
    "MikroTik": {
        "default_creds": "admin / (blank)",
        "wps_default": False,
        "known_cves": [
            "CVE-2023-30799: Privilege escalation in RouterOS (super admin)",
            "CVE-2019-3977: Auto-upgrade enables downgrade attacks",
            "CVE-2018-14847: Winbox critical credential disclosure (exploited by VPNFilter)",
        ],
        "risk_level": "medium",
        "notes": "Powerful but complex. Winbox protocol has been targeted. Many operators leave default creds. Widely used in botnets.",
    },
    "Xiaomi": {
        "default_creds": "admin / (device-specific password on sticker)",
        "wps_default": True,
        "known_cves": [
            "CVE-2020-14100: RCE in Xiaomi Mi Router via DNS rebinding",
            "CVE-2020-14104: Information disclosure in Mi Router API",
            "CVE-2019-18370: RCE via stack overflow in Xiaomi Mi Router",
        ],
        "risk_level": "medium",
        "notes": "Mi Home cloud integration increases attack surface. DNS rebinding attacks viable on many models.",
    },
    "Tenda": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2023-33510: Multiple OS command injection in Tenda AC series",
            "CVE-2022-45644: Stack overflow in Tenda W15E via formSetSysTime",
            "CVE-2020-10987: Multiple RCE vulnerabilities in Tenda AC15 firmware",
        ],
        "risk_level": "high",
        "notes": "Budget routers with extremely poor security posture. Firmware rarely updated. Multiple unpatched RCE flaws.",
    },
    "Belkin": {
        "default_creds": "admin / (blank)",
        "wps_default": True,
        "known_cves": [
            "CVE-2019-17094: Buffer overflow in Belkin N750 httpd",
            "CVE-2015-10005: CSRF in Belkin N600 allows admin takeover",
            "CVE-2014-1635: DNS response spoofing in multiple Belkin routers",
        ],
        "risk_level": "medium",
        "notes": "Merged with Linksys. Legacy Belkin hardware is often unpatched and end-of-life.",
    },
    "Samsung": {
        "default_creds": None,
        "wps_default": True,
        "known_cves": [
            "CVE-2019-12760: SmartThings Hub RCE via MQTT",
            "CVE-2018-3911: Buffer overflow in Samsung SmartThings Hub",
        ],
        "risk_level": "low",
        "notes": "Limited WiFi AP product line. SmartThings Hub exposes IoT attack surface.",
    },
    "Apple": {
        "default_creds": None,
        "wps_default": False,
        "known_cves": [
            "CVE-2019-8581: Memory corruption in AirPort Extreme firmware",
            "CVE-2017-9417: Broadcom WiFi chip vulnerability (Broadpwn) in iOS/AirPort",
        ],
        "risk_level": "low",
        "notes": "AirPort product line discontinued. Existing devices no longer receive security updates.",
    },
    "Google": {
        "default_creds": None,
        "wps_default": False,
        "known_cves": [
            "CVE-2019-20767: RCE in Nest WiFi / Google WiFi via LAN API",
        ],
        "risk_level": "low",
        "notes": "Cloud-managed with automatic updates. Limited local attack surface.",
    },
    "Ruckus": {
        "default_creds": "super / sp-admin",
        "wps_default": False,
        "known_cves": [
            "CVE-2023-25717: Unauthenticated RCE in Ruckus Wireless Admin panel",
            "CVE-2020-13919: XSS in Ruckus ZoneDirector",
        ],
        "risk_level": "medium",
        "notes": "Enterprise AP with strong RF performance. CVE-2023-25717 was actively exploited. Default creds well-known.",
    },
    "Fortinet": {
        "default_creds": "admin / (blank)",
        "wps_default": False,
        "known_cves": [
            "CVE-2023-25610: Buffer underflow in FortiOS/FortiAP admin interface",
            "CVE-2022-40684: Authentication bypass in FortiOS (actively exploited)",
        ],
        "risk_level": "low",
        "notes": "Enterprise grade. FortiOS vulnerabilities in 2022-2023 were high profile. Rapid patch deployment.",
    },
    "Zyxel": {
        "default_creds": "admin / 1234",
        "wps_default": True,
        "known_cves": [
            "CVE-2023-28771: OS command injection in Zyxel firewalls/APs (pre-auth)",
            "CVE-2022-30525: OS command injection in Zyxel firewall web management",
            "CVE-2020-29583: Hardcoded admin credential in Zyxel USG/VPN firmware",
        ],
        "risk_level": "high",
        "notes": "Hardcoded credentials discovered in 2020. Repeat offender for pre-auth command injection flaws.",
    },
    "Actiontec": {
        "default_creds": "admin / (ISP-set or sticker)",
        "wps_default": True,
        "known_cves": [
            "CVE-2014-0329: Hardcoded SNMP community string in Actiontec modems",
            "CVE-2017-10861: Command injection in Actiontec GT784WN",
        ],
        "risk_level": "medium",
        "notes": "Common ISP-issued gateway. Firmware updates depend on ISP. SNMP backdoors have been found.",
    },
    "Comtrend": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2014-0337: Default credentials and CSRF in Comtrend routers",
        ],
        "risk_level": "medium",
        "notes": "ISP-issued CPE. Rarely updated by end users. Default credentials widely known.",
    },
    "Sagemcom": {
        "default_creds": "admin / admin",
        "wps_default": True,
        "known_cves": [
            "CVE-2020-15023: WPS PIN bruteforce via crafted association in Sagemcom F@st",
            "CVE-2017-7369: Stack buffer overflow in Sagemcom Fast routers",
        ],
        "risk_level": "medium",
        "notes": "Major ISP CPE supplier globally. WPS vulnerabilities are common. Firmware controlled by ISP.",
    },
    "EnGenius": {
        "default_creds": "admin / admin",
        "wps_default": False,
        "known_cves": [
            "CVE-2022-46634: OS command injection in EnGenius AP firmware",
            "CVE-2019-16072: Buffer overflow in EnGenius wireless management",
        ],
        "risk_level": "medium",
        "notes": "SMB-focused AP vendor. Cloud management may expose additional attack surface.",
    },
}


def get_vendor_intel(vendor: str) -> Optional[dict]:
    """
    Fuzzy-match a vendor name against the threat intelligence database.

    Performs case-insensitive substring matching. Returns the best match
    or None if no match is found.

    Args:
        vendor: Vendor name string (e.g., from OUI lookup or SSID inference).

    Returns:
        Dict with vendor intel fields, or None if no match.
    """
    if not vendor:
        return None

    vendor_lower = vendor.lower().strip()

    # Exact match first (case-insensitive)
    for db_vendor, intel in VENDOR_THREAT_DB.items():
        if db_vendor.lower() == vendor_lower:
            return {"vendor_name": db_vendor, **intel}

    # Substring match: check if DB vendor appears in the input or vice versa
    best_match: Optional[str] = None
    best_score: int = 0

    for db_vendor in VENDOR_THREAT_DB:
        db_lower = db_vendor.lower()

        # Check both directions for substring containment
        if db_lower in vendor_lower or vendor_lower in db_lower:
            # Prefer longer matches (more specific)
            score = len(db_lower)
            if score > best_score:
                best_score = score
                best_match = db_vendor

    if best_match:
        return {"vendor_name": best_match, **VENDOR_THREAT_DB[best_match]}

    # Token-level fuzzy match: split on common separators and check overlap
    vendor_tokens = set(vendor_lower.replace("-", " ").replace("_", " ").split())
    for db_vendor in VENDOR_THREAT_DB:
        db_tokens = set(db_vendor.lower().replace("-", " ").replace("_", " ").split())
        if vendor_tokens & db_tokens:
            return {"vendor_name": db_vendor, **VENDOR_THREAT_DB[db_vendor]}

    return None


def enrich_networks(networks: List[dict]) -> List[dict]:
    """
    Add vendor threat intelligence to each network in the list.

    Looks up the vendor field on each network dict and attaches a
    `vendor_intel` sub-dict with threat data when a match is found.

    Args:
        networks: List of network dicts (each should have a 'vendor' key).

    Returns:
        The same list with `vendor_intel` field added to each entry.
    """
    enriched: List[dict] = []

    for net in networks:
        # Work on a copy to avoid mutating the original
        enriched_net = dict(net)

        vendor = net.get("vendor", "") or ""
        intel = get_vendor_intel(vendor)

        if intel:
            enriched_net["vendor_intel"] = intel
        else:
            enriched_net["vendor_intel"] = {
                "vendor_name": vendor or "Unknown",
                "default_creds": None,
                "wps_default": False,
                "known_cves": [],
                "risk_level": "unknown",
                "notes": "Vendor not found in threat intelligence database.",
            }

        enriched.append(enriched_net)

    return enriched
