import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--border)] mt-8 md:mt-12">
      {/* Disclaimer */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <p className="text-xs text-[var(--text-tertiary)] text-center mb-6">
          The styles and colors on this page are for reference only. Please
          refer to the actual vehicle.
        </p>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--text-secondary)] mb-6">
          <Link
            href="/about"
            className="hover:text-[var(--primary)] transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="hover:text-[var(--primary)] transition-colors"
          >
            Contact Us
          </Link>
          <Link
            href="/careers"
            className="hover:text-[var(--primary)] transition-colors"
          >
            Join Us
          </Link>
          <Link
            href="/feedback"
            className="hover:text-[var(--primary)] transition-colors"
          >
            Feedback
          </Link>
          <Link
            href="/license"
            className="hover:text-[var(--primary)] transition-colors"
          >
            Business License
          </Link>
          <Link
            href="/app"
            className="hover:text-[var(--primary)] transition-colors"
          >
            App Client
          </Link>
          <Link
            href="/mobile"
            className="hover:text-[var(--primary)] transition-colors"
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
