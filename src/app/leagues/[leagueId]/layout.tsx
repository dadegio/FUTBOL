export const runtime = "nodejs";

export default async function LeagueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 1500, margin: "0 auto", padding: 16 }}>
      {children}
    </div>
  );
}