# Streamlined Minimum Viable Design Standard (Mandatory UI/UX Rules)

Every panel, tab, and modal in the Market Concussion / 2mm Shift application MUST strictly follow these design rules:

## 1. One Clear Goal Per Screen
- Before building or editing any panel, define its **single core user job** in one sentence.
- Remove any secondary metrics, explanatory paragraphs, or decorative cards that do not directly help the user complete that job in the fewest clicks possible.

## 2. Zero Developer Plumbing in User-Facing UI
- **NEVER** show API keys, webhook URLs, raw account IDs (`acc_...`), HTTP endpoints (`POST /v1/...`), or third-party infrastructure names (`Outstand.so`, `Supabase`, `Vercel`) in student-facing views or modals.
- All third-party credentials live on the backend (`process.env`). Users only see human actions: **Connect Instagram**, **Connect Facebook**, **Save Keyword**, **Send Test**, **Reply**.

## 3. Progressive Disclosure & Guided Flow
- When a feature requires setup before daily use (e.g., DM Automation & Lead Magnets), present a clean **Step-by-Step Setup Flow**:
  1. **Connect Accounts** (Instagram & Facebook) with a clear green `✓ Connected` confirmation.
  2. **Add Lead Magnet URL & Keyword Trigger** (Title, URL, Keyword).
  3. **Test Keyword Trigger** (1-click verification that sends a test DM and confirms the trigger works).
- Once setup is complete, collapse the setup into a single compact status bar and show the **minimal daily workspace** (e.g., the Conversations Inbox).

## 4. Form & Layout Restraint
- **Max 3–4 inputs visible at once** in any modal or card. Pre-fill smart defaults (such as DM templates) behind a simple collapsible "Customize message" toggle instead of dumping multi-textarea forms on screen.
- **No nested boxes inside nested boxes**: Maximum 1 card border level inside any panel or modal.
- **No rainbow borders or badge clutter**: Use neutral dark surfaces (`#07090D` / `white/10` borders), `#09ADEF` for the primary action, and `emerald` for connected/completed states.
- **Short, single-line button labels**: Buttons must never wrap onto two lines (e.g., use `Connect Instagram`, `Save`, `Test Trigger`).
