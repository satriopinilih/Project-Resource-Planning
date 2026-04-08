import Sidebar from "./components/Sidebar";

export default function GMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-[290px] flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  );
}
