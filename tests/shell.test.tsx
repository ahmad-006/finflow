import { describe, it, expect } from "bun:test";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { TopNav, MobileMenu, Band, UserMenu } from "../src/components/shell";
import {
  QuickCommandModal,
  COCKPIT_SHORTCUTS,
  filterCockpitShortcuts,
} from "../src/components/shell/QuickCommandModal";
import { quickSearchAction } from "../src/modules/search/actions";

describe("Shell & Responsive Navigation Architecture", () => {
  const mockUser = {
    id: "usr_1",
    fullName: "Kamran Siddiqui",
    email: "kamran@finflow.io",
    role: "ADMIN",
  };

  const mockCompany = {
    id: "comp_1",
    name: "FinFlow Treasury Corp",
    baseCurrency: "PKR",
  };

  describe("Band Component (Layout & Clamping)", () => {
    it("renders Band with max-w-[1440px] and responsive gutter clamp(16px, 4vw, 48px)", () => {
      const html = renderToString(
        <Band tone="white" className="test-band">
          <div>Band Content</div>
        </Band>
      );

      expect(html).toContain("max-w-[1440px]");
      expect(html).toContain("overflow-x-clip");
      expect(html).toContain("clamp(16px, 4vw, 48px)");
      expect(html).toContain("box-border");
      expect(html).toContain("Band Content");
    });

    it("renders Band with fog background when specified", () => {
      const html = renderToString(
        <Band tone="fog">
          <span>Fog Band</span>
        </Band>
      );

      expect(html).toContain("bg-fog");
      expect(html).toContain("Fog Band");
    });

    it("supports custom semantic HTML element via 'as' prop", () => {
      const html = renderToString(
        <Band as="header" tone="white">
          <span>Header Band</span>
        </Band>
      );

      expect(html).toStartWith("<header");
      expect(html).toContain("Header Band");
    });
  });

  describe("TopNav Component", () => {
    it("renders brand logo, desktop navigation pills, and user menu on desktop", () => {
      const html = renderToString(
        <TopNav user={mockUser} company={mockCompany} />
      );

      // Logo
      expect(html).toContain("finflow-logo-on-white.png");
      expect(html).toContain('aria-label="FinFlow home"');

      // Desktop navigation pills (<nav> is hidden on < 1024px via hidden lg:flex)
      expect(html).toContain("hidden lg:flex");
      expect(html).toContain("Overview");
      expect(html).toContain("Invoices");
      expect(html).toContain("Clients");
      expect(html).toContain("Expenses");
      expect(html).toContain("Cash flow");
      expect(html).toContain("Calendar");

      // New invoice button (understated outlined pill, not competing dark CTA)
      expect(html).toContain("New invoice");
      expect(html).toContain('href="/invoices/new"');
      expect(html).toContain("border border-line bg-white hover:bg-fog text-ink");
      expect(html).not.toContain("bg-ink text-white");

      // Quick command search trigger button
      expect(html).toContain('aria-label="Search workspace"');
      expect(html).toContain("Search");
      expect(html).toContain("⌘K");

      // User menu avatar
      expect(html).toContain("KS"); // Kamran Siddiqui initials
    });

    it("renders clean accessible hamburger button visible on viewports < 1024px", () => {
      const html = renderToString(
        <TopNav user={mockUser} company={mockCompany} />
      );

      // Hamburger button: lg:hidden, min 44px touch target, aria attributes
      expect(html).toContain("lg:hidden");
      expect(html).toContain('aria-label="Open navigation menu"');
      expect(html).toContain('aria-controls="mobile-navigation-sheet"');
      expect(html).toContain("min-h-[44px]");
      expect(html).toContain("min-w-[44px]");
    });

    it("renders marketing links when isMarketing is true and user is unauthenticated", () => {
      const html = renderToString(
        <TopNav user={null} company={null} isMarketing={true} />
      );

      expect(html).toContain("Sign in");
      expect(html).toContain("Create workspace");
      expect(html).not.toContain('aria-label="Search workspace"');
    });

    it("hides New invoice CTA for VIEWER role", () => {
      const html = renderToString(
        <TopNav user={{ ...mockUser, role: "VIEWER" }} company={mockCompany} />
      );
      expect(html).not.toContain("New invoice");
    });
  });

  describe("MobileMenu Component", () => {
    it("renders all 6 authenticated links with active indicators and 44px min touch target", () => {
      const html = renderToString(
        <MobileMenu
          isOpen={true}
          onClose={() => {}}
          user={mockUser}
          company={mockCompany}
        />
      );

      // All 6 authenticated links present
      expect(html).toContain("Overview");
      expect(html).toContain("Invoices");
      expect(html).toContain("Clients");
      expect(html).toContain("Expenses");
      expect(html).toContain("Cash flow");
      expect(html).toContain("Calendar");

      // Touch target verification: min-h-[44px]
      expect(html).toContain("min-h-[44px]");

      // User profile info
      expect(html).toContain("Kamran Siddiqui");
      expect(html).toContain("kamran@finflow.io");
      expect(html).toContain("KS");

      // Company info
      expect(html).toContain("FinFlow Treasury Corp");
      expect(html).toContain("PKR");

      // Action buttons (New invoice uses understated outlined pill)
      expect(html).toContain("New invoice");
      expect(html).toContain('href="/invoices/new"');
      expect(html).toContain("border border-line bg-white hover:bg-fog text-ink");
      expect(html).not.toContain("bg-ink text-white");
      expect(html).toContain("Log out");

      // Accessible modal attributes
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-label="Mobile navigation"');
      expect(html).toContain('id="mobile-navigation-sheet"');
    });

    it("returns null when isOpen is false", () => {
      const html = renderToString(
        <MobileMenu
          isOpen={false}
          onClose={() => {}}
          user={mockUser}
          company={mockCompany}
        />
      );

      expect(html).toBe("");
    });

    it("hides New invoice CTA in mobile menu for VIEWER role", () => {
      const html = renderToString(
        <MobileMenu
          isOpen={true}
          onClose={() => {}}
          user={{ ...mockUser, role: "VIEWER" }}
          company={mockCompany}
        />
      );
      expect(html).not.toContain("New invoice");
    });
  });

  describe("UserMenu Component (Claude Inkline v3 standards)", () => {
    it("renders user initials avatar button with clean inkline styling and zero drop shadows", () => {
      const html = renderToString(
        <UserMenu user={mockUser} company={mockCompany} />
      );

      expect(html).toContain("KS");
      expect(html).toContain("Kamran Siddiqui");
      expect(html).not.toContain("shadow-lg");
      expect(html).not.toContain("shadow-xl");
      expect(html).not.toContain("shadow-2xl");
    });
  });

  describe("QuickCommandModal & quickSearchAction", () => {
    it("defines all static cockpit route shortcuts", () => {
      const hrefs = COCKPIT_SHORTCUTS.map((s) => s.href);
      expect(hrefs).toEqual([
        "/dashboard",
        "/invoices",
        "/invoices/new",
        "/clients",
        "/expenses",
        "/cash-flow",
        "/calendar",
        "/settings",
      ]);
    });

    it("filters shortcuts by query and excludes /invoices/new for VIEWER role", () => {
      const cashFlowMatches = filterCockpitShortcuts("cash-flow", "ADMIN");
      expect(cashFlowMatches.map((m) => m.href)).toEqual(["/cash-flow"]);

      const calendarMatches = filterCockpitShortcuts("calendar", "ADMIN");
      expect(calendarMatches.map((m) => m.href)).toEqual(["/calendar"]);

      const viewerShortcuts = filterCockpitShortcuts("", "VIEWER");
      expect(viewerShortcuts.some((s) => s.href === "/invoices/new")).toBe(false);
    });

    it("renders QuickCommandModal cleanly in SSR without AppRouterContext", () => {
      const html = renderToString(
        <QuickCommandModal isOpen={false} onClose={() => {}} userRole="ADMIN" />
      );
      expect(html).toBe("");
    });

    it("returns empty tenant-safe results when quickSearchAction is called without a session", async () => {
      const result = await quickSearchAction("Alpha");
      expect(result.clients).toEqual([]);
      expect(result.invoices).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });
});
