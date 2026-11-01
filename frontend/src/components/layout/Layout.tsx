import Navbar from "./Navbar";
import Footer from "./Footer";
import ModerationNotices from "@/components/ModerationNotices";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <ModerationNotices />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;

