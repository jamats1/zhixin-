import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--border)] mt-8 md:mt-12">
      {/* Disclaimer */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-[var(--text-tertiary)] text-center mb-6">
          The styles and colors on this page are for reference only. Please
          refer to the actual vehicle.
        </p>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--text-secondary)] mb-6">
          <Link
            href="/about"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            Contact Us
          </Link>
          <Link
            href="/faq"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            FAQ
          </Link>
          <Link
            href="/careers"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            Join Us
          </Link>
          <Link
            href="/feedback"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            Feedback
          </Link>
          <Link
            href="/license"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            Business License
          </Link>
          <Link
            href="/app"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            App Client
          </Link>
          <Link
            href="/mobile"
            className="hover:text-[var(--primary)] transition-colors py-2"
          >
            Mobile Web
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-[var(--text-tertiary)]">
          © 2004-2026 Zhixin车. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
