---
name: fca-messenger-troubleshooting
description: Expert diagnostic and recovery runbook for Facebook Chat API (FCA) operations in Floppa-Chatbot. Covers session stability, checkpoint handling, cookie export/import, MQTT watchdog, multi-account rotation, and rate-limit warmup calibration.
---

# FCA Messenger Troubleshooting & Session Safety Skill

This skill guides diagnostics, session maintenance, and resilience for `@floppa/fca-native` and Metachat engines in Floppa-Chatbot.

## Session Authentication & Cookies

Floppa-Chatbot stores session state in `account.txt` (or `account.txt2` for secondary accounts in two-ID mode).

### Supported Cookie Formats
* **JSON AppState Array**: `[{"key": "c_user", "value": "..."}, {"key": "xs", "value": "..."}, ...]`
* **Netscape Tab-Separated Cookie Text**
* **Semicolon-Delimited Cookie String**: `c_user=...; xs=...; datr=...;`

## Multi-Account Auto-Switching

The multi-account manager automatically balances traffic or switches accounts when a session expires or hits Facebook temporary rate limits:

* Configuration in `config.json`:
  ```json
  "facebookAccount": {
    "email": "user@example.com",
    "password": "yourpassword",
    "2FASecret": "YOUR_TOTP_KEY",
    "intervalGetNewCookie": 1440
  }
  ```
* Use command `/accountswitch status` to view account states.

## Anti-Suspension & Health Monitoring

FCA includes built-in anti-suspension warmup and adaptive circuit breakers:
* **Warmup Mode**: Rate limits outbound actions for the first 20 minutes of startup.
* **Circuit Breaker**: Automatically pauses outbound requests if Facebook returns checkpoint or security challenge responses to prevent account locks.
* **Presence Keepalive**: Lightweight ping to `ajax/presence/reconnect.php` verifies session health without loading heavy web pages.

## Troubleshooting Common Errors
* **`CHECKPOINT_ERROR`**: Complete the verification in a web browser, export fresh cookies, and update `account.txt`.
* **`MQTT Disconnected / Reconnecting`**: The MQTT watchdog automatically retries with exponential backoff and jitter. Verify internet connectivity and proxy settings.
