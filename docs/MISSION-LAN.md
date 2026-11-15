# Mission LAN demonstration

[EVIDENCE] This mode extends the `main` checkout with the team’s local v0.5 and v0.6 workflow. It uses the existing Node server, SQLite file and versioned resting heart rate rule. The glasses experience, bone workflow and Astra still run at the normal local entry point.

## Run on the Windows laptop

1. Open PowerShell in this checkout. Verify Node.js 22.13+ with `node --version`. The branch includes prebuilt assets. The mission screens use no external packages at runtime.
2. For a one-laptop rehearsal, run `node scripts/start-mission.mjs` and open <http://127.0.0.1:8766/mission.html>. Select a crew member in CMO and paste its crew link in a second tab.
3. For the phone test, connect both devices to the same private Wi-Fi. Run `ipconfig` on the laptop and identify the current **Wi-Fi IPv4 address**. Start the server with that address.

   ```powershell
   node scripts/start-mission.mjs YOUR_WIFI_IPV4
   ```

4. On the phone, open the **Phone connection check** URL printed in PowerShell. A working connection returns `{"ok":true,"simulated":true}`. On the laptop, use the localhost **Mission console** link. Select a fictional crew member and open its complete **Crew link** on the phone, including the fragment after `#`.
5. On the phone, select a synthetic reading and choose **Send simulated sample**. The CMO roster refreshes automatically and shows the received value, source evidence and receipt time. Try **Above personal baseline** and **Strong deviation** to exercise the rule. The CMO can acknowledge the selected WATCH or ALERT.
6. In **Earth doctor view**, queue a daily or weekly snapshot. **QUEUED** withholds the snapshot until the modeled 3–22 minute interval has passed. **Simulate Earth receipt** advances the exercise immediately. **RECEIVED** shows the frozen snapshot. **Mark simulated review** records the review in the local timeline.
7. Select a crew member and inspect **Heart**, **Bones** and **Evidence**. Two consecutive **Strong deviation** samples in the same direction produce a confirmed ALERT. A single ALERT is assigned WATCH priority pending a repeat. **Acknowledge**, **Add note** and **Request teleconsult** record local actions.

For a rehearsal without the mission server, open **Earth doctor view** in the web demo. It displays a seed-142 report already received in the simulation. Web actions stay in browser storage. Pairing and creating new reports use the local mission profile.

If the phone ping fails, check the laptop IP again and make sure the terminal stayed open. Some phone hotspots block access to connected devices. Try another trusted Wi-Fi or use the laptop-only rehearsal. The server does not change Windows Firewall settings. The default port is 8766 so the original v0.6 service can keep its port 8765. If required, set `$env:PORT = '8767'` before starting and use the URLs printed by the launcher.

## Architecture mapping

| Local prototype concept | Integration with main |
| --- | --- |
| v0.6 crew phone simulator and unsent queue | The crew browser generates labeled synthetic resting values with packet IDs. Its outbound queue retries after interruption. The laptop acknowledges only after SQLite commits. An unchanged packet ID is idempotent. |
| v0.6 CMO monitor and acknowledgment | The laptop reads all four profiles from the same database. CMO acknowledgment is explicit and tied to the latest Silver evidence ID. The glasses workflow continues to save its own review requests in that database. |
| v0.5 Flight Surgeon report console | Daily or weekly snapshots carry heart history and evidence, CMO activity and the available bone scan. Simulated receipt reveals the snapshot to Ground. Ground actions and review status are persisted locally. |
| v0.5/v0.6 statistical assessment | Main’s `app/engine.js` is the authority. Every fictional profile receives its own seed-142-derived history. Bronze stores the source and original observation, Silver stores the normalized observation and Gold records the versioned decision with evidence IDs. The personal reference is frozen from the first simulated sol for this rehearsal. |

[SIMULATION] One accepted packet advances that member’s simulated time by one sol. There are no physical sensor inputs. The original v0.6 database and datasets are independent historical demonstration inputs. The new sample packets enter the same SQLite file used by the main application in this checkout. Level 3 uses manual training reports and sends no data outside the laptop.

Use this profile with synthetic data on a trusted local network. The scoped crew link rotates at server restart. CMO, Ground and the main administrative APIs are reachable on loopback only while this profile is active. The phone opens its simulated profile over plain HTTP. Never expose this server or crew link to the internet. The loaded phone tab can queue and retry without a connection. A cold page load still needs the laptop.

Run `node --test tests/mission.test.js` for reproducible HTTP and persistence verification. See [test results](RESULTADOS.md) for what was exercised.
