import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gradient-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <Sidebar />
        <div className="flex-1 px-6 py-10 lg:px-12">
          <MobileNav />
          {children}
        </div>
      </div>
    </div>
  );
}
