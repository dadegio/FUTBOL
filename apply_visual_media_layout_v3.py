from pathlib import Path
import re

ROOT = Path('.')

def read(path: str) -> str:
    return (ROOT / path).read_text()

def write(path: str, text: str):
    (ROOT / path).write_text(text)
    print(f"UPDATED {path}")

def replace(path: str, old: str, new: str):
    p = ROOT / path
    if not p.exists():
        print(f"SKIP missing {path}")
        return
    text = p.read_text()
    if old not in text:
        print(f"TODO not found in {path}: {old[:90].replace(chr(10),' ')}")
        return
    p.write_text(text.replace(old, new))
    print(f"UPDATED {path}")

def ensure_once(path: str, marker: str, insert_after: str, content: str):
    p = ROOT / path
    if not p.exists():
        print(f"SKIP missing {path}")
        return
    text = p.read_text()
    if marker in text:
        print(f"OK already in {path}: {marker}")
        return
    if insert_after not in text:
        print(f"TODO insertion point not found in {path}: {insert_after}")
        return
    text = text.replace(insert_after, insert_after + content, 1)
    p.write_text(text)
    print(f"UPDATED {path}")

# 1) Desktop: remove/avoid opaque IDs in breadcrumbs.
path = "src/app/_components/breadcrumbs.tsx"
p = ROOT / path
if p.exists():
    text = p.read_text()
    if "function isOpaqueIdSegment" not in text:
        text = text.replace(
            'const NO_INDEX_SECTIONS = new Set(["matches"]);',
            '''const NO_INDEX_SECTIONS = new Set(["matches"]);\n\nfunction isOpaqueIdSegment(segment: string) {\n  return /^[a-z0-9]{16,}$/i.test(segment) && !SECTION_LABELS[segment];\n}'''
        )
    old = '''    const label = SECTION_LABELS[seg] ?? seg;\n    const isLast = i === segments.length - 1;\n    const noIndex = NO_INDEX_SECTIONS.has(seg);\n    crumbs.push({ label, href: isLast || noIndex ? undefined : accumulated });'''
    new = '''    if (isOpaqueIdSegment(seg)) continue;\n\n    const label = SECTION_LABELS[seg] ?? seg;\n    const isLast = i === segments.length - 1;\n    const noIndex = NO_INDEX_SECTIONS.has(seg);\n    crumbs.push({ label, href: isLast || noIndex ? undefined : accumulated });'''
    if old in text:
        text = text.replace(old, new, 1)
    p.write_text(text)
    print(f"UPDATED {path}")

# 2) Make shell really full-width if rollback left a centered wrapper.
replace(
    "src/app/_components/dashboard-shell.tsx",
    '      <div className="mx-auto max-w-[1600px]">',
    '      <div className="w-full">'
)

# 3) Player passport: bigger media + sport profile full width for non-admin.
path = "src/app/leagues/[leagueId]/players/[playerId]/page.tsx"
p = ROOT / path
if p.exists():
    text = p.read_text()
    text = text.replace(
        'lg:grid-cols-[260px_minmax(0,1fr)]',
        'lg:grid-cols-[420px_minmax(0,1fr)]'
    )
    text = text.replace(
        'className="flex flex-col items-center rounded-[32px] border border-white/10 bg-black/20 p-5 text-center"',
        'className="flex min-h-[360px] flex-col items-center justify-center rounded-[36px] border border-white/10 bg-black/20 p-6 text-center"'
    )
    text = text.replace(
        'relative h-32 w-32 shrink-0 overflow-hidden rounded-[36px]',
        'relative h-48 w-48 shrink-0 overflow-hidden rounded-[48px] md:h-56 md:w-56'
    )
    text = text.replace(
        'relative flex h-32 w-32 shrink-0 items-center justify-center rounded-[36px]',
        'relative flex h-48 w-48 shrink-0 items-center justify-center rounded-[48px] md:h-56 md:w-56'
    )
    text = text.replace(
        'text-3xl font-black text-[var(--accent)] shadow-sm',
        'text-5xl font-black text-[var(--accent)] shadow-sm'
    )
    text = text.replace(
        'absolute bottom-0 right-0 flex h-10 min-w-10 items-center justify-center rounded-tl-2xl',
        'absolute bottom-0 right-0 flex h-14 min-w-14 items-center justify-center rounded-tl-3xl'
    )
    text = text.replace(
        'px-2 text-sm font-black text-black',
        'px-3 text-lg font-black text-black'
    )
    old_grid = 'className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] 2xl:grid-cols-[minmax(0,1.45fr)_420px]"'
    new_grid = 'className={isAdmin ? "grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] 2xl:grid-cols-[minmax(0,1.45fr)_420px]" : "grid gap-5"}'
    text = text.replace(old_grid, new_grid)
    text = text.replace(
        '<Card>\n            <div className="flex items-center justify-between gap-3">\n              <div>\n                <h2 className="text-xl font-black text-[var(--foreground)]">Profilo sportivo</h2>',
        '<Card className={!isAdmin ? "xl:col-span-2" : undefined}>\n            <div className="flex items-center justify-between gap-3">\n              <div>\n                <h2 className="text-xl font-black text-[var(--foreground)]">Profilo sportivo</h2>'
    )
    text = text.replace(
        '<div className="mt-5 grid gap-3 sm:grid-cols-2">',
        '<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">',
        1
    )
    p.write_text(text)
    print(f"UPDATED {path}")

# 4) Team profile: bigger logo and a wider desktop identity layout.
path = "src/app/leagues/[leagueId]/teams/[teamId]/page.tsx"
p = ROOT / path
if p.exists():
    text = p.read_text()
    # Type + state for description if missing.
    text = text.replace('  badgeUrl?: string | null;\n  league:', '  badgeUrl?: string | null;\n  description?: string | null;\n  league:')
    if 'const [description, setDescription] = useState("");' not in text:
        text = text.replace('  const [badgeUrl, setBadgeUrl] = useState("");', '  const [badgeUrl, setBadgeUrl] = useState("");\n  const [description, setDescription] = useState("");')
    if 'setDescription(data.description ?? "");' not in text:
        text = text.replace('    setBadgeUrl(data.badgeUrl ?? "");', '    setBadgeUrl(data.badgeUrl ?? "");\n    setDescription(data.description ?? "");')
    text = text.replace(
        '          name: trimmedName,\n          badgeUrl: finalBadgeUrl,',
        '          name: trimmedName,\n          badgeUrl: finalBadgeUrl,\n          description: description.trim() || null,'
    )
    # Header restyle.
    text = text.replace(
        '<div className="flex items-center gap-4">\n            <TeamLogo name={team.name} badgeUrl={team.badgeUrl ?? null} />',
        '<div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_180px] xl:items-center">\n            <TeamLogo name={team.name} badgeUrl={team.badgeUrl ?? null} />'
    )
    text = text.replace(
        '<h1 className="truncate text-[27px] font-black tracking-[-0.06em] text-[var(--foreground)]">',
        '<h1 className="truncate text-4xl font-black tracking-[-0.07em] text-[var(--foreground)] lg:text-5xl">'
    )
    # Keep description only in team detail identity area, not in teams list.
    if '{team.description && (' not in text:
        text = text.replace(
            '              <h1 className="truncate text-4xl font-black tracking-[-0.07em] text-[var(--foreground)] lg:text-5xl">\n                {team.name}\n              </h1>\n            </div>',
            '              <h1 className="truncate text-4xl font-black tracking-[-0.07em] text-[var(--foreground)] lg:text-5xl">\n                {team.name}\n              </h1>\n              {team.description && (\n                <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--muted)]">\n                  {team.description}\n                </p>\n              )}\n            </div>'
        )
    text = text.replace(
        '<div className="text-right">\n              <div className="text-2xl font-black tracking-[-0.06em] text-[var(--foreground)]">',
        '<div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 text-right shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]">\n              <div className="text-4xl font-black tracking-[-0.06em] text-[var(--foreground)]">'
    )
    # Description input in edit card.
    if 'placeholder="Descrizione squadra"' not in text:
        text = text.replace(
            '<Input\n              value={name}\n              onChange={(event) => setName(event.target.value)}\n              placeholder="Nome squadra"\n              className="w-full"\n            />',
            '<Input\n              value={name}\n              onChange={(event) => setName(event.target.value)}\n              placeholder="Nome squadra"\n              className="w-full"\n            />\n\n            <textarea\n              value={description}\n              onChange={(event) => setDescription(event.target.value)}\n              placeholder="Descrizione squadra"\n              rows={4}\n              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"\n            />'
        )
    # Bigger logo function.
    text = text.replace(
        'className="h-14 w-14 shrink-0 rounded-[15px] object-contain"',
        'className="h-36 w-36 shrink-0 rounded-[34px] object-contain xl:h-44 xl:w-44"'
    )
    text = text.replace(
        'className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[15px] bg-green-200 text-lg font-black text-green-900"',
        'className="flex h-36 w-36 shrink-0 items-center justify-center rounded-[34px] bg-green-200 text-4xl font-black text-green-900 xl:h-44 xl:w-44"'
    )
    p.write_text(text)
    print(f"UPDATED {path}")

# 5) Teams creation page: description input + POST payload, but do not show descriptions in team cards/list.
path = "src/app/leagues/[leagueId]/teams/page.tsx"
p = ROOT / path
if p.exists():
    text = p.read_text()
    text = text.replace('  badgeUrl?: string | null;\n  players?:', '  badgeUrl?: string | null;\n  description?: string | null;\n  players?:')
    if 'const [description, setDescription] = useState("");' not in text:
        text = text.replace('  const [badgeUrl, setBadgeUrl] = useState("");', '  const [badgeUrl, setBadgeUrl] = useState("");\n  const [description, setDescription] = useState("");')
    text = text.replace(
        '        name: teamName,\n        badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,',
        '        name: teamName,\n        badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,\n        description: description.trim() || null,'
    )
    if 'setDescription("");' not in text:
        text = text.replace('      setBadgeUrl("");', '      setBadgeUrl("");\n      setDescription("");')
    if 'placeholder="Descrizione squadra"' not in text:
        text = text.replace(
            '<Input\n                value={badgeUrl}\n                onChange={(e) => setBadgeUrl(e.target.value)}\n                placeholder="Logo squadra URL"\n              />',
            '<Input\n                value={badgeUrl}\n                onChange={(e) => setBadgeUrl(e.target.value)}\n                placeholder="Logo squadra URL"\n              />\n\n              <textarea\n                value={description}\n                onChange={(e) => setDescription(e.target.value)}\n                placeholder="Descrizione squadra"\n                rows={4}\n                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"\n              />'
        )
    p.write_text(text)
    print(f"UPDATED {path}")

# 6) Prisma + API for team description, safe/idempotent.
path = "prisma/schema.prisma"
p = ROOT / path
if p.exists():
    text = p.read_text()
    if 'description String?' not in text:
        text = text.replace('  badgeUrl    String?\n  createdAt', '  badgeUrl    String?\n  description String?\n  createdAt')
        p.write_text(text)
        print(f"UPDATED {path}")

mig = ROOT / "prisma/migrations/20260628093000_add_team_description/migration.sql"
if not mig.exists():
    mig.parent.mkdir(parents=True, exist_ok=True)
    mig.write_text('ALTER TABLE "Team" ADD COLUMN "description" TEXT;\n')
    print(f"CREATED {mig}")

path = "src/app/api/leagues/[leagueId]/teams/route.ts"
p = ROOT / path
if p.exists():
    text = p.read_text()
    if 'const description =' not in text:
        text = text.replace('  const badgeUrl = body?.badgeUrl ? String(body.badgeUrl).trim() : null;', '  const badgeUrl = body?.badgeUrl ? String(body.badgeUrl).trim() : null;\n  const description = body?.description ? String(body.description).trim() : null;')
    text = text.replace('        badgeUrl: badgeUrl || undefined,\n        league:', '        badgeUrl: badgeUrl || undefined,\n        description: description || undefined,\n        league:')
    p.write_text(text)
    print(f"UPDATED {path}")

path = "src/app/api/teams/[teamId]/route.ts"
p = ROOT / path
if p.exists():
    text = p.read_text()
    if 'const description =' not in text:
        text = text.replace('  const badgeUrl =\n    body?.badgeUrl === undefined ? undefined : body.badgeUrl === null ? null : String(body.badgeUrl).trim() || null;', '  const badgeUrl =\n    body?.badgeUrl === undefined ? undefined : body.badgeUrl === null ? null : String(body.badgeUrl).trim() || null;\n  const description =\n    body?.description === undefined ? undefined : body.description === null ? null : String(body.description).trim() || null;')
    text = text.replace('      ...(badgeUrl !== undefined ? { badgeUrl } : {}),\n    },', '      ...(badgeUrl !== undefined ? { badgeUrl } : {}),\n      ...(description !== undefined ? { description } : {}),\n    },')
    p.write_text(text)
    print(f"UPDATED {path}")

print("Done. Run grep for conflict markers, prisma generate/migrate, then npm run build.")
