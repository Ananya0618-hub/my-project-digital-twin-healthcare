// constants/api.ts
// Fixed production backend — HTTPS via DuckDNS + Nginx + Let's Encrypt on EC2.
// No longer built from the local network address, so the app works over
// any Wi-Fi or mobile data connection without running a local backend.
export const API = "https://healthmirror.duckdns.org/api";