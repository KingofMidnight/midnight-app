import { Link } from "react-router-dom";
import { Mail, Phone, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import { siteContent } from "@/lib/content";

const Footer = () => {
  const t = siteContent.footer;

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt={siteContent.logoAlt} className="h-8 w-8" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t.quickLinksTitle}</h4>
            <ul className="space-y-2">
              {t.quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t.contentTitle}</h4>
            <ul className="space-y-2">
              {t.contentLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t.contactTitle}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span>{t.email}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span>{t.phone}</span>
              </li>
              <li>
                <a href={t.discordUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span>{t.discord}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t.copyright}</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.terms}</Link>
            <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.privacyLink}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

