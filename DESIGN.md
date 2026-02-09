# Groups Manager — Breadboard & UI Sketches

## Breadboard

```
┌─────────────────────────┐
│         LOGIN           │
│                         │
│  [Email field]          │
│  [Login button]         │
│     │                   │
│     ├─ your email ──────┼──► shows [Password field] + [Submit]─┐
│     ├─ known email ─────┼─────────────────────────────────────┐│
│     └─ new email ───────┼───┐                                 ││
└─────────────────────────┘   │                                 ││
                              ▼                                 ││
┌─────────────────────────┐                                     ││
│        SIGN UP          │                                     ││
│                         │                                     ││
│  [Name field]           │                                     ││
│  [Title field]          │                                     ││
│  [Organization field]   │                                     ││
│  [Create button] ───────┼───┐                                 ││
└─────────────────────────┘   │                                 ││
                              ▼                                 ▼▼
┌──────────────────────────────────────────────────┐
│                   PROFILE                        │
│                                                  │
│  Name (display)                                  │
│  Title (display)                                 │
│  Organization (display)                          │
│  Email (display)                                 │
│                                                  │
│  Groups list                                     │
│    group name ──────────────────────────────┐    │
│                                             │    │
│  [New Group button] (own profile only) ─┐   │    │
└─────────────────────────────────────────┼───┼────┘
                                          │   │
                                          │   │
           SEARCH                         │   │
┌─────────────────────────────┐           │   │
│                             │           │   │
│  [Search field] + [Go]      │           │   │
│                             │           │   │
│  People results             │           │   │
│    person name ─────────────┼───► PROFILE   │
│                             │           │   │
│  Group results              │           │   │
│    group name ──────────────┼───┐       │   │
└─────────────────────────────┘   │       │   │
                                  ▼       ▼   ▼
┌──────────────────────────────────────────────────┐
│              GROUP (view / create)                │
│                                                  │
│  Group name    (display · inline edit by admin)  │
│  Description   (display · inline edit by admin)  │
│  Owner ─────────────────────────────► PROFILE    │
│                                                  │
│  Member list                                     │
│    member name ─────────────────────► PROFILE    │
│    [Remove] (admin only)                         │
│    [Find person... + Add] (admin only, inline)   │
│                                                  │
│  [Delete Group] (admin only)                     │
└──────────────────────────────────────────────────┘

BANNER (all authenticated pages):
  Groups Manager  [My Profile]  [Search]  [⚙ ▾ → Log Out]
```

## Places

1. **Login** — email field, password only appears for seeded admin email
2. **Sign Up** — name, title, organization for new emails
3. **Profile** — same page for you and others; your own shows "+ New Group"
4. **Search** — empty state with field and [Go] button
5. **Search Results** — people (name + title) and groups
6. **Group (view)** — name, description, owner, members; admin sees pencil icons, remove buttons, "Find person..." inline, and delete group
7. **Group Create** — empty form with name, description, auto-assigned owner, cancel/create buttons
8. **Banner** — persistent on all authenticated pages: Groups Manager, My Profile, Search, gear with logout

## UI Sketches

```
                  LOGIN
┌──────────────────────────────────────────────┐
│                                              │
│           ┌──────────────────────┐           │
│           │   Groups Manager     │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │ Email          │  │           │
│           │  └────────────────┘  │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │    Log In      │  │           │
│           │  └────────────────┘  │           │
│           └──────────────────────┘           │
│                                              │
└──────────────────────────────────────────────┘


              LOGIN (your email)
┌──────────────────────────────────────────────┐
│                                              │
│           ┌──────────────────────┐           │
│           │   Groups Manager     │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │ zack@email.com │  │           │
│           │  └────────────────┘  │           │
│           │  ┌────────────────┐  │           │
│           │  │ Password       │  │           │
│           │  └────────────────┘  │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │    Log In      │  │           │
│           │  └────────────────┘  │           │
│           └──────────────────────┘           │
│                                              │
└──────────────────────────────────────────────┘


                   SIGN UP
┌──────────────────────────────────────────────┐
│                                              │
│           ┌──────────────────────┐           │
│           │  Welcome!            │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │ Name           │  │           │
│           │  └────────────────┘  │           │
│           │  ┌────────────────┐  │           │
│           │  │ Title          │  │           │
│           │  └────────────────┘  │           │
│           │  ┌────────────────┐  │           │
│           │  │ Organization   │  │           │
│           │  └────────────────┘  │           │
│           │                      │           │
│           │  ┌────────────────┐  │           │
│           │  │    Create      │  │           │
│           │  └────────────────┘  │           │
│           └──────────────────────┘           │
│                                              │
└──────────────────────────────────────────────┘


               PROFILE (own)
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Zack Burgess                        │    │
│  │  Software Engineer                   │    │
│  │  Acme Corp                           │    │
│  │  zack@email.com                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  My Groups                   [+ New Group]   │
│  ┌──────────────────────────────────────┐    │
│  │  Engineering Team                    │    │
│  │  Book Club                           │    │
│  │  Project Alpha                       │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘


             PROFILE (other)
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Jane Smith                          │    │
│  │  Designer                            │    │
│  │  Acme Corp                           │    │
│  │  jane@email.com                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Groups                                      │
│  ┌──────────────────────────────────────┐    │
│  │  Book Club                           │    │
│  │  Design Team                         │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘


             GEAR DROPDOWN
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────┬───────┤
│                                      │Log Out│
│                                      └───────┘
└──────────────────────────────────────────────┘


                   SEARCH
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  Search                                      │
│                                              │
│  ┌──────────────────────────┐  [Go]          │
│  │ Search...                │                │
│  └──────────────────────────┘                │
│                                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘


              SEARCH RESULTS
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  Search Results                              │
│                                              │
│  ┌──────────────────────────┐  [Go]          │
│  │ boo                      │                │
│  └──────────────────────────┘                │
│                                              │
│  People                                      │
│  ┌──────────────────────────────────────┐    │
│  │  Bob Martin · Developer              │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Groups                                      │
│  ┌──────────────────────────────────────┐    │
│  │  Book Club                           │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘


          GROUP (view, non-admin)
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  Engineering Team                            │
│  The core engineering team.                  │
│  Owner: Zack Burgess                         │
│                                              │
│  Members (3)                                 │
│  ┌──────────────────────────────────────┐    │
│  │  Zack Burgess                        │    │
│  │  Jane Smith                          │    │
│  │  Bob Martin                          │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘


            GROUP (view, admin)
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  Engineering Team                       ✏    │
│  The core engineering team.             ✏    │
│  Owner: Zack Burgess                         │
│                                              │
│  Members (2)                                 │
│  ┌──────────────────────────────────────┐    │
│  │  Zack Burgess                    ✕   │    │
│  │  Bob Martin                      ✕   │    │
│  │                                      │    │
│  │  ┌────────────────────────┐          │    │
│  │  │ Find person...         │   [Add]  │    │
│  │  └────────────────────────┘          │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  [Delete Group]                              │
│                                              │
└──────────────────────────────────────────────┘


               GROUP CREATE
┌──────────────────────────────────────────────┐
│ Groups Manager  [My Profile] [Search] [⚙ ▾] │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────┐      │
│  │ Name                               │      │
│  └────────────────────────────────────┘      │
│  ┌────────────────────────────────────┐      │
│  │ Description                        │      │
│  └────────────────────────────────────┘      │
│  Owner: Zack Burgess                         │
│                                              │
│              [Cancel]  [Create]              │
│                                              │
└──────────────────────────────────────────────┘
```

## Key Decisions

- **Login**: Only the seeded admin email shows a password field. All other users log in with just email. New emails redirect to Sign Up.
- **Profile**: Same page for own and others. Own profile shows "+ New Group" button. Email displayed at bottom.
- **Search**: Submit-based (not live). Shows people (name + title only) and groups.
- **Group Detail**: No search bar or logout — banner handles navigation. Inline editing with pencil icons for admin. Add member inline at bottom of member list with "Find person..." placeholder.
- **Group Create**: Only mode with a form — no member management during creation.
- **Banner**: Persistent on all authenticated pages. Contains Groups Manager title, My Profile, Search, and gear dropdown with Log Out.
- **Soft delete**: Group member removal tracked with `removed_at` and `removed_by`. Full audit trail (new row per add/remove cycle). `removed_by` is null for system actions (e.g. suspend).
