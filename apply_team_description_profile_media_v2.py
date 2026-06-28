#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
changed = []
notes = []

def read(path):
    return (ROOT / path).read_text()

def write(path, text):
    p = ROOT / path
    old = p.read_text() if p.exists() else None
    p.parent.mkdir(parents=True, exist_ok=True)
    if old != text:
        p.write_text(text)
        changed.append(path)

def replace_once(text, old, new, path, required=True):
    if old in text:
        return text.replace(old, new, 1)
    msg = f"NOT FOUND in {path}: {old[:90].replace(chr(10),' ')}"
    if required:
        raise SystemExit(msg)
    notes.append(msg)
    return text

# 1) Prisma: Team.description
schema_path = "prisma/schema.prisma"
text = read(schema_path)
if "model Team" in text and "description String?" not in text.split("model Player", 1)[0]:
    text = replace_once(
        text,
        "  badgeUrl    String?\n",
        "  badgeUrl    String?\n  description String?\n",
        schema_path,
    )
write(schema_path, text)

migration = ROOT / "prisma/migrations/20260628093000_add_team_description/migration.sql"
if not migration.exists():
    migration.parent.mkdir(parents=True, exist_ok=True)
    migration.write_text('ALTER TABLE "Team" ADD COLUMN "description" TEXT;\n')
    changed.append(str(migration.relative_to(ROOT)))

# 2) API create team: src/app/api/leagues/[leagueId]/teams/route.ts
path = "src/app/api/leagues/[leagueId]/teams/route.ts"
text = read(path)
if "const description =" not in text:
    text = replace_once(
        text,
        '  const badgeUrl = body?.badgeUrl ? String(body.badgeUrl).trim() : null;\n',
        '  const badgeUrl = body?.badgeUrl ? String(body.badgeUrl).trim() : null;\n  const description = body?.description ? String(body.description).trim() : null;\n',
        path,
    )
if "description: description || undefined" not in text:
    text = replace_once(
        text,
        '        badgeUrl: badgeUrl || undefined,\n',
        '        badgeUrl: badgeUrl || undefined,\n        description: description || undefined,\n',
        path,
    )
write(path, text)

# 3) API update team: src/app/api/teams/[teamId]/route.ts
path = "src/app/api/teams/[teamId]/route.ts"
text = read(path)
if "const description =" not in text:
    text = replace_once(
        text,
        '  const badgeUrl =\n    body?.badgeUrl === undefined ? undefined : body.badgeUrl === null ? null : String(body.badgeUrl).trim() || null;\n',
        '  const badgeUrl =\n    body?.badgeUrl === undefined ? undefined : body.badgeUrl === null ? null : String(body.badgeUrl).trim() || null;\n  const description =\n    body?.description === undefined ? undefined : body.description === null ? null : String(body.description).trim() || null;\n',
        path,
    )
if "description !== undefined" not in text:
    text = replace_once(
        text,
        '      ...(badgeUrl !== undefined ? { badgeUrl } : {}),\n',
        '      ...(badgeUrl !== undefined ? { badgeUrl } : {}),\n      ...(description !== undefined ? { description } : {}),\n',
        path,
    )
write(path, text)

# 4) Teams list page: create/display description conservatively
path = "src/app/leagues/[leagueId]/teams/page.tsx"
text = read(path)
if "description?: string | null" not in text:
    text = text.replace("  badgeUrl?: string | null;", "  badgeUrl?: string | null;\n  description?: string | null;", 1)
if 'const [description, setDescription] = useState("");' not in text:
    text = text.replace('  const [badgeUrl, setBadgeUrl] = useState("");', '  const [badgeUrl, setBadgeUrl] = useState("");\n  const [description, setDescription] = useState("");', 1)
if "description: description.trim() || null" not in text:
    text = text.replace('        badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,', '        badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,\n        description: description.trim() || null,', 1)
# Reset after successful create if common state resets exist
if 'setDescription("");' not in text and 'setBadgeUrl("");' in text:
    text = text.replace('setBadgeUrl("");', 'setBadgeUrl("");\n      setDescription("");', 1)
# Insert textarea before create button block, if not already there
if 'aria-label="Descrizione squadra"' not in text:
    marker = '              <Button'
    idx = text.find(marker, text.find('Nuova squadra'))
    if idx != -1:
        textarea = '''              <textarea\n                aria-label="Descrizione squadra"\n                value={description}\n                onChange={(e) => setDescription(e.target.value)}\n                placeholder="Racconta identità, stile o motto della squadra"\n                rows={3}\n                className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.07]"\n              />\n\n'''
        text = text[:idx] + textarea + text[idx:]
    else:
        notes.append(f"TODO manuale in {path}: inserire textarea descrizione nel form Nuova squadra")
# Display description on team card if we can locate team name paragraph region
if "team.description" not in text:
    pattern = re.compile(r"(\{team\.name\}\s*</[^>]+>)", re.M)
    m = pattern.search(text)
    if m:
        insertion = m.group(1) + '\n          {team.description && (\n            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">{team.description}</p>\n          )}'
        text = text[:m.start()] + insertion + text[m.end():]
    else:
        notes.append(f"TODO manuale in {path}: mostrare team.description nelle card squadra")
write(path, text)

# 5) Team detail page: state/API/display description + bigger logo
path = "src/app/leagues/[leagueId]/teams/[teamId]/page.tsx"
text = read(path)
if "description?: string | null" not in text:
    text = text.replace("  badgeUrl?: string | null;", "  badgeUrl?: string | null;\n  description?: string | null;", 1)
if 'const [description, setDescription] = useState("");' not in text:
    text = text.replace('  const [badgeUrl, setBadgeUrl] = useState("");', '  const [badgeUrl, setBadgeUrl] = useState("");\n  const [description, setDescription] = useState("");', 1)
if "setDescription(data.description ?? \"\");" not in text:
    text = text.replace('    setBadgeUrl(data.badgeUrl ?? "");', '    setBadgeUrl(data.badgeUrl ?? "");\n    setDescription(data.description ?? "");', 1)
if "description: description.trim() || null" not in text:
    text = text.replace('          badgeUrl: finalBadgeUrl,', '          badgeUrl: finalBadgeUrl,\n          description: description.trim() || null,', 1)
# Insert textarea near name input in edit form
if 'aria-label="Descrizione squadra"' not in text:
    # Prefer after badge URL input block by inserting before first save button in edit area
    idx = text.find('              <Button', text.find('value={name}'))
    if idx != -1:
        textarea = '''              <textarea\n                aria-label="Descrizione squadra"\n                value={description}\n                onChange={(e) => setDescription(e.target.value)}\n                placeholder="Racconta identità, stile o motto della squadra"\n                rows={4}\n                className="min-h-28 w-full resize-none rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:bg-white/[0.07]"\n              />\n\n'''
        text = text[:idx] + textarea + text[idx:]
    else:
        notes.append(f"TODO manuale in {path}: inserire textarea descrizione nella modifica squadra")
# Display description near team title
if "team.description &&" not in text:
    target = "{team.name}\n"
    pos = text.find(target)
    if pos != -1:
        pos2 = pos + len(target)
        display = '''                {team.description && (\n                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">\n                    {team.description}\n                  </p>\n                )}\n'''
        text = text[:pos2] + display + text[pos2:]
    else:
        notes.append(f"TODO manuale in {path}: mostrare team.description sotto il nome squadra")
# Enlarge common logo sizes/classes conservatively
text = text.replace('h-24 w-24', 'h-32 w-32 md:h-44 md:w-44')
text = text.replace('size = 96', 'size = 176')
text = text.replace('size = 88', 'size = 160')
write(path, text)

# 6) Player profile page: larger avatar/photo previews, no functional changes
path = "src/app/leagues/[leagueId]/players/[playerId]/page.tsx"
text = read(path)
# Edit-preview image placeholder and actual image
text = text.replace('h-24 w-24 rounded-2xl', 'h-36 w-36 rounded-[2rem] md:h-48 md:w-48')
# PlayerAvatar display sizes
text = text.replace('h-24 w-24 shrink-0', 'h-36 w-36 shrink-0 md:h-52 md:w-52')
# Make number badge a bit bigger when present
text = text.replace('h-8 min-w-8', 'h-10 min-w-10')
text = text.replace('text-sm font-black text-white', 'text-base font-black text-white')
write(path, text)

print("\nModifiche applicate:")
for p in changed:
    print(" -", p)
if notes:
    print("\nNote/TODO:")
    for n in notes:
        print(" -", n)
